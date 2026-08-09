/**
 * The repo registry — every repository name settable from one env var, resolved in
 * one place. These tests pin the resolution order (env → fallback → default), the
 * shared-repo fallbacks (champions/personas/templatesConfig → PROCESS_REPO), the
 * GITHUB_ORG owner, and the PoC template-repo prefix override.
 */

import { describe, it, expect } from "vitest";
import { repoName, repoRef, githubOrg, templateRepoName, repoConfig, REPO_DEFS } from "./repos.js";

describe("repoName", () => {
  it("returns the default when nothing is set", () => {
    expect(repoName("demands", {})).toBe("du-demands");
    expect(repoName("organization", {})).toBe("du-organization-context");
    expect(repoName("processes", {})).toBe("du-processes");
  });

  it("honours the primary env override", () => {
    expect(repoName("demands", { DEMANDS_REPO: "acme-demands" })).toBe("acme-demands");
    expect(repoName("registry", { REGISTRY_REPO: " acme-lib " })).toBe("acme-lib"); // trimmed
  });

  it("falls back to the shared PROCESS_REPO for champions/personas/templatesConfig", () => {
    expect(repoName("champions", { PROCESS_REPO: "acme-processes" })).toBe("acme-processes");
    expect(repoName("personas", { PROCESS_REPO: "acme-processes" })).toBe("acme-processes");
    expect(repoName("templatesConfig", { PROCESS_REPO: "acme-processes" })).toBe("acme-processes");
  });

  it("prefers the specific var over the shared fallback", () => {
    expect(repoName("champions", { PROCESS_REPO: "shared", CHAMPION_REPO: "just-champions" })).toBe("just-champions");
  });

  it("ignores a blank override", () => {
    expect(repoName("demands", { DEMANDS_REPO: "   " })).toBe("du-demands");
  });
});

describe("repoRef & githubOrg", () => {
  it("builds a ref with the org owner and configured name", () => {
    const ref = repoRef("demands", { GITHUB_ORG: "acme", DEMANDS_REPO: "acme-demands" });
    expect(ref).toEqual({ owner: "acme", name: "acme-demands", url: "https://github.com/acme/acme-demands", local: false });
  });
  it("defaults the org to 'org'", () => {
    expect(githubOrg({})).toBe("org");
    expect(repoRef("registry", {}).owner).toBe("org");
  });
});

describe("templateRepoName", () => {
  it("keeps the authored name when no prefix is set", () => {
    expect(templateRepoName("du-template-streamlit", {})).toBe("du-template-streamlit");
  });
  it("swaps the du-template- prefix when POC_TEMPLATE_REPO_PREFIX is set", () => {
    expect(templateRepoName("du-template-streamlit", { POC_TEMPLATE_REPO_PREFIX: "acme-tpl-" })).toBe("acme-tpl-streamlit");
  });
});

describe("repoConfig", () => {
  it("lists every repo with its env var and whether it is overridden", () => {
    const cfg = repoConfig({ DEMANDS_REPO: "acme-demands" });
    expect(cfg).toHaveLength(REPO_DEFS.length);
    const demands = cfg.find((c) => c.key === "demands")!;
    expect(demands).toMatchObject({ env: "DEMANDS_REPO", name: "acme-demands", overridden: true });
    expect(cfg.find((c) => c.key === "registry")!.overridden).toBe(false);
  });
});
