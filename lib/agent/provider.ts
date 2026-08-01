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

import { fetchRetry } from "../net/fetch-retry";

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
  /**
   * The tool failed. Without this the model reads "Error: no such demand" as a
   * finding and reports it as one; with it, it knows the call went wrong and
   * that trying differently is the right move.
   */
  is_error?: boolean;
}
/**
 * Everything else the API may put in an assistant turn — thinking and redacted
 * thinking blocks, server-tool use, web-search results. We do not interpret
 * these, we carry them: on Claude Opus 5 thinking is on by default, and an
 * assistant turn that is replayed into a tool conversation WITHOUT its thinking
 * block is rejected. Passing unknown blocks through verbatim is the only shape
 * of this code that survives the next block type Anthropic adds.
 */
export interface OpaqueBlock {
  type: string;
  [key: string]: unknown;
}
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | OpaqueBlock;

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
  /** Enable the provider's public web-search tool (Anthropic server tool). */
  webSearch?: boolean;
  /**
   * Force a tool instead of leaving the choice to the model. Structured
   * extraction — "read this and call `propose_demands`" — is not a conversation,
   * and letting the model answer in prose there costs a whole call for nothing.
   */
  toolChoice?: { type: "auto" } | { type: "any" } | { type: "tool"; name: string };
  /**
   * Thinking depth and overall token spend (Anthropic). Omitted means the
   * model's own default, which is what we want almost everywhere; set it only
   * where the call is demonstrably shallow or demonstrably hard.
   */
  effort?: "low" | "medium" | "high";
  /** Override the streaming decision. Default: stream when `maxTokens` is large. */
  stream?: boolean;
}

export interface ModelResponse {
  text: string;
  toolCalls: { id: string; name: string; input: unknown }[];
  stopReason: string;
  /**
   * The assistant turn exactly as the provider returned it. Replay THIS into a
   * tool conversation — rebuilding a turn from `text` + `toolCalls` silently
   * drops thinking blocks, and the next request is then rejected.
   */
  content: ContentBlock[];
  /** `stop_reason === "max_tokens"` — the answer is cut off, not finished. */
  truncated: boolean;
  usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
}

export interface ModelProvider {
  readonly name: string;
  readonly live: boolean;
  /** The resolved model id, for metering and display. Absent for offline. */
  readonly model?: string;
  complete(req: CompletionRequest): Promise<ModelResponse>;
}

/**
 * What went wrong, in terms a caller can act on. A generic `Error` forces every
 * call site to regex a message to tell "your key is wrong" (stop, tell someone)
 * from "the model is busy" (fall back to the deterministic floor and carry on).
 */
export type ModelErrorKind = "auth" | "rate_limit" | "invalid" | "overloaded" | "server" | "refusal" | "network";

export class ModelError extends Error {
  readonly kind: ModelErrorKind;
  readonly status?: number;
  constructor(kind: ModelErrorKind, status: number | undefined, message: string) {
    super(message);
    this.name = "ModelError";
    this.kind = kind;
    this.status = status;
  }
  /** Could the identical call succeed later? Configuration errors cannot. */
  get transient(): boolean {
    return this.kind === "rate_limit" || this.kind === "overloaded" || this.kind === "server" || this.kind === "network";
  }
}

function kindForStatus(status: number): ModelErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 529) return "overloaded";
  if (status >= 500) return "server";
  return "invalid";
}

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-opus-5";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

/**
 * Minimum system-prompt size worth a cache breakpoint. Below roughly 1 000
 * tokens Anthropic will not cache at all, and marking it anyway only pays the
 * write premium — so the marker goes on the big composed governance prompts
 * (tens of thousands of characters, byte-identical across every engagement) and
 * stays off the one-line ones.
 */
const CACHE_MIN_CHARS = 4_000;

/**
 * Above this many output tokens the call is streamed. Not a preference: a
 * non-streamed generation has to complete inside one HTTP timeout, and the
 * digest asks for 9 000 tokens. Streaming turns "did the whole thing finish in
 * time" into "is data still arriving", which is the question we can answer.
 */
const STREAM_ABOVE_TOKENS = 4_096;

/**
 * Models that carry the current server-tool versions. The older `_20250305`
 * web-search variant is what the pre-4.6 generation accepts; sending the new
 * one there is a 400, and sending the old one to Opus 5 forfeits dynamic
 * filtering. The model name is the only signal we have, so it is the test.
 */
function modernServerTools(model: string): boolean {
  return /^claude-(opus-5|opus-4-[678]|sonnet-5|sonnet-4-6|fable-5|mythos-5)/.test(model);
}

