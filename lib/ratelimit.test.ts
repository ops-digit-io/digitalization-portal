import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimitMemory } from "./ratelimit.js";

// No KV configured in tests → the in-memory fallback path.
describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => _resetRateLimitMemory());

  it("allows up to the limit, then blocks within the window", async () => {
    const opts = { limit: 3, windowSec: 60 };
    const now = 1_000_000;
    expect((await rateLimit("u1", opts, now)).allowed).toBe(true);
    expect((await rateLimit("u1", opts, now)).allowed).toBe(true);
    const third = await rateLimit("u1", opts, now);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect((await rateLimit("u1", opts, now)).allowed).toBe(false); // 4th blocked
  });

  it("resets after the window elapses", async () => {
    const opts = { limit: 1, windowSec: 60 };
    const now = 2_000_000;
    expect((await rateLimit("u2", opts, now)).allowed).toBe(true);
    expect((await rateLimit("u2", opts, now)).allowed).toBe(false);
    expect((await rateLimit("u2", opts, now + 61_000)).allowed).toBe(true); // new window
  });

  it("tracks users independently", async () => {
    const opts = { limit: 1, windowSec: 60 };
    const now = 3_000_000;
    expect((await rateLimit("a", opts, now)).allowed).toBe(true);
    expect((await rateLimit("b", opts, now)).allowed).toBe(true);
    expect((await rateLimit("a", opts, now)).allowed).toBe(false);
  });
});
