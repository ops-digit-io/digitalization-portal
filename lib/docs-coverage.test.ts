/**
 * The maps in `docs/` are true.
 *
 * "100 % coverage" is only a fact if something checks it, so this does two things:
 * it regenerates the generated maps and fails if they differ from what is committed
 * (so a new route or skill cannot land without the map moving), and it asserts every
 * route and page is actually named in them.
 *
 * The failure message is the fix: `node scripts/gen-docs.mjs`.
 */

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();

async function walk(dir: string, hit: (n: string) => boolean, out: string[] = []): Promise<string[]> {
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, hit, out);
    else if (hit(e.name)) out.push(p);
  }
  return out;
}

const routePath = (f: string) => "/" + relative(join(ROOT, "app"), f).replace(/\/route\.ts$/, "");
/** Mirrors the generator: strip the filename first, THEN relativise — otherwise
 *  the root page (`app/page.tsx`) comes out as "/page.tsx" instead of "/". */
const pagePath = (f: string) => {
  const rel = relative(join(ROOT, "app"), f.replace(/\/page\.tsx$/, ""));
  return rel === "" ? "/" : `/${rel}`;
};

describe("the generated maps are current", () => {
  it("regenerating produces no change — otherwise the map has drifted from the code", () => {
    // Throws (exit 1) and prints which file is stale.
    expect(() => execFileSync("node", ["scripts/gen-docs.mjs", "--check"], { cwd: ROOT })).not.toThrow();
  });
});

describe("every surface is on a map", () => {
  it("every API route appears in docs/api-map.md", async () => {
    const md = await readFile(join(ROOT, "docs", "api-map.md"), "utf8");
    const files = await walk(join(ROOT, "app", "api"), (n) => n === "route.ts");
    expect(files.length).toBeGreaterThan(40); // the walk found something real
    const missing = files.map(routePath).filter((p) => !md.includes(`\`${p}\``));
    expect(missing).toEqual([]);
  });

  it("every page appears in docs/pages.md", async () => {
    const md = await readFile(join(ROOT, "docs", "pages.md"), "utf8");
    const files = (await walk(join(ROOT, "app"), (n) => n === "page.tsx")).filter(
      (f) => !relative(ROOT, f).includes("app/api/"),
    );
    expect(files.length).toBeGreaterThan(30);
    const missing = files.map(pagePath).filter((p) => !md.includes(`\`${p}\``));
    expect(missing).toEqual([]);
  });

  it("every playbook, skill and contract appears in docs/governance.md", async () => {
    const md = await readFile(join(ROOT, "docs", "governance.md"), "utf8");
    const playbooks = (await readdir(join(ROOT, "playbooks")))
      .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
      .map((f) => f.replace(/\.md$/, ""));
    const skills = (await readdir(join(ROOT, "skills"), { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const contracts = (await readdir(join(ROOT, "contracts")))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));

    const missing = [...playbooks, ...skills, ...contracts].filter((n) => !md.includes(n));
    expect(missing).toEqual([]);
  });

  it("the hand-written map names every journey the portal actually runs", async () => {
    const md = await readFile(join(ROOT, "docs", "MAP.md"), "utf8");
    // These are the integrations this map exists to make legible. A new one that
    // never reaches MAP.md is exactly the drift the file is meant to prevent.
    for (const anchor of [
      "/api/process/*",
      "/api/champions",
      "/api/requirements",
      "champions-analysis",
      "demand-splitting",
      "persona",
    ]) {
      expect(md, `MAP.md does not mention ${anchor}`).toContain(anchor);
    }
    // Every diagram must be a mermaid block; a prose "diagram" is not a map.
    expect((md.match(/```mermaid/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
