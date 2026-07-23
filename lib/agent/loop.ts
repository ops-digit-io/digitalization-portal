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

import type { Session } from "../rbac.js";
import type { ToolRegistry } from "./tools.js";
import type { ModelMessage, ModelProvider, ToolSpec } from "./provider.js";
import { TraceRecorder, type Trace } from "./trace.js";

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
  maxIterations?: number;
  /** Injected so the loop stays deterministic/replayable. */
  now: string;
  traceId: string;
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

  const available = registry.resolveFor(session, { enabled });
  const chosen = params.toolNames
    ? available.filter((t) => params.toolNames!.includes(t.name))
    : available;

  // Record what was withheld and why — traces list withheld tools explicitly.
  const withheld: { name: string; reason: string }[] = [];
  const wanted = params.toolNames ?? registry.all().map((t) => t.name);
  for (const name of wanted) {
    if (chosen.some((t) => t.name === name)) continue;
    const tool = registry.get(name);
    const reason = !enabled
      ? "agent tools disabled (kill switch)"
      : !tool
        ? "no such tool"
        : "session lacks the required capability";
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

    if (res.toolCalls.length === 0) {
      finalText = res.text;
      break;
    }

    // Append the assistant turn (text + tool_use blocks) exactly as the API needs.
    messages.push({
      role: "assistant",
      content: [
        ...(res.text ? [{ type: "text" as const, text: res.text }] : []),
        ...res.toolCalls.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.name, input: c.input })),
      ],
    });

    const results = [];
    for (const call of res.toolCalls) {
      const tool = chosen.find((t) => t.name === call.name);
      rec.add("tool_call", `call ${call.name}`, JSON.stringify(call.input));
      let content: string;
      if (!tool) {
        content = `Error: tool "${call.name}" is not available to this session.`;
        rec.add("error", `tool ${call.name} unavailable`);
      } else {
        try {
          const out = await tool.run(call.input, { session });
          content = typeof out === "string" ? out : JSON.stringify(out);
          rec.add("tool_result", `result ${call.name}`, content.slice(0, 2000));
        } catch (err) {
          content = `Error running ${call.name}: ${err instanceof Error ? err.message : String(err)}`;
          rec.add("error", `tool ${call.name} threw`, content);
        }
      }
      results.push({ type: "tool_result" as const, tool_use_id: call.id, content });
    }
    messages.push({ role: "user", content: results });

    if (i === maxIterations - 1) {
      rec.add("note", "max iterations reached");
    }
  }

  const trace = rec.finish(now);
  return { text: finalText, trace, messages };
}
