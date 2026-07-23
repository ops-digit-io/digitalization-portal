import { describe, it, expect } from "vitest";
import {
  parseSkillMarkdown,
  isAllowedSkillUrl,
  normalizeSkillUrl,
  ensureProvenance,
  fetchReferenceSkill,
} from "./skill-import.js";

const SKILL = `---
name: pdf-extraction
description: Extract text and tables from PDFs.
---

# PDF extraction

Use pdfplumber to read the file.`;

describe("parseSkillMarkdown", () => {
  it("splits frontmatter from body", () => {
    const p = parseSkillMarkdown(SKILL);
    expect(p.name).toBe("pdf-extraction");
    expect(p.description).toBe("Extract text and tables from PDFs.");
    expect(p.hasFrontmatter).toBe(true);
    expect(p.body).toContain("# PDF extraction");
    expect(p.body).not.toContain("---");
  });
});

describe("isAllowedSkillUrl", () => {
  it("allows the ecosystem hosts over https", () => {
    expect(isAllowedSkillUrl("https://agentskills.io/s/x", {})).toBe(true);
    expect(isAllowedSkillUrl("https://skills.sh/s/x", {})).toBe(true);
    expect(isAllowedSkillUrl("https://raw.githubusercontent.com/o/r/main/SKILL.md", {})).toBe(true);
  });
  it("blocks non-https, unknown hosts, and SSRF targets", () => {
    expect(isAllowedSkillUrl("http://agentskills.io/x", {})).toBe(false); // not https
    expect(isAllowedSkillUrl("https://evil.example.com/x", {})).toBe(false);
    expect(isAllowedSkillUrl("https://169.254.169.254/latest/meta-data", {})).toBe(false);
    expect(isAllowedSkillUrl("https://localhost/x", {})).toBe(false);
  });
  it("honours SKILL_IMPORT_HOSTS to extend the allowlist", () => {
    expect(isAllowedSkillUrl("https://skills.acme.com/x", { SKILL_IMPORT_HOSTS: "skills.acme.com" })).toBe(true);
  });
});

describe("normalizeSkillUrl", () => {
  it("rewrites a GitHub blob URL to raw", () => {
    expect(normalizeSkillUrl("https://github.com/o/r/blob/main/skills/x/SKILL.md")).toBe(
      "https://raw.githubusercontent.com/o/r/main/skills/x/SKILL.md",
    );
  });
  it("passes other URLs through", () => {
    expect(normalizeSkillUrl("https://skills.sh/s/x")).toBe("https://skills.sh/s/x");
  });
});

describe("ensureProvenance", () => {
  it("records the source URL in the frontmatter", () => {
    const out = ensureProvenance(SKILL, "https://skills.sh/s/pdf");
    expect(out).toMatch(/source: https:\/\/skills\.sh\/s\/pdf/);
    // still a valid SKILL.md
    expect(parseSkillMarkdown(out).name).toBe("pdf-extraction");
  });
  it("replaces an existing source rather than duplicating", () => {
    const withSrc = SKILL.replace("---\n\n", "source: https://old\n---\n\n");
    const out = ensureProvenance(withSrc, "https://new");
    expect(out).toMatch(/source: https:\/\/new/);
    expect(out).not.toMatch(/source: https:\/\/old/);
  });
});

describe("fetchReferenceSkill", () => {
  it("rejects a disallowed host without fetching", async () => {
    let called = false;
    const fakeFetch = (async () => { called = true; return new Response(""); }) as unknown as typeof fetch;
    await expect(fetchReferenceSkill("https://evil.example.com/x", {}, fakeFetch)).rejects.toThrow(/host/i);
    expect(called).toBe(false);
  });

  it("fetches, parses, and requires a SKILL.md name", async () => {
    const ok = (async () => new Response(SKILL, { status: 200 })) as unknown as typeof fetch;
    const got = await fetchReferenceSkill("https://raw.githubusercontent.com/o/r/main/SKILL.md", {}, ok);
    expect(got.name).toBe("pdf-extraction");

    const notSkill = (async () => new Response("# just markdown", { status: 200 })) as unknown as typeof fetch;
    await expect(fetchReferenceSkill("https://skills.sh/s/x", {}, notSkill)).rejects.toThrow(/SKILL\.md/i);
  });
});
