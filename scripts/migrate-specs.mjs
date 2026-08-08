#!/usr/bin/env node
/**
 * One-time migration: copy the portal's specification documents into a checkout of
 * `du-specifications`, so the externalized `/docs` reader has content to serve.
 *
 * The specs were removed from THIS repo (they live externally now), but they are
 * preserved in git history — this script sources them from there, so it works
 * whether run before or after the removal has landed. It NEVER commits or pushes;
 * you review and push the target checkout yourself.
 *
 *   node scripts/migrate-specs.mjs --to /path/to/du-specifications [--ref <git-ref>]
 *
 * The spec set is "everything under docs/ EXCEPT the machinery kept in this repo":
 * the generated maps (api-map, pages, governance), the hand-map (MAP.md), and the
 * operational how-to-run docs (BUILD, DEPLOYMENT, SETUP-github-app, SETUP-
 * specifications, VIDEO). Files are flattened to the target root as the /docs
 * reader expects flat markdown.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const args = process.argv.slice(2);
const to = valueOf("--to");
const refArg = valueOf("--ref");
if (!to) {
  console.error("usage: node scripts/migrate-specs.mjs --to <du-specifications checkout> [--ref <git-ref>]");
  process.exit(2);
}

/** Files under docs/ that STAY in the app repo (machinery, not method). */
const KEEP = new Set([
  "docs/MAP.md", "docs/api-map.md", "docs/pages.md", "docs/governance.md",
  "docs/BUILD.md", "docs/DEPLOYMENT.md", "docs/SETUP-github-app.md",
  "docs/SETUP-specifications.md", "docs/VIDEO.md", "docs/README.md",
]);

// Resolve the ref that still has the specs: the working HEAD if it carries them,
// else the commit before they were removed.
const anchor = "docs/01-portal-spec.md";
const inHead = git(["cat-file", "-e", `HEAD:${anchor}`], true) !== null;
const ref = refArg ?? (inHead ? "HEAD" : `${git(["rev-list", "-1", "HEAD", "--", anchor]).trim()}^`);

const tree = git(["ls-tree", "-r", "--name-only", ref, "docs/"]).trim().split("\n").filter(Boolean);
const specs = tree.filter((p) => p.endsWith(".md") && !KEEP.has(p));
if (specs.length === 0) {
  console.error(`no spec files found under docs/ at ${ref} — is the ref correct?`);
  process.exit(1);
}

mkdirSync(to, { recursive: true });
for (const p of specs) {
  const content = git(["show", `${ref}:${p}`]);
  writeFileSync(join(to, basename(p)), content);
  console.log(`  ${p}  →  ${basename(p)}`);
}
console.log(`\n${specs.length} specification files written to ${to} (from ${ref}).`);
console.log("Review, then: git -C " + to + " add -A && git -C " + to + ' commit -m "Import portal specifications" && git -C ' + to + " push");

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
function git(a, soft = false) {
  try {
    return execFileSync("git", a, { encoding: "utf8" });
  } catch (e) {
    if (soft) return null;
    throw e;
  }
}
