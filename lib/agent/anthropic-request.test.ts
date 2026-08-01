/**
 * What the portal actually puts on the wire to Anthropic.
 *
 * These are not tests of the API — they are tests of the decisions we made
 * about it, and each one guards a failure that is invisible until it is
 * expensive: a cache marker that quietly stops matching, a server-tool version
 * that 400s on the model we default to, a streamed digest aborted by a timeout
 * meant for a short request, an artefact saved as finished when the model ran
 * out of room.
 *
 * `fetch` is stubbed, so nothing here reaches the network or needs a key.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { AnthropicProvider, ModelError, OfflineProvider, describeProvider } from "./provider.js";

type Captured = { url: string; body: Record<string, any>; headers: Record<string, string> };

/** Stub `fetch`, capture the request, reply with `reply`. */
function stub(reply: unknown, status = 200): { calls: Captured[] } {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)),
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    return new Response(JSON.stringify(reply), { status, headers: { "content-type": "application/json" } });
  });
  return { calls };
}

/** Stub `fetch` with a Server-Sent Event stream assembled from `events`. */
function stubStream(events: unknown[]): { calls: Captured[] } {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), headers: (init.headers ?? {}) as Record<string, string> });
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        const enc = new TextEncoder();
        for (const e of events) c.enqueue(enc.encode(`event: ${(e as any).type}\ndata: ${JSON.stringify(e)}\n\n`));
        c.close();
      },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
  });
  return { calls };
}

const OK = {
  content: [{ type: "text", text: "hello" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 10, output_tokens: 2 },
};

const p = (model?: string) => new AnthropicProvider({ apiKey: "k", ...(model ? { model } : {}) });

afterEach(() => vi.unstubAllGlobals());

describe("the model we default to", () => {
  it("is claude-opus-5", () => {
    expect(describeProvider({ ANTHROPIC_API_KEY: "k" }).model).toBe("claude-opus-5");
  });

  it("is overridable, because an operator may have to pin one", () => {
    expect(describeProvider({ ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "claude-haiku-4-5" }).model).toBe("claude-haiku-4-5");
  });
});

describe("prompt caching", () => {
  it("marks a large system prompt as a cache breakpoint", async () => {
    const { calls } = stub(OK);
    const system = "g".repeat(20_000);
    await p().complete({ system, messages: [{ role: "user", content: "x" }], maxTokens: 100 });
    expect(calls[0]!.body.system).toEqual([
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ]);
  });

  it("leaves a short system prompt alone — below the minimum nothing caches, and the marker only costs", async () => {
    const { calls } = stub(OK);
    await p().complete({ system: "be brief", messages: [{ role: "user", content: "x" }], maxTokens: 100 });
    expect(calls[0]!.body.system).toBe("be brief");
  });

  it("reports cache hits, so 'is caching working' is answerable and not a belief", async () => {
    stub({ ...OK, usage: { input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 9_000, cache_creation_input_tokens: 0 } });
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 100 });
    expect(res.usage.cacheRead).toBe(9_000);
    expect(res.usage.cacheWrite).toBe(0);
  });

  it("keeps the prefix byte-identical across calls that differ only in the user turn", async () => {
    const { calls } = stub(OK);
    const system = "g".repeat(20_000);
    await p().complete({ system, messages: [{ role: "user", content: "one" }], maxTokens: 100 });
    await p().complete({ system, messages: [{ role: "user", content: "two" }], maxTokens: 100 });
    // tools → system → messages is the render order; a difference in either of
    // the first two invalidates everything behind it.
    expect(JSON.stringify(calls[0]!.body.system)).toBe(JSON.stringify(calls[1]!.body.system));
    expect(calls[0]!.body.tools).toBeUndefined();
  });
});

describe("server tools", () => {
  it("sends the current web-search version to a current model", async () => {
    const { calls } = stub(OK);
    await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], webSearch: true, maxTokens: 100 });
    expect(calls[0]!.body.tools[0].type).toBe("web_search_20260209");
  });

  it("sends the older version to an older model, which is the only one it accepts", async () => {
    const { calls } = stub(OK);
    await p("claude-haiku-4-5").complete({ system: "s", messages: [{ role: "user", content: "x" }], webSearch: true, maxTokens: 100 });
    expect(calls[0]!.body.tools[0].type).toBe("web_search_20250305");
  });
});

describe("forced tools", () => {
  it("forces the tool when the caller wants an extraction, not a conversation", async () => {
    const { calls } = stub(OK);
    await p().complete({
      system: "s",
      messages: [{ role: "user", content: "x" }],
      tools: [{ name: "propose", description: "d", input_schema: { type: "object" } }],
      toolChoice: { type: "tool", name: "propose" },
      maxTokens: 100,
    });
    expect(calls[0]!.body.tool_choice).toEqual({ type: "tool", name: "propose" });
  });

  it("never sends a tool_choice with no tools — that is a 400", async () => {
    const { calls } = stub(OK);
    await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], toolChoice: { type: "any" }, maxTokens: 100 });
    expect(calls[0]!.body.tool_choice).toBeUndefined();
  });
});

