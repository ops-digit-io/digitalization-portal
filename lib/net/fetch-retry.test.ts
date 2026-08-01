/**
 * The retry envelope both integration seams stand on. The boundary worth
 * pinning: transient failures retry with backoff, definitive failures return
 * immediately — a 401 asked three times is three slow 401s.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRetry, isTransientStatus } from "./fetch-retry";

const FAST = { baseMs: 1, timeoutMs: 5_000 };

afterEach(() => vi.unstubAllGlobals());

function stub(...responses: (Response | Error)[]) {
  const calls: RequestInit[] = [];
  let i = 0;
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
    calls.push(init);
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r.clone());
  });
  return calls;
}

describe("isTransientStatus", () => {
  it("retries rate limits, overload and server errors — not client errors", () => {
    for (const s of [408, 429, 500, 502, 503, 504, 529]) expect(isTransientStatus(s)).toBe(true);
    for (const s of [200, 400, 401, 403, 404, 409, 422]) expect(isTransientStatus(s)).toBe(false);
  });
});

describe("fetchRetry", () => {
  it("passes a success straight through", async () => {
    const calls = stub(new Response("ok", { status: 200 }));
    const res = await fetchRetry("http://x/", {}, FAST);
    expect(res.status).toBe(200);
    expect(calls.length).toBe(1);
  });

  it("retries a 503 and returns the eventual success", async () => {
    const calls = stub(new Response("down", { status: 503 }), new Response("ok", { status: 200 }));
    const res = await fetchRetry("http://x/", {}, FAST);
    expect(res.status).toBe(200);
    expect(calls.length).toBe(2);
  });

  it("does NOT retry a definitive 4xx — one clear error beats three slow ones", async () => {
    const calls = stub(new Response("no", { status: 401 }));
    const res = await fetchRetry("http://x/", {}, FAST);
    expect(res.status).toBe(401);
    expect(calls.length).toBe(1);
  });

  it("returns the last transient response once out of attempts, rather than hiding it", async () => {
    const calls = stub(new Response("still down", { status: 503 }));
    const res = await fetchRetry("http://x/", { }, { ...FAST, attempts: 3 });
    expect(res.status).toBe(503);
    expect(calls.length).toBe(3);
  });

  it("retries a network failure and surfaces the final error when it never recovers", async () => {
    const calls = stub(new Error("ECONNRESET"));
    await expect(fetchRetry("http://x/", {}, { ...FAST, attempts: 2 })).rejects.toThrow("ECONNRESET");
    expect(calls.length).toBe(2);
  });

  it("honours Retry-After but never beyond the cap", async () => {
    const started = Date.now();
    stub(
      new Response("wait", { status: 429, headers: { "retry-after": "0" } }),
      new Response("ok", { status: 200 }),
    );
    const res = await fetchRetry("http://x/", {}, { ...FAST, retryAfterCapMs: 50 });
    expect(res.status).toBe(200);
    // "retry-after: 0" → no wait; the cap keeps a hostile value from hanging the route.
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("arms a per-attempt timeout signal", async () => {
    const calls = stub(new Response("ok", { status: 200 }));
    await fetchRetry("http://x/", {}, FAST);
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
  });
});
