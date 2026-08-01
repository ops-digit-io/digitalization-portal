/**
 * The LIVE library, checked as a graph.
 *
 * `compose.test.ts` proves the resolver behaves; this proves the files it will
 * actually resolve are sound. It is the test that keeps composition trustworthy as
 * the library grows: the moment somebody names a skill that does not exist, or two
 * skills reference each other, the suite goes red instead of an agent quietly
 * running on partial governance in production.
 *
 * The library is NOT in this repository — it is `du-agent-registry`, mirrored
 * locally by `npm run content:pull`. These tests read the mirror, so they check
 * the REAL files whenever one is present (local dev, and any CI that seeds it).
 *
 * When there is NO mirror the suite skips — VISIBLY, with a warning — rather than
 * failing. This is not the "silently skip an integrity check" trap the earlier
 * fail-loud guarded against: the content simply does not live in this repository
 * any more, so this repo's CI genuinely has nothing to check. The integrity of
 * the library is owned where the library lives (its own repo, or a mirror-seeded
 * run here); a hard failure here only means "the app repo can't reach another
 * repo's files", which is not a defect in the app.
 */

import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPlaybook, loadSkill } from "./skills";

import { registryRepo } from "../content-repo";
import { hasRegistryMirror, warnNoMirror } from "../testing/mirror";

const ROOT = registryRepo().mirrorDir;
const FIX = `no registry mirror at ${ROOT} — run: npm run content:pull`;

warnNoMirror("library-integrity");

async function playbookFiles(): Promise<string[]> {
  const files = await readdir(join(ROOT, "playbooks")).catch(() => {
    throw new Error(FIX);
  });
  return files.filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
}
async function skillDirs(): Promise<string[]> {
  const ents = await readdir(join(ROOT, "skills"), { withFileTypes: true }).catch(() => {
    throw new Error(FIX);
  });
  return ents.filter((e) => e.isDirectory()).map((e) => e.name);
}
const readSkill = (name: string) => readFile(join(ROOT, "skills", name, "SKILL.md"), "utf8");

describe.skipIf(!hasRegistryMirror)("the shipped library resolves", () => {
  it("every skill a playbook names exists on disk", async () => {
    const available = new Set(await skillDirs());
    const broken: string[] = [];
    for (const file of await playbookFiles()) {
      const pb = loadPlaybook(await readFile(join(ROOT, "playbooks", file), "utf8"), file);
      for (const s of pb.skills) if (!available.has(s)) broken.push(`${file} → ${s}`);
    }
    expect(broken).toEqual([]);
  });

  it("every skill a SKILL composes exists on disk", async () => {
    const dirs = await skillDirs();
    const available = new Set(dirs);
    const broken: string[] = [];
    for (const name of dirs) {
      const sk = loadSkill(await readSkill(name), name);
      for (const child of sk.skills) if (!available.has(child)) broken.push(`${name} → ${child}`);
    }
    expect(broken).toEqual([]);
  });

  it("the skill graph is acyclic — a cycle would be a prompt that never terminates", async () => {
    const dirs = await skillDirs();
    const edges = new Map<string, string[]>();
    for (const name of dirs) edges.set(name, loadSkill(await readSkill(name), name).skills);

    const cycles: string[][] = [];
    const state = new Map<string, "open" | "done">();
    const walk = (name: string, chain: string[]): void => {
      if (state.get(name) === "done") return;
      if (chain.includes(name)) {
        cycles.push([...chain, name]);
        return;
      }
      for (const child of edges.get(name) ?? []) walk(child, [...chain, name]);
      state.set(name, "done");
    };
    for (const name of dirs) walk(name, []);
    expect(cycles).toEqual([]);
  });

  it("a DECLARED name matches its file — a wrong one is worse than none", async () => {
    // Resolution is by FILENAME (`loadGoverning("playbook", name)`), so a declared
    // name is documentation. Absent is fine: the fourteen `process-section-*` and
    // four `process-advisory-*` prompts are verbatim ports of the source tool's
    // coaching prompts and carry no frontmatter by design — adding any would break
    // the byte-identical property that makes the port checkable. A name that is
    // present and WRONG is the real hazard, because it is what a reader trusts.
    const mismatched: string[] = [];
    for (const file of await playbookFiles()) {
      const pb = loadPlaybook(await readFile(join(ROOT, "playbooks", file), "utf8"), "");
      if (pb.name !== "" && pb.name !== file.replace(/\.md$/, "")) mismatched.push(`playbooks/${file} declares "${pb.name}"`);
    }
    for (const name of await skillDirs()) {
      const sk = loadSkill(await readSkill(name), "");
      if (sk.name !== "" && sk.name !== name) mismatched.push(`skills/${name} declares "${sk.name}"`);
    }
    expect(mismatched).toEqual([]);
  });

  it("every skill declares a name — a skill is referenced BY name, so it needs one", async () => {
    const nameless: string[] = [];
    for (const name of await skillDirs()) {
      if (loadSkill(await readSkill(name), "").name === "") nameless.push(name);
    }
    expect(nameless).toEqual([]);
  });

  it("every agent's playbook and contract are present, with their skills", async () => {
    // The agents wired into code. A rename that misses one of these is exactly the
    // failure this file exists to catch.
    const agents: { playbook: string; contract?: string }[] = [
      { playbook: "champions-analysis", contract: "champions" },
      { playbook: "persona-analysis", contract: "persona" },
      { playbook: "persona-library-analysis" },
      { playbook: "process-analysis" },
      { playbook: "requirements-analysis", contract: "requirements" },
      { playbook: "business-case", contract: "business-case" },
    ];
    const playbooks = new Set((await playbookFiles()).map((f) => f.replace(/\.md$/, "")));
    const contracts = new Set(
      (await readdir(join(ROOT, "contracts"))).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")),
    );
    const missing: string[] = [];
    for (const a of agents) {
      if (!playbooks.has(a.playbook)) missing.push(`playbook ${a.playbook}`);
      if (a.contract && !contracts.has(a.contract)) missing.push(`contract ${a.contract}`);
    }
    expect(missing).toEqual([]);
  });

  it("composition is actually used — at least one skill composes another", async () => {
    // The feature this library was restructured for. If this drops to zero,
    // somebody has flattened the graph back out by hand.
    const dirs = await skillDirs();
    let composing = 0;
    for (const name of dirs) if (loadSkill(await readSkill(name), name).skills.length > 0) composing += 1;
    expect(composing).toBeGreaterThan(0);
  });
});
