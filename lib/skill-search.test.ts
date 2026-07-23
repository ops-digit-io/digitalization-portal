import { describe, it, expect } from "vitest";
import { extractReference, hitsFromPayload, searchSkills, searchEndpoint, BASELINE_TASKS } from "./skill-search.js";

describe("extractReference", () => {
  it("prefers an install command", () => {
    expect(extractReference({ install: "npx skills add vercel/skills@pdf", github: "https://github.com/vercel/skills" }))
      .toBe("npx skills add vercel/skills@pdf");
  });
  it("falls back to a github url", () => {
    expect(extractReference({ repository_url: "https://github.com/o/r/blob/main/skills/x/SKILL.md" }))
      .toBe("https://github.com/o/r/blob/main/skills/x/SKILL.md");
  });
  it("builds owner/repo@skill from explicit fields", () => {
    expect(extractReference({ repo: "anthropics/knowledge-work-plugins", skill: "product-brainstorming" }))
      .toBe("anthropics/knowledge-work-plugins@product-brainstorming");
  });
  it("returns undefined when nothing resolvable is present", () => {
    expect(extractReference({ name: "cool skill", stars: 12 })).toBeUndefined();
  });
});

describe("hitsFromPayload", () => {
  it("reads results under common envelope keys and dedupes", () => {
    const payload = {
      results: [
        { name: "PDF", description: "extract pdf", repo: "a/b" },
        { title: "Dup", repo: "a/b" }, // same reference (a/b) → deduped
        { title: "Brainstorm", repo: "anthropics/knowledge-work-plugins", skill: "product-brainstorming" },
        { name: "unresolvable", stars: 1 }, // dropped
      ],
    };
    const hits = hitsFromPayload(payload);
    expect(hits).toHaveLength(2);
    expect(hits[0]!.name).toBe("PDF");
    expect(hits[1]!.reference).toBe("anthropics/knowledge-work-plugins@product-brainstorming");
  });
  it("handles a bare array payload", () => {
    const hits = hitsFromPayload([{ title: "X", github: "https://github.com/o/r" }]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.source).toBe("https://github.com/o/r");
  });
});

describe("searchSkills", () => {
  it("builds the endpoint and maps results", async () => {
    let calledUrl = "";
    const fake = (async (u: string) => {
      calledUrl = u;
      return new Response(JSON.stringify({ skills: [{ name: "Reqs", repo: "o/reqs" }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const hits = await searchSkills("requirements analysis", {}, fake);
    expect(calledUrl).toBe(searchEndpoint("requirements analysis"));
    expect(hits[0]!.name).toBe("Reqs");
  });
  it("throws a helpful error on non-ok, mentioning paste fallback", async () => {
    const fake = (async () => new Response("nope", { status: 429 })) as unknown as typeof fetch;
    await expect(searchSkills("x", {}, fake)).rejects.toThrow(/import by pasting/i);
  });
  it("returns [] for an empty query without fetching", async () => {
    let called = false;
    const fake = (async () => { called = true; return new Response("[]"); }) as unknown as typeof fetch;
    expect(await searchSkills("   ", {}, fake)).toEqual([]);
    expect(called).toBe(false);
  });
});

describe("baseline tasks", () => {
  it("covers the lifecycle's agentic work", () => {
    expect(BASELINE_TASKS.length).toBeGreaterThanOrEqual(8);
    expect(BASELINE_TASKS).toContain("requirements analysis");
  });
});