describe("the assistant turn is replayed verbatim", () => {
  it("carries blocks we do not model — thinking blocks the next request must contain", async () => {
    stub({
      content: [
        { type: "thinking", thinking: "…", signature: "sig-abc" },
        { type: "text", text: "answer" },
        { type: "tool_use", id: "t1", name: "propose", input: { a: 1 } },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 100 });
    expect(res.content).toHaveLength(3);
    expect(res.content[0]).toEqual({ type: "thinking", thinking: "…", signature: "sig-abc" });
    // …while the convenience views stay exactly what callers already read.
    expect(res.text).toBe("answer");
    expect(res.toolCalls).toEqual([{ id: "t1", name: "propose", input: { a: 1 } }]);
  });
});

describe("stop reasons that must not look like an answer", () => {
  it("flags a truncated artefact instead of presenting it as finished", async () => {
    stub({ ...OK, stop_reason: "max_tokens" });
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 100 });
    expect(res.truncated).toBe(true);
    expect(res.text).toBe("hello"); // still returned — the draft is not thrown away
  });

  it("raises a refusal rather than saving the empty document it comes with", async () => {
    stub({ content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } });
    await expect(p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 100 })).rejects.toMatchObject({
      name: "ModelError",
      kind: "refusal",
    });
  });
});

describe("errors say what kind of wrong they are", () => {
  const cases: [number, string, boolean][] = [
    [401, "auth", false],
    [429, "rate_limit", true],
    [529, "overloaded", true],
    [400, "invalid", false],
    [503, "server", true],
  ];
  for (const [status, kind, transient] of cases) {
    it(`${status} → ${kind} (${transient ? "worth retrying" : "not worth retrying"})`, async () => {
      // One attempt: this asserts classification, not the retry envelope.
      vi.stubEnv("MODEL_RETRY_ATTEMPTS", "1");
      stub({ error: "no" }, status);
      const err = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 100 }).catch((e) => e);
      expect(err).toBeInstanceOf(ModelError);
      expect(err.kind).toBe(kind);
      expect(err.transient).toBe(transient);
      vi.unstubAllEnvs();
    });
  }
});

describe("streaming", () => {
  const events = [
    { type: "message_start", message: { usage: { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 90 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello " } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "world" } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "t1", name: "propose", input: {} } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"demands":' } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '[{"title":"A"}]}' } },
    { type: "content_block_stop", index: 1 },
    { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 42 } },
    { type: "message_stop" },
  ];

  it("streams a long generation — a 9 000-token digest cannot depend on finishing inside one short timeout", async () => {
    const { calls } = stubStream(events);
    await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 9000 });
    expect(calls[0]!.body.stream).toBe(true);
    expect(calls[0]!.headers.accept).toBe("text/event-stream");
  });

  it("does not stream a short one — the extra machinery buys nothing there", async () => {
    const { calls } = stub(OK);
    await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 500 });
    expect(calls[0]!.body.stream).toBeUndefined();
  });

  it("reassembles text, tool input, stop reason and usage from the events", async () => {
    stubStream(events);
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 9000 });
    expect(res.text).toBe("Hello world");
    expect(res.toolCalls).toEqual([{ id: "t1", name: "propose", input: { demands: [{ title: "A" }] } }]);
    expect(res.stopReason).toBe("tool_use");
    expect(res.usage).toEqual({ input: 100, output: 42, cacheRead: 90 });
    expect(res.content).toHaveLength(2);
  });

  it("survives a tool input cut off mid-JSON rather than losing the whole turn", async () => {
    stubStream([
      { type: "message_start", message: { usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t1", name: "propose", input: {} } },
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"demands":[{"tit' } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 9 } },
    ]);
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 9000 });
    expect(res.truncated).toBe(true);
    expect(res.toolCalls[0]!.input).toEqual({}); // recognisably empty, which every caller already falls back on
  });

  it("carries a streamed thinking block through, signature and all", async () => {
    stubStream([
      { type: "message_start", message: { usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "step" } },
      { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig" } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } },
    ]);
    const res = await p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 9000 });
    expect(res.content[0]).toEqual({ type: "thinking", thinking: "step", signature: "sig" });
  });

  it("raises a mid-stream error event instead of returning a half message as complete", async () => {
    stubStream([
      { type: "message_start", message: { usage: { input_tokens: 1, output_tokens: 0 } } },
      { type: "error", error: { type: "overloaded_error" } },
    ]);
    await expect(p().complete({ system: "s", messages: [{ role: "user", content: "x" }], maxTokens: 9000 })).rejects.toBeInstanceOf(ModelError);
  });
});

describe("the offline provider honours the same contract", () => {
  it("returns a replayable turn, so the loop is provider-blind", async () => {
    const res = await new OfflineProvider().complete({
      system: "s",
      messages: [{ role: "user", content: "x" }],
      tools: [{ name: "propose", description: "d", input_schema: { type: "object" } }],
    });
    expect(res.content).toEqual([{ type: "tool_use", id: "offline-propose", name: "propose", input: {} }]);
    expect(res.truncated).toBe(false);
  });
});
