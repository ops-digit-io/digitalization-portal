import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalHost } from "../git/local-host.js";
import { hasGitHubCredentials } from "../git/host.js";
import { getGitHost } from "../git/index.js";
import { buildScaffoldFiles, repoName, slugify, type UseCaseSeed } from "./scaffold.js";
import { draftPocSpec } from "./spec.js";
import { generateDashboardMockup } from "./mockup.js";
import { planPoc, scaffoldRepo, buildArtifact } from "./builder.js";

const seed: UseCaseSeed = {
  id: "UC-2026-0041",
  title: "Scrap attribution at shift granularity",
  slug: slugify("Scrap attribution at shift granularity"),
  plant: "DE-ALD",
  lane: "transform",
  domain: "quality",
  createdOn: "2026-05-19",
  requester: "r@example.com",
};

describe("scaffold", () => {
  it("names the repo uc-yyyy-nnnn-slug", () => {
    expect(repoName(seed)).toBe("uc-2026-0041-scrap-attribution-at-shift");
  });

  it("scaffold files include README and a gatekeeper-free CODEOWNERS", () => {
    const files = buildScaffoldFiles(seed);
    const paths = files.map((f) => f.path);
    expect(paths).toContain("README.md");
    expect(paths).toContain(".github/CODEOWNERS");
    const co = files.find((f) => f.path === ".github/CODEOWNERS")!;
    expect(co.content).not.toMatch(/gatekeeper/i);
    const readme = files.find((f) => f.path === "README.md")!;
    expect(readme.content).toMatch(/## State/);
    expect(readme.content).toMatch(/Stage:\*\* S1/);
  });
});

describe("spec + mockup", () => {
  it("drafts a spec with success and kill criteria", () => {
    const spec = draftPocSpec(seed, "dashboard");
    expect(spec).toMatch(/## Success criteria/);
    expect(spec).toMatch(/## Kill criteria/);
    expect(spec).toMatch(/never merges/);
  });

  it("generates a self-contained HTML mockup (no external requests)", () => {
    const html = generateDashboardMockup(seed);
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain(seed.title);
    expect(html).not.toMatch(/https?:\/\/[^"']*\.(js|css)/); // no external assets
  });
});

describe("builder pipeline with LocalHost", () => {
  const host = new LocalHost({ root: mkdtempSync(join(tmpdir(), "poc-")) });

  it("scaffolds a repo, commits files, and drafts the spec", async () => {
    const plan = planPoc(seed, "dashboard");
    const result = await scaffoldRepo(host, seed, plan);
    expect(result.repo.local).toBe(true);
    expect(result.committedPaths).toContain("README.md");
    expect(result.committedPaths).toContain("poc/spec.md");
  });

  it("refuses to build the artifact until the spec is approved", async () => {
    const plan = planPoc(seed, "dashboard");
    const { repo } = await scaffoldRepo(host, seed, plan);
    await expect(buildArtifact(host, repo, seed, "dashboard", false)).rejects.toThrow(/approved/i);
  });

  it("builds the artifact and opens a PR once approved (never merges)", async () => {
    const plan = planPoc(seed, "dashboard");
    const { repo } = await scaffoldRepo(host, seed, plan);
    const art = await buildArtifact(host, repo, seed, "dashboard", true);
    expect(art.artifactPath).toBe("poc/mockup.html");
    expect(art.pullRequest.number).toBeGreaterThan(0);
    expect(art.artifact).toContain("<!doctype html>");
    // The GitHost interface has no merge method — assert it structurally.
    expect((host as unknown as Record<string, unknown>).merge).toBeUndefined();
  });
});

describe("host factory", () => {
  it("falls back to LocalHost without GitHub credentials", () => {
    expect(hasGitHubCredentials({})).toBe(false);
    expect(getGitHost({}).kind).toBe("local");
  });

  it("selects GitHubHost when credentials are present", () => {
    const env = {
      GITHUB_APP_ID: "1",
      GITHUB_APP_PRIVATE_KEY: "-----BEGIN KEY-----",
      GITHUB_APP_INSTALLATION_ID: "2",
      GITHUB_ORG: "acme",
    };
    expect(hasGitHubCredentials(env)).toBe(true);
    expect(getGitHost(env).kind).toBe("github");
  });
});
