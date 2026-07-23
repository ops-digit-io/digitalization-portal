import { describe, it, expect } from "vitest";
import {
  parseSkillMarkdown,
  parseSkillReference,
  resolveCandidates,
  findSkillPath,
  isAllowedSkillUrl,
  normalizeSkillUrl,
  ensureProvenance,
  fetchReferenceSkill,
  REFERENCE_SOURCES,
} from "./skill-import.js";

const SKILL = `---
name: pdf-extraction
description: Extract text and tables from PDFs.
---

# PDF extraction

Use pdfplumber to read the file.`;

describe("parseSkillReference", () => {
  it("parses an `npx skills add owner/repo@skill -y` command", () => {
    const ref = parseSkillReference("npx skills add vercel/skills@react-best-practices -y");
    expect(ref).toEqual({ kind: "repo", owner: "vercel", repo: "skills", skill: "react-best-practices" });
  });
  it("parses a bare owner/repo and a --skill flag", () => {
    expect(parseSkillReference("mcp-use/skills")).toEqual({ kind: "repo", owner: "mcp-use", repo: "skills" });
    expect(parseSkillReference("npx skills add doitian/skills-repo --skill skill-creator")).toEqual({
      kind: "repo", owner: "doitian", repo: "skills-repo", skill: "skill-creator",
    });
  });
  it("parses github repo, blob, and raw URLs", () => {
    expect(parseSkillReference("https://github.com/o/r")).toEqual({ kind: "repo", owner: "o", repo: "r" });
    expect(parseSkillReference("https://github.com/o/r/blob/main/skills/x/SKILL.md")).toEqual({
      kind: "url", url: "https://raw.githubusercontent.com/o/r/main/skills/x/SKILL.md",
    });
    expect(parseSkillReference("https://raw.githubusercontent.com/o/r/main/SKILL.md")).toEqual({
      kind: "url", url: "https://raw.githubusercontent.com/o/r/main/SKILL.md",
    });
  });
  it("rejects nonsense", () => {
    expect(parseSkillReference("")).toBeUndefined();
    expect(parseSkillReference("just some words")).toBeUndefined();
  });
});

describe("resolveCandidates", () => {
  it("targets the GitHub contents API for a repo+skill, most-specific first", () => {
    const c = resolveCandidates({ kind: "repo", owner: "o", repo: "r", skill: "x" });
    expect(c[0]).toBe("https://api.github.com/repos/o/r/contents/skills/x/SKILL.md");
    expect(c).toContain("https://api.github.com/repos/o/r/contents/SKILL.md");
  });
});

describe("isAllowedSkillUrl", () => {
  it("allows the ecosystem hosts (incl. the GitHub API) over https", () => {
    expect(isAllowedSkillUrl("https://skills.sh/s/x", {})).toBe(true);
    expect(isAllowedSkillUrl("https://api.github.com/repos/o/r/contents/SKILL.md", {})).toBe(true);
    expect(isAllowedSkillUrl("https://raw.githubusercontent.com/o/r/main/SKILL.md", {})).toBe(true);
  });
  it("blocks agentskills.io, non-https, unknown hosts, and SSRF targets", () => {
    expect(isAllowedSkillUrl("https://agentskills.io/x", {})).toBe(false); // dropped per request
    expect(isAllowedSkillUrl("http://skills.sh/x", {})).toBe(false);
    expect(isAllowedSkillUrl("https://evil.example.com/x", {})).toBe(false);
    expect(isAllowedSkillUrl("https://169.254.169.254/latest/meta-data", {})).toBe(false);
  });
});

describe("reference sources", () => {
  it("lists marketplaces but not agentskills.io", () => {
    const names = REFERENCE_SOURCES.map((s) => s.name.toLowerCase());
    expect(names).toContain("skills.sh");
    expect(names).toContain("skillsmp");
    expect(REFERENCE_SOURCES.every((s) => !s.url.includes("agentskills.io"))).toBe(true);
  });
});

