/**
 * The agent loop (`docs/08-ai-architecture.md`, `docs/BUILD.md` constraints #2/#3).
 *
 * Runs a bounded tool-use conversation for one session:
 *   - tools are resolved from the registry for THIS session (capability +
 *     kill switch); withheld tools are recorded, never silently dropped;
 *   - the model may call tools; each runs server-side under the session's
 *     authority; no tool passes a gate or merges (enforced at registration);
 *   - every step is traced (FR-6.5).
 *
 * The caller is responsible for wrapping any external content (`wrapExternal`)
 * before putting it in `userMessage` — the loop never asks the model to wrap its
 * own input.
 */

import { can, type Session } from "../rbac.js";
import { toolActs, authorityAllowsActing, type ToolRegistry } from "./tools.js";
import type { AuthorityLevel } from "../org/autonomy.js";
import type { ModelMessage, ModelProvider, ToolResultBlock, ToolSpec } from "./provider.js";
import { TraceRecorder, type Trace } from "./trace.js";
import { recordUsage } from "../usage-meter.js";

/**
 * A ceiling on one tool result. A tool that returns a whole repository fills
 * the context and pushes out the conversation it was meant to inform. Cutting
 * it is bad; cutting it silently is worse, so the cut says so — the model can
 * then narrow the call rather than reason confidently about half a table.
 */
const MAX_TOOL_RESULT_CHARS = 24_000;

const cap = (s: string): string =>
  s.length <= MAX_TOOL_RESULT_CHARS
    ? s
    : `${s.slice(0, MAX_TOOL_RESULT_CHARS)}\n\n[truncated: ${s.length - MAX_TOOL_RESULT_CHARS} more characters. Narrow the query and call again if you need the rest.]`;

/** What the loop says when it stops because it ran out of steps, not answers. */
export const EXHAUSTED =
  "I stopped before finishing: this run hit its limit on tool steps. The work so far is in the trace. Narrow the question and ask again.";

export interface RunAgentParams {
  session: Session;
  provider: ModelProvider;
  registry: ToolRegistry;
  system: string;
  userMessage: string;
  /** Restrict to these tool names (default: all the session may use). */
  toolNames?: string[];
  /** Kill switch (FR-6.6). When false, no tools are offered. */
  enabled?: boolean;
  /**
   * Department OS lane autonomy scope. When set to a non-acting rung, the run is
   * offered only READ tools — a pure narrowing on top of the session's RBAC
   * (never a widening). Absent → portfolio behaviour (RBAC alone).
   */
  authority?: AuthorityLevel | null;
  maxIterations?: number;
  /** Injected so the loop stays deterministic/replayable. */
  now: string;
  traceId: string;
  /** Usage-meter label for the cost overview (e.g. "agent.chat"). */
  feature?: string;
}

export interface RunAgentResult {
  text: string;
  trace: Trace;
  messages: ModelMessage[];
}

function toSpec(name: string, description: string, schema?: Record<string, unknown>): ToolSpec {
  return {
    name,
    description,
    input_schema: schema ?? { type: "object", properties: {}, additionalProperties: true },
  };
}

export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { session, provider, registry, system, userMessage, now, traceId } = params;
  const enabled = params.enabled ?? true;
  const maxIterations = params.maxIterations ?? 6;

  const authority = params.authority ?? null;
  const available = registry.resolveFor(session, { enabled, authority });
  const chosen = params.toolNames
    ? available.filter((t) => params.toolNames!.includes(t.name))
    : available;

  // Record what was withheld and why — traces list withheld tools explicitly, so a
  // tool withheld because the lane's autonomy rung does not act reads differently
  // from one withheld for a missing capability or the kill switch.
  const withheld: { name: string; reason: string }[] = [];
  const wanted = params.toolNames ?? registry.all().map((t) => t.name);
  for (const name of wanted) {
    if (chosen.some((t) => t.name === name)) continue;
    const tool = registry.get(name);
    let reason: string;
    if (!enabled) reason = "agent tools disabled (kill switch)";
    else if (!tool) reason = "no such tool";
    else if (!can(session, tool.capability)) reason = "session lacks the required capability";
    else if (toolActs(tool) && !authorityAllowsActing(authority)) reason = `lane autonomy "${authority}" withholds acting tools`;
    else reason = "session lacks the required capability";
    withheld.push({ name, reason });
  }

  const rec = new TraceRecorder({
    id: traceId,
    session: session.user,
    provider: provider.name,
    live: provider.live,
    startedAt: now,
    toolsOffered: chosen.map((t) => t.name),
    toolsWithheld: withheld,
  });

  const specs = chosen.map((t) => toSpec(t.name, t.description, t.inputSchema));
  const messages: ModelMessage[] = [{ role: "user", content: userMessage }];

  let finalText = "";
  for (let i = 0; i < maxIterations; i++) {
    const res = await provider.complete({ system, messages, tools: specs });
    rec.add("model", provider.live ? "model turn" : "offline turn", res.text || undefined, res.usage);
    // Meter every turn — a tool-using agent spends across several turns, and the
    // cost overview should see all of them, not just the last.
    await recordUsage({ feature: params.feature ?? "agent.chat", provider: provider.name, model: provider.model, usage: res.usage });

    if (res.toolCalls.length === 0) {
      finalText = res.text;
      break;
    }

    // Append the assistant turn EXACTLY as the provider returned it. Rebuilding
    // it from `text` + `toolCalls` looks equivalent and is not: on models where
    // thinking is on (the default on Claude Opus 5) the turn also carries signed
    // thinking blocks, and the API rejects the next request if they are absent.
    // Whatever we did not understand is carried through untouched.
    messages.push({ role: "assistant", content: res.content });

    const results: ToolResultBlock[] = [];
    for (const call of res.toolCalls) {
      const tool = chosen.find((t) => t.name === call.name);
      rec.add("tool_call", `call ${call.name}`, JSON.stringify(call.input));
      let content: string;
      let failed = false;
      if (!tool) {
        content = `Error: tool "${call.name}" is not available to this session.`;
        failed = true;
        rec.add("error", `tool ${call.name} unavailable`);
      } else {
        try {
          const out = await tool.run(call.input, { session });
          content = cap(typeof out === "string" ? out : JSON.stringify(out));
          rec.add("tool_result", `result ${call.name}`, content.slice(0, 2000));
        } catch (err) {
          content = `Error running ${call.name}: ${err instanceof Error ? err.message : String(err)}`;
          failed = true;
          rec.add("error", `tool ${call.name} threw`, content);
        }
      }
      // `is_error` is the difference between the model learning the call went
      // wrong and the model reading the error text as a finding.
      results.push({ type: "tool_result", tool_use_id: call.id, content, ...(failed ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });

    if (i === maxIterations - 1) {
      rec.add("note", "max iterations reached");
      // The loop has stopped mid-conversation: the model was still calling
      // tools. Returning "" here would present "I ran out of steps" as "I have
      // nothing to say", which is the one answer that is never true.
      finalText = EXHAUSTED;
    }
  }

  const trace = rec.finish(now);
  return { text: finalText, trace, messages };
}
