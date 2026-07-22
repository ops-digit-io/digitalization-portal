/**
 * Model provider abstraction (`docs/08-ai-architecture.md`, `docs/12 §12.2`).
 *
 * Two implementations behind one interface:
 *   - `AnthropicProvider` — the real Messages API, EU-routable, server-side only,
 *     credentials never reaching the browser (constraint #7). Used automatically
 *     when `ANTHROPIC_API_KEY` is set.
 *   - `OfflineProvider` — a deterministic, rule-based stand-in so the whole agent
 *     loop, the routes, and the UI run and demo with NO key. It drives the same
 *     code paths (including tool calls), just without a live model.
 *
 * `getProvider()` picks live-or-offline from the environment. The moment a key is
 * added, the app is live — no code change.
 */

export type Role = "user" | "assistant";

export interface TextBlock {
  type: "text";
  text: string;
}
export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}
export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ModelMessage {
  role: Role;
  content: string | ContentBlock[];
}

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface CompletionRequest {
  system: string;
  messages: ModelMessage[];
  tools?: ToolSpec[];
  maxTokens?: number;
}

export interface ModelResponse {
  text: string;
  toolCalls: { id: string; name: string; input: unknown }[];
  stopReason: string;
  usage: { input: number; output: number };
}

export interface ModelProvider {
  readonly name: string;
  readonly live: boolean;
  complete(req: CompletionRequest): Promise<ModelResponse>;
}

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

/** The real Anthropic Messages API, called with `fetch` (no SDK dependency). */
export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  readonly live = true;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(opts: { apiKey: string; baseUrl?: string; model?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  async complete(req: CompletionRequest): Promise<ModelResponse> {
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 2048,
        system: req.system,
        messages: req.messages,
        ...(req.tools && req.tools.length > 0 ? { tools: req.tools } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      content: ContentBlock[];
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((b): b is TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const toolCalls = data.content
      .filter((b): b is ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));

    return {
      text,
      toolCalls,
      stopReason: data.stop_reason,
      usage: { input: data.usage.input_tokens, output: data.usage.output_tokens },
    };
  }
}

/**
 * Deterministic offline provider. Rule-based, so the agent loop is exercised
 * end-to-end without a key:
 *   - If the last message carries a tool result, it summarises that result.
 *   - Else, if a tool is offered, it calls the first tool, extracting inputs from
 *     a fenced ```facts JSON block in the latest user message when present.
 *   - Else, it returns a short scripted analyst reply.
 * Every response is clearly attributable to the offline provider.
 */
export class OfflineProvider implements ModelProvider {
  readonly name = "offline";
  readonly live = false;

  async complete(req: CompletionRequest): Promise<ModelResponse> {
    const last = req.messages[req.messages.length - 1];
    const lastBlocks = last && Array.isArray(last.content) ? last.content : [];
    const hasToolResult = lastBlocks.some((b) => b.type === "tool_result");

    if (hasToolResult) {
      const result = lastBlocks.find((b): b is ToolResultBlock => b.type === "tool_result");
      return this.reply(this.summariseResult(result?.content ?? ""));
    }

    if (req.tools && req.tools.length > 0) {
      const tool = req.tools[0]!;
      const input = this.extractFacts(req.messages) ?? {};
      return {
        text: "",
        toolCalls: [{ id: `offline-${tool.name}`, name: tool.name, input }],
        stopReason: "tool_use",
        usage: { input: 0, output: 0 },
      };
    }

    return this.reply(
      "Offline analyst: no model key is configured, so I can only run the deterministic tools. Set ANTHROPIC_API_KEY to enable full reasoning.",
    );
  }

  /** Turn a known tool-result shape into a short human summary (offline mode). */
  private summariseResult(raw: string): string {
    const eur = (n: number): string =>
      new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
    const note = "\n\n(Offline analyst — deterministic tools only. Set ANTHROPIC_API_KEY for full narrative reasoning. The assistant drafts; it never decides.)";
    try {
      const r = JSON.parse(raw) as Record<string, unknown>;
      // Portfolio implementation analysis.
      if (r.totals && r.timeline && Array.isArray(r.ranked)) {
        const t = r.totals as { count: number; totalEffortWeeks: number; totalHorizonValue: number; landingCount: number };
        const top = (r.ranked as { id: string; title: string; valuePerEffort: number }[]).slice(0, 3);
        const cap = r.capacity as { feasible: boolean; overCommitmentWeeks: number } | undefined;
        return [
          `Over the ${String(r.horizon)}, ${t.count} active use cases carry ${t.totalEffortWeeks} person-weeks of work, and ${eur(t.totalHorizonValue)} of value lands within the horizon (${t.landingCount} go live in time).`,
          cap ? (cap.feasible ? "This fits the team's capacity." : `This is over capacity by ${cap.overCommitmentWeeks} person-weeks — sequence or drop the weakest items.`) : "",
          `Best value per effort: ${top.map((x) => `${x.id} (${eur(x.valuePerEffort)}/pw)`).join(", ")}.`,
        ].filter(Boolean).join(" ") + note;
      }
      // PoC scaffold (start-poc).
      if (typeof r.repo === "string" && typeof r.specPath === "string") {
        const files = Array.isArray(r.committedPaths) ? (r.committedPaths as string[]).length : 0;
        return [
          `Created repository "${r.repo}" (${r.host}) with ${files} files, including a drafted spec at ${r.specPath}.`,
          "Review and approve the spec to build the artifact — I don't build it until a human approves.",
        ].join(" ") + note;
      }
      // Business-case simulation.
      if (typeof r.p10 === "number" && typeof r.p90 === "number") {
        const drivers = (r.drivers as { name: string; tested: boolean }[] | undefined) ?? [];
        const untested = drivers.find((d) => !d.tested);
        return [
          `Simulated value band: ${eur(r.p10 as number)} (P10) → ${eur(r.p50 as number)} (P50) → ${eur(r.p90 as number)} (base).`,
          untested ? `The downside is driven by the untested assumption "${untested.name}".` : "",
          "Figures are indicative — never committed.",
        ].filter(Boolean).join(" ") + note;
      }
    } catch {
      /* fall through */
    }
    return `Analysis complete (offline).\n\n${raw}${note}`;
  }

  private extractFacts(messages: ModelMessage[]): unknown | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      const text = typeof m.content === "string"
        ? m.content
        : m.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
      const match = /```facts\s*([\s\S]*?)```/.exec(text);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1].trim());
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  private reply(text: string): ModelResponse {
    return { text, toolCalls: [], stopReason: "end_turn", usage: { input: 0, output: 0 } };
  }
}

/** Choose a provider from the environment. Live when a key is present. */
export function getProvider(env: Record<string, string | undefined> = process.env): ModelProvider {
  const key = env.ANTHROPIC_API_KEY;
  if (key && key.trim() !== "") {
    return new AnthropicProvider({
      apiKey: key,
      baseUrl: env.ANTHROPIC_BASE_URL,
      model: env.ANTHROPIC_MODEL,
    });
  }
  return new OfflineProvider();
}