/**
 * Retry/timeout envelope for live model calls. Generation is slow, so the
 * per-attempt timeout is generous (120 s, `MODEL_TIMEOUT_MS` to tune); the
 * retry set is the transient one (429 rate limit, 529 overloaded, 5xx,
 * network), never invalid-request 4xx. Every module that talks to a model
 * goes through `complete()`, so this is the one place resilience lives.
 */
function modelRetryOpts(): { attempts: number; baseMs: number; timeoutMs: number } {
  return {
    attempts: Number(process.env.MODEL_RETRY_ATTEMPTS ?? 3),
    baseMs: Number(process.env.MODEL_RETRY_BASE_MS ?? 1_000),
    timeoutMs: Number(process.env.MODEL_TIMEOUT_MS ?? 120_000),
  };
}

/** One assistant turn as the Messages API returns it, streamed or not. */
interface RawMessage {
  content: ContentBlock[];
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

/**
 * Reassemble a streamed message from its Server-Sent Events.
 *
 * `touch` is called on every chunk so the caller can keep an inactivity
 * deadline rather than a total one — the point of streaming here.
 */
async function readSse(res: Response, touch: () => void): Promise<RawMessage> {
  if (!res.body) throw new ModelError("network", undefined, "Anthropic stream carried no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  const blocks: ContentBlock[] = [];
  /** Tool inputs arrive as JSON fragments; they are only parseable once closed. */
  const partialJson = new Map<number, string>();
  const out: RawMessage = { content: [], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } };

  const handle = (ev: Record<string, any>): void => {
    switch (ev.type) {
      case "message_start": {
        const u = ev.message?.usage ?? {};
        out.usage = {
          input_tokens: u.input_tokens ?? 0,
          output_tokens: u.output_tokens ?? 0,
          cache_read_input_tokens: u.cache_read_input_tokens,
          cache_creation_input_tokens: u.cache_creation_input_tokens,
        };
        break;
      }
      case "content_block_start":
        blocks[ev.index] = { ...ev.content_block };
        if (ev.content_block?.type === "tool_use") partialJson.set(ev.index, "");
        break;
      case "content_block_delta": {
        const b = blocks[ev.index] as Record<string, any> | undefined;
        const d = ev.delta ?? {};
        if (!b) break;
        if (d.type === "text_delta") b.text = (b.text ?? "") + d.text;
        else if (d.type === "thinking_delta") b.thinking = (b.thinking ?? "") + d.thinking;
        else if (d.type === "signature_delta") b.signature = (b.signature ?? "") + d.signature;
        else if (d.type === "input_json_delta") partialJson.set(ev.index, (partialJson.get(ev.index) ?? "") + d.partial_json);
        break;
      }
      case "content_block_stop": {
        const raw = partialJson.get(ev.index);
        const b = blocks[ev.index] as Record<string, any> | undefined;
        if (raw === undefined || !b) break;
        // A truncated stream leaves half a JSON object. An empty input is a
        // recognisable "the model called the tool with nothing", which every
        // caller already falls back on; a throw here would lose the whole turn.
        try {
          b.input = raw ? JSON.parse(raw) : {};
        } catch {
          b.input = {};
        }
        break;
      }
      case "message_delta":
        if (ev.delta?.stop_reason) out.stop_reason = ev.delta.stop_reason;
        if (ev.usage?.output_tokens != null) out.usage.output_tokens = ev.usage.output_tokens;
        break;
      case "error":
        throw new ModelError("server", undefined, `Anthropic stream error: ${JSON.stringify(ev.error ?? {}).slice(0, 200)}`);
    }
  };

  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    touch();
    buffer += decoder.decode(value, { stream: true });
    let split: number;
    while ((split = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let ev: Record<string, any>;
        try {
          ev = JSON.parse(payload);
        } catch {
          continue; // a keep-alive or a frame we do not understand
        }
        handle(ev);
      }
    }
  }

  // Indices are dense in practice; filtering holes keeps a dropped frame from
  // producing `undefined` in a turn we are about to replay.
  out.content = blocks.filter(Boolean);
  return out;
}