describe("normalizeSkillUrl / ensureProvenance", () => {
  it("rewrites a GitHub blob URL to raw", () => {
    expect(normalizeSkillUrl("https://github.com/o/r/blob/main/x/SKILL.md")).toBe(
      "https://raw.githubusercontent.com/o/r/main/x/SKILL.md",
    );
  });
  it("records the source URL in the frontmatter", () => {
    const out = ensureProvenance(SKILL, "https://github.com/o/r#pdf");
    expect(out).toMatch(/source: https:\/\/github\.com\/o\/r#pdf/);
    expect(parseSkillMarkdown(out).name).toBe("pdf-extraction");
  });
});

describe("fetchReferenceSkill", () => {
  it("resolves an npx command and fetches the skill's whole folder", async () => {
    const refDoc = "# Deep reference\n";
    const script = "print('hi')\n";
    const fake = (async (u: string) => {
      if (u === "https://api.github.com/repos/vercel/skills") {
        return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
      }
      if (u.includes("/git/trees/main")) {
        return new Response(JSON.stringify({ tree: [
          { path: "skills/pdf/SKILL.md", type: "blob" },
          { path: "skills/pdf/references/deep.md", type: "blob" },
          { path: "skills/pdf/scripts/run.py", type: "blob" },
          { path: "skills/pdf/logo.png", type: "blob" }, // binary → skipped
          { path: "README.md", type: "blob" }, // outside the skill dir
        ] }), { status: 200 });
      }
      if (u.endsWith("/main/skills/pdf/SKILL.md")) return new Response(SKILL, { status: 200 });
      if (u.endsWith("/main/skills/pdf/references/deep.md")) return new Response(refDoc, { status: 200 });
      if (u.endsWith("/main/skills/pdf/scripts/run.py")) return new Response(script, { status: 200 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const got = await fetchReferenceSkill("npx skills add vercel/skills@pdf -y", {}, fake);
    expect(got.name).toBe("pdf-extraction");
    const paths = got.files.map((f) => f.path).sort();
    expect(paths).toEqual(["SKILL.md", "references/deep.md", "scripts/run.py"]); // entry-relative, README excluded
    expect(got.skipped).toContain("logo.png"); // binary skipped
    expect(got.sourceUrl).toContain("tree/main/skills/pdf");
  });

  it("rejects a disallowed host without fetching", async () => {
    let called = false;
    const fake = (async () => { called = true; return new Response(""); }) as unknown as typeof fetch;
    await expect(fetchReferenceSkill("https://evil.example.com/x", {}, fake)).rejects.toThrow(/allowed|SKILL|command/i);
    expect(called).toBe(false);
  });

  it("errors clearly when no SKILL.md is found", async () => {
    // Fixed paths 404, tree lookup returns nothing.
    const fake = (async (u: string) => {
      if (u.includes("/git/trees/")) return new Response(JSON.stringify({ tree: [] }), { status: 200 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    await expect(fetchReferenceSkill("owner/repo@missing", {}, fake)).rejects.toThrow(/SKILL\.md/i);
  });

  it("resolves a deeply-nested skill by walking the repo tree", async () => {
    // Mirrors a plugins repo: product-brainstorming lives under a plugin dir.
    const nested = "plugins/product-development/skills/product-brainstorming/SKILL.md";
    const b64 = Buffer.from(SKILL).toString("base64");
    const fake = (async (u: string, init?: RequestInit) => {
      // Fixed-layout contents probes all miss.
      if (u.includes("/contents/")) return new Response("", { status: 404 });
      if (u === "https://api.github.com/repos/anthropics/knowledge-work-plugins") {
        return new Response(JSON.stringify({ default_branch: "main" }), { status: 200 });
      }
      if (u.includes("/git/trees/main")) {
        return new Response(JSON.stringify({ tree: [
          { path: "README.md", type: "blob" },
          { path: nested, type: "blob" },
        ] }), { status: 200 });
      }
      if (u === `https://raw.githubusercontent.com/anthropics/knowledge-work-plugins/main/${nested}`) {
        return new Response(SKILL, { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const got = await fetchReferenceSkill(
      "npx skills add https://github.com/anthropics/knowledge-work-plugins --skill product-brainstorming",
      {},
      fake,
    );
    expect(got.name).toBe("pdf-extraction");
    expect(got.sourceUrl).toContain("plugins/product-development/skills/product-brainstorming");
    expect(got.files.map((f) => f.path)).toContain("SKILL.md");
  });
});

describe("findSkillPath", () => {
  it("matches a skill folder at any depth", () => {
    const paths = ["a/skills/foo/SKILL.md", "b/c/bar/SKILL.md", "SKILL.md"];
    expect(findSkillPath(paths, "bar")).toBe("b/c/bar/SKILL.md");
    expect(findSkillPath(paths, "foo")).toBe("a/skills/foo/SKILL.md");
  });
  it("returns the sole skill when none is named, else undefined", () => {
    expect(findSkillPath(["only/SKILL.md"])).toBe("only/SKILL.md");
    expect(findSkillPath(["a/SKILL.md", "b/SKILL.md"])).toBeUndefined();
  });
});
