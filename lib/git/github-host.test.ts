/**
 * The GitHub host's failure semantics — the store's system of record depends on
 * exactly three of them:
 *
 *  1. only a true 404 reads as "file not there"; an auth failure or an outage
 *     THROWS instead of inviting the caller to rebuild the file from nothing;
 *  2. a stale-sha write conflict (two writers) re-reads the sha and retries
 *     once, so the routine case is last-write-wins, not a lost save;
 *  3. transient statuses retry, definitive ones do not.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { GitHubHost, GitHubApiError } from "./github-host";
import { FileExistsError, type RepoRef } from "./host";

const repo: RepoRef = { owner: "org", name: "du-processes", url: "https://x", local: false };

// A throwaway RSA key, generated per run — the host signs a real App JWT before
// any request goes out, so the key must actually sign.
const KEY = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

let host: GitHubHost;
let calls: { url: string; method: string; body?: string }[];
let queue: Response[];

/** Serve the token handshake automatically; everything else pops the queue. */
function serve(...responses: Response[]) {
  queue = responses;
}

beforeEach(() => {
  host = new GitHubHost({ appId: "1", privateKey: KEY, installationId: "42", org: "org" });
  calls = [];
  queue = [];
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", ...(init?.body ? { body: String(init.body) } : {}) });
    if (url.includes("/access_tokens")) {
      return Promise.resolve(
        new Response(JSON.stringify({ token: "t", expires_at: new Date(Date.now() + 3_600_000).toISOString() }), { status: 201 }),
      );
    }
    const next = queue.shift();
    if (!next) return Promise.resolve(new Response("{}", { status: 500 }));
    return Promise.resolve(next);
  });
  process.env.GITHUB_RETRY_BASE_MS = "1";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_RETRY_BASE_MS;
});

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
const b64 = (s: string) => Buffer.from(s).toString("base64");

describe("getFile", () => {
  it("returns undefined only on a true 404", async () => {
    serve(json({ message: "Not Found" }, 404));
    expect(await host.getFile(repo, "processes/x/meta.json")).toBeUndefined();
  });

  it("THROWS on an auth failure instead of reading it as a missing file", async () => {
    serve(json({ message: "Bad credentials" }, 401));
    await expect(host.getFile(repo, "processes/x/meta.json")).rejects.toThrow(GitHubApiError);
  });

  it("decodes content, and retries a transient 502 on the way", async () => {
    serve(json({ message: "bad gateway" }, 502), json({ content: b64("hello"), encoding: "base64" }));
    expect(await host.getFile(repo, "f")).toBe("hello");
  });
});

describe("listDir", () => {
  it("an outage is an error, not an empty directory — an empty landscape page would lie", async () => {
    serve(json({ message: "boom" }, 403));
    await expect(host.listDir(repo, "processes")).rejects.toThrow(GitHubApiError);
  });

  it("a directory that does not exist yet is genuinely empty", async () => {
    serve(json({ message: "Not Found" }, 404));
    expect(await host.listDir(repo, "processes")).toEqual([]);
  });
});

describe("putFile", () => {
  it("re-reads the sha and retries once on a stale-sha conflict", async () => {
    serve(
      json({ sha: "old" }),                       // initial sha lookup
      json({ message: "does not match" }, 409),   // PUT with stale sha
      json({ sha: "new" }),                       // fresh sha lookup
      json({ ok: true }),                         // retried PUT lands
    );
    await host.putFile(repo, { path: "f.md", content: "x" }, "msg", "main");
    const puts = calls.filter((c) => c.method === "PUT");
    expect(puts.length).toBe(2);
    expect(puts[1]?.body).toContain('"sha":"new"');
  });

  it("createOnly surfaces an existing path as FileExistsError, never overwrites", async () => {
    serve(json({ message: "sha required" }, 422));
    await expect(
      host.putFile(repo, { path: "f.md", content: "x" }, "msg", "main", { createOnly: true }),
    ).rejects.toThrow(FileExistsError);
    // createOnly never looks up a sha — the sha-less PUT is the guard itself.
    expect(calls.filter((c) => c.method === "GET").length).toBe(0);
  });

  it("propagates a failed sha lookup rather than writing blind over the survivor", async () => {
    serve(json({ message: "boom" }, 500), json({ message: "boom" }, 500), json({ message: "boom" }, 500));
    await expect(host.putFile(repo, { path: "f.md", content: "x" }, "msg", "main")).rejects.toThrow(GitHubApiError);
    expect(calls.filter((c) => c.method === "PUT").length).toBe(0);
  });
});