/** The real Anthropic Messages API, called with `fetch` (no SDK dependency). */
export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  readonly live = true;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(opts: { apiKey: string; baseUrl?: string; model?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  /**
   * Build the request body.
   *
   * Two things here are load-bearing and easy to undo by accident:
   *
   *  - **The system prompt is a cache breakpoint.** The composed governance
   *    prompts run to tens of thousands of characters and are byte-identical
   *    across every engagement, so the whole prefix (tools render before system)
   *    is read from cache after the first call. Anything per-request appended to
   *    `system` destroys that for every later call — put it in the user turn.
   *  - **Tool order is the cache prefix.** Tools render at position 0; adding,
   *    dropping or reordering one invalidates everything behind it.
   */
  private body(req: CompletionRequest, stream: boolean): Record<string, unknown> {
    const tools = [
      ...(req.tools ?? []),
      ...(req.webSearch
        ? [{ type: modernServerTools(this.model) ? "web_search_20260209" : "web_search_20250305", name: "web_search", max_uses: 5 }]
        : []),
    ];
    const cacheable = req.system.length >= CACHE_MIN_CHARS;
    return {
      model: this.model,
      max_tokens: req.maxTokens ?? 2048,
      system: cacheable
        ? [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }]
        : req.system,
      messages: req.messages,
      ...(tools.length > 0 ? { tools } : {}),
      ...(req.toolChoice && tools.length > 0 ? { tool_choice: req.toolChoice } : {}),
      ...(req.effort ? { output_config: { effort: req.effort } } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  async complete(req: CompletionRequest): Promise<ModelResponse> {
    const retry = modelRetryOpts();
    const stream = req.stream ?? (req.maxTokens ?? 2048) > STREAM_ABOVE_TOKENS;

    // While a stream is running the deadline is "no data for `timeoutMs`", not
    // "not finished in `timeoutMs`" — a long generation is healthy, a silent
    // socket is not.
    let idle: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const touch = (): void => {
      if (!controller) return;
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => controller?.abort(new Error("model stream went silent")), retry.timeoutMs);
    };

    try {
      const res = await fetchRetry(
        `${this.baseUrl}/v1/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
            ...(stream ? { accept: "text/event-stream" } : {}),
          },
          body: JSON.stringify(this.body(req, stream)),
        },
        {
          ...retry,
          ...(stream
            ? {
                onResponse: (c) => {
                  controller = c;
                  touch();
                },
              }
            : {}),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ModelError(kindForStatus(res.status), res.status, `Anthropic API ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = stream ? await readSse(res, touch) : ((await res.json()) as RawMessage);
      return this.shape(data);
    } catch (err) {
      if (err instanceof ModelError) throw err;
      throw new ModelError("network", undefined, err instanceof Error ? err.message : String(err));
    } finally {
      if (idle) clearTimeout(idle);
    }
  }

  private shape(data: RawMessage): ModelResponse {
    // A policy decline comes back 200 with no usable content. Reading
    // `content[0].text` there yields "" and the caller saves an empty artefact,
    // so it is raised instead — the one stop reason that must not look like an
    // answer.
    if (data.stop_reason === "refusal") {
      throw new ModelError("refusal", undefined, "the model declined this request");
    }
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
      content: data.content,
      stopReason: data.stop_reason,
      truncated: data.stop_reason === "max_tokens",
      usage: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        ...(data.usage.cache_read_input_tokens != null ? { cacheRead: data.usage.cache_read_input_tokens } : {}),
        ...(data.usage.cache_creation_input_tokens != null ? { cacheWrite: data.usage.cache_creation_input_tokens } : {}),
      },
    };
  }
}

/** The OpenAI Chat Completions API, called with `fetch`. Server-side only. */
export class OpenAIProvider implements ModelProvider {
  readonly name = "openai";
  readonly live = true;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly model: string;

  constructor(opts: { apiKey: string; baseUrl?: string; model?: string }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = opts.model ?? DEFAULT_OPENAI_MODEL;
  }

  /** Convert our Anthropic-shaped messages to OpenAI's chat format. */
  private toOpenAI(system: string, messages: ModelMessage[]): unknown[] {
    const out: unknown[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (typeof m.content === "string") {
        out.push({ role: m.role, content: m.content });
        continue;
      }
      if (m.role === "assistant") {
        const text = m.content.filter((b): b is TextBlock => b.type === "text").map((b) => b.text).join("");
        const toolUses = m.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
        const msg: Record<string, unknown> = { role: "assistant", content: text || null };
        if (toolUses.length > 0) {
          msg.tool_calls = toolUses.map((tu) => ({
            id: tu.id,
            type: "function",
            function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
          }));
        }
        out.push(msg);
      } else {
        // user turn — text plus any tool results (tool results become `tool` messages).
        const texts = m.content.filter((b): b is TextBlock => b.type === "text");
        if (texts.length > 0) out.push({ role: "user", content: texts.map((b) => b.text).join("\n") });
        for (const tr of m.content.filter((b): b is ToolResultBlock => b.type === "tool_result")) {
          out.push({ role: "tool", tool_call_id: tr.tool_use_id, content: tr.content });
        }
      }
    }
    return out;
  }

  async complete(req: CompletionRequest): Promise<ModelResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: req.maxTokens ?? 2048,
      messages: this.toOpenAI(req.system, req.messages),
    };
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      }));
      const tc = req.toolChoice;
      body.tool_choice =
        tc?.type === "tool"
          ? { type: "function", function: { name: tc.name } }
          : tc?.type === "any"
            ? "required"
            : "auto";
    }

    const res = await fetchRetry(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    }, modelRetryOpts());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ModelError(kindForStatus(res.status), res.status, `OpenAI API ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }; finish_reason: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const choice = data.choices[0];
    const toolCalls = (choice?.message.tool_calls ?? []).map((tc) => {
      let input: unknown = {};
      try { input = JSON.parse(tc.function.arguments || "{}"); } catch { /* keep {} */ }
      return { id: tc.id, name: tc.function.name, input };
    });
    const text = choice?.message.content ?? "";
    return {
      text,
      toolCalls,
      // OpenAI has no opaque blocks to preserve, so the replayable turn is
      // exactly what we can see. Synthesising it here keeps the loop provider-blind.
      content: [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...toolCalls.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.name, input: c.input })),
      ],
      stopReason: choice?.finish_reason ?? "stop",
      truncated: choice?.finish_reason === "length",
      usage: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 },
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
      const id = `offline-${tool.name}`;
      return {
        text: "",
        toolCalls: [{ id, name: tool.name, input }],
        content: [{ type: "tool_use", id, name: tool.name, input }],
        stopReason: "tool_use",
        truncated: false,
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
    const note = "\n\n(Offline analyst — deterministic tools only. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for full narrative reasoning. The assistant drafts; it never decides.)";
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
    return {
      text,
      toolCalls: [],
      content: [{ type: "text", text }],
      stopReason: "end_turn",
      truncated: false,
      usage: { input: 0, output: 0 },
    };
  }
}

/**
 * A provider name is now open-ended — the catalogue decides what exists, not a
 * union in this file. `offline` and the two built-ins are still guaranteed, but
 * an OpenAI-compatible gateway is just another catalogue entry, which is what
 * makes the portal genuinely provider-agnostic: adding one is data, not code.
 */
export type ProviderName = string;

export interface ProviderStatus {
  provider: ProviderName;
  live: boolean;
  /** The model that would be used, when live. */
  model?: string;
}

/** The wire protocol a provider speaks. Two cover the field: Anthropic's own
 *  Messages API, and the OpenAI Chat Completions shape that nearly every other
 *  vendor and local runtime (OpenRouter, Groq, Together, Azure, Ollama, vLLM…)
 *  also implements. */
export type ProviderProtocol = "anthropic" | "openai";

export interface ProviderDef {
  id: string;
  label: string;
  protocol: ProviderProtocol;
  /** Env var holding the API key. Absent only for offline. */
  keyEnv?: string;
  /** Env var overriding the base URL. */
  baseUrlEnv?: string;
  /** Env var overriding the model. */
  modelEnv?: string;
  /** Base URL used when the env var is absent. */
  defaultBaseUrl?: string;
  /** Model used when the env var is absent. Absent for a pure gateway whose
   *  model is whatever you point it at. */
  defaultModel?: string;
  /** The base URL is the whole identity of the provider — it must be set for the
   *  provider to be usable (the generic OpenAI-compatible gateway). */
  requiresBaseUrl?: boolean;
  /** Suggested models for the picker. Never a hard allow-list — a compatible
   *  gateway serves arbitrary names, so free text is always accepted too. */
  suggestedModels: string[];
  /** Auto-selection order when nothing is forced; lower wins. */
  priority: number;
  /** One line for the options page. */
  blurb: string;
}

/**
 * The provider catalogue — the single source of truth for what the portal can
 * talk to. Anthropic is native; `openai` is the vendor; `openai-compatible` is
 * the same wire protocol pointed at any base URL, which is how one entry covers
 * OpenRouter, Groq, Together, Azure OpenAI, Ollama, vLLM and anything else that
 * speaks Chat Completions. `offline` is always present and needs no key.
 */
export const PROVIDERS: readonly ProviderDef[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    protocol: "anthropic",
    keyEnv: "ANTHROPIC_API_KEY",
    baseUrlEnv: "ANTHROPIC_BASE_URL",
    modelEnv: "ANTHROPIC_MODEL",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: DEFAULT_MODEL,
    suggestedModels: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "claude-opus-4-8"],
    priority: 1,
    blurb: "Claude, called natively over the Messages API. The portal's default.",
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    protocol: "openai",
    keyEnv: "OPENAI_API_KEY",
    baseUrlEnv: "OPENAI_BASE_URL",
    modelEnv: "OPENAI_MODEL",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: DEFAULT_OPENAI_MODEL,
    suggestedModels: ["gpt-4o", "gpt-4o-mini", "o3", "o3-mini"],
    priority: 2,
    blurb: "OpenAI's own endpoint over Chat Completions.",
  },
  {
    id: "openai-compatible",
    label: "OpenAI-compatible endpoint",
    protocol: "openai",
    keyEnv: "OPENAI_COMPAT_API_KEY",
    baseUrlEnv: "OPENAI_COMPAT_BASE_URL",
    modelEnv: "OPENAI_COMPAT_MODEL",
    requiresBaseUrl: true,
    suggestedModels: [],
    priority: 3,
    blurb: "Any endpoint that speaks the OpenAI Chat Completions API — OpenRouter, Groq, Together, Azure OpenAI, Ollama, vLLM, a local runtime. Set its base URL, key and model.",
  },
  {
    id: "offline",
    label: "Offline (deterministic)",
    protocol: "openai", // unused; offline never builds a transport
    suggestedModels: [],
    priority: 99,
    blurb: "No key required. Deterministic rule-based engine — the honest demo, and the floor every live provider falls back to.",
  },
];

export function providerById(id: string | undefined): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** Is this provider usable in the given environment? Offline always is; the
 *  rest need their key, and a gateway also needs its base URL. */
export function providerAvailable(def: ProviderDef, env: Record<string, string | undefined> = process.env): boolean {
  if (def.id === "offline") return true;
  if (def.keyEnv && !has(env[def.keyEnv])) return false;
  if (def.requiresBaseUrl && !has(def.baseUrlEnv ? env[def.baseUrlEnv] : undefined)) return false;
  return true;
}

/** The provider chosen for the environment — the forced one if it is available,
 *  else the highest-priority available non-offline provider, else offline. */
function selectProvider(env: Record<string, string | undefined>): ProviderDef {
  const offline = providerById("offline")!;
  const forcedId = env.MODEL_PROVIDER?.trim().toLowerCase();
  if (forcedId) {
    const forced = providerById(forcedId);
    if (forced && providerAvailable(forced, env)) return forced;
    if (forcedId === "offline") return offline;
    // A forced-but-unavailable provider falls through to auto-selection rather
    // than silently going offline behind the operator's back — but if nothing
    // else is available they still land on offline, which is honest.
  }
  const auto = [...PROVIDERS]
    .filter((p) => p.id !== "offline" && providerAvailable(p, env))
    .sort((a, b) => a.priority - b.priority)[0];
  return auto ?? offline;
}

/** The model a provider would use in this environment. */
export function modelFor(def: ProviderDef, env: Record<string, string | undefined> = process.env): string | undefined {
  if (def.id === "offline") return undefined;
  const fromEnv = def.modelEnv ? env[def.modelEnv]?.trim() : undefined;
  return fromEnv || def.defaultModel;
}

/**
 * Decide which provider is active WITHOUT constructing it or touching a key —
 * safe to call from a server component to render the status chip. Catalogue-
 * driven: `MODEL_PROVIDER` forces a choice when that provider is available, else
 * the highest-priority keyed provider wins, else offline.
 */
export function describeProvider(env: Record<string, string | undefined> = process.env): ProviderStatus {
  const def = selectProvider(env);
  if (def.id === "offline") return { provider: "offline", live: false };
  return { provider: def.id, live: true, model: modelFor(def, env) };
}

/** Construct the active provider from the environment. */
export function getProvider(env: Record<string, string | undefined> = process.env): ModelProvider {
  const def = selectProvider(env);
  if (def.id === "offline") return new OfflineProvider();
  const opts = {
    apiKey: (def.keyEnv ? env[def.keyEnv] : undefined) ?? "",
    baseUrl: (def.baseUrlEnv ? env[def.baseUrlEnv]?.trim() : undefined) || def.defaultBaseUrl,
    model: modelFor(def, env),
  };
  return def.protocol === "anthropic" ? new AnthropicProvider(opts) : new OpenAIProvider(opts);
}
