#!/usr/bin/env node
/**
 * Populate the local MIRRORS of the portal's external content.
 *
 * The agent library (`du-agent-registry`) and the artefact templates
 * (`du-templates`) are not in this repository. With a GitHub App configured the
 * portal reads them live; without one it reads a mirror, and this is what fills it
 * — for local development, for CI, and for any environment that has no App.
 *
 * The mirrors live OUTSIDE the working tree by default (under the OS temp dir), so
 * a pull can never quietly re-create the bundled copy this arrangement removed.
 * Override with REGISTRY_MIRROR_DIR / TEMPLATES_MIRROR_DIR.
 *
 *   node scripts/content-pull.mjs            clone or fast-forward both
 *   node scripts/content-pull.mjs --check    report status, change nothing
 *
 * A missing repo is reported and does not fail the other one: losing templates
 * should not also cost you your governance.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { cp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ORG = process.env.GITHUB_ORG ?? "ops-digit-io";

const TARGETS = [
  {
    key: "registry",
    repo: process.env.REGISTRY_REPO ?? "du-agent-registry",
    dir: process.env.REGISTRY_MIRROR_DIR ?? path.join(os.tmpdir(), "du-agent-registry"),
    expect: ["playbooks", "skills", "contracts"],
    /** A local checkout to copy from instead of cloning — for sandboxes and CI caches. */
    localSource: process.env.REGISTRY_LOCAL_SOURCE,
  },
  {
    key: "templates",
    repo: process.env.TEMPLATES_REPO ?? "du-templates",
    dir: process.env.TEMPLATES_MIRROR_DIR ?? path.join(os.tmpdir(), "du-templates"),
    expect: ["sections", "advisory"],
    localSource: process.env.TEMPLATES_LOCAL_SOURCE,
  },
  {
    key: "specifications",
    repo: process.env.SPECIFICATIONS_REPO ?? "du-specifications",
    dir: process.env.SPECIFICATIONS_MIRROR_DIR ?? path.join(os.tmpdir(), "du-specifications"),
    // Specs are flat markdown at the repo root; the numbered spec is the anchor.
    expect: ["01-portal-spec.md"],
    localSource: process.env.SPECIFICATIONS_LOCAL_SOURCE,
  },
  {
    key: "organization",
    repo: process.env.ORGANIZATION_REPO ?? "du-organization-context",
    dir: process.env.ORGANIZATION_MIRROR_DIR ?? path.join(os.tmpdir(), "du-organization-context"),
    // Department OS: each department is a folder under departments/.
    expect: ["departments"],
    localSource: process.env.ORGANIZATION_LOCAL_SOURCE,
  },
];

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();

async function status(t) {
  if (!existsSync(t.dir)) return { ok: false, detail: "absent" };
  const ents = await readdir(t.dir).catch(() => []);
  const missing = t.expect.filter((d) => !ents.includes(d));
  return missing.length
    ? { ok: false, detail: `present but missing ${missing.join(", ")}` }
    : { ok: true, detail: `${ents.filter((e) => e !== ".git").length} entries` };
}

async function pull(t) {
  const url = `https://github.com/${ORG}/${t.repo}`;

  // A directory that is already a complete mirror but not a clone (populated by
  // hand, by CI, or by a previous localSource copy) is valid — leave it alone
  // rather than failing a clone into a non-empty path.
  if (!t.localSource && !existsSync(path.join(t.dir, ".git")) && (await status(t)).ok) {
    return { ok: true, how: "already mirrored (not a clone)" };
  }

  // A local checkout beats the network when one is offered — the sandbox and CI
  // both already have the repo on disk.
  if (t.localSource && existsSync(t.localSource)) {
    // Replace wholesale rather than merge: a stale entry left behind would be a
    // playbook the portal still resolves and nobody can find in the repo.
    rmSync(t.dir, { recursive: true, force: true });
    mkdirSync(t.dir, { recursive: true });
    await cp(t.localSource, t.dir, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git`) });
    return { ok: true, how: `copied from ${t.localSource}` };
  }

  try {
    if (existsSync(path.join(t.dir, ".git"))) {
      run("git", ["fetch", "--depth", "1", "origin"], t.dir);
      run("git", ["reset", "--hard", "origin/HEAD"], t.dir);
      return { ok: true, how: "fast-forwarded" };
    }
    mkdirSync(path.dirname(t.dir), { recursive: true });
    run("git", ["clone", "--depth", "1", url, t.dir]);
    return { ok: true, how: "cloned" };
  } catch (e) {
    const msg = String(e.stderr ?? e.message ?? e).split("\n").filter(Boolean).slice(-1)[0] ?? "failed";
    return { ok: false, how: msg.slice(0, 160) };
  }
}

const check = process.argv.includes("--check");
let failed = 0;

for (const t of TARGETS) {
  if (check) {
    const s = await status(t);
    console.log(`${s.ok ? "ok  " : "MISS"} ${t.key.padEnd(9)} ${t.dir} — ${s.detail}`);
    if (!s.ok) failed += 1;
    continue;
  }
  const r = await pull(t);
  const s = await status(t);
  console.log(`${r.ok && s.ok ? "ok  " : "FAIL"} ${t.key.padEnd(9)} ${t.dir} — ${r.how}${s.ok ? `, ${s.detail}` : ` (${s.detail})`}`);
  if (!r.ok || !s.ok) failed += 1;
}

if (failed) {
  console.error(
    `\n${failed} of ${TARGETS.length} could not be mirrored.\n` +
      `The portal runs without them, but every agent will report missing governance\n` +
      `and every section template will be empty. Check GITHUB_ORG and repo access.`,
  );
  process.exit(1);
}
