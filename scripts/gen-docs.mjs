#!/usr/bin/env node
/**
 * Generate the portal's reference maps from the source tree.
 *
 * The maps are GENERATED rather than written because a hand-maintained map is
 * wrong within a fortnight and, being wrong, is worse than none — a reader trusts
 * a diagram. `docs-coverage.test.ts` regenerates and compares, so the suite goes
 * red the moment a route, page, playbook or skill lands without the map moving.
 *
 *   node scripts/gen-docs.mjs           write the files
 *   node scripts/gen-docs.mjs --check   exit 1 if they are stale
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DOCS = join(ROOT, "docs");
/** The agent library is not in this repo — it is mirrored from du-agent-registry. */
const REGISTRY = process.env.REGISTRY_MIRROR_DIR ?? join(tmpdir(), "du-agent-registry");
/** The artefact templates are not in this repo either. */
const TEMPLATES = process.env.TEMPLATES_MIRROR_DIR ?? join(tmpdir(), "du-templates");

// ── discovery ─────────────────────────────────────────────────────────────────

async function walk(dir, hit, out = []) {
  const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, hit, out);
    else if (hit(e.name)) out.push(p);
  }
  return out;
}

/** Every API route, as its URL path plus the HTTP verbs it exports. */
async function apiRoutes() {
  const files = await walk(join(ROOT, "app", "api"), (n) => n === "route.ts");
  const rows = [];
  for (const f of files.sort()) {
    const src = await readFile(f, "utf8");
    const verbs = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((v) =>
      new RegExp(`export async function ${v}\\b`).test(src),
    );
    const path = "/" + relative(join(ROOT, "app"), f).replace(/\/route\.ts$/, "").replace(/\\/g, "/");
    rows.push({ path, verbs, file: relative(ROOT, f) });
  }
  return rows;
}

/** Every page, as its route plus the /api paths its source references. */
async function pages() {
  const files = await walk(join(ROOT, "app"), (n) => n === "page.tsx");
  const rows = [];
  for (const f of files.sort()) {
    if (relative(ROOT, f).includes("app/api/")) continue;
    const dir = f.replace(/\/page\.tsx$/, "");
    // A page's own client components live beside it; their fetches are the page's.
    const siblings = (await readdir(dir).catch(() => [])).filter((n) => n.endsWith(".tsx"));
    let src = "";
    for (const s of siblings) src += await readFile(join(dir, s), "utf8").catch(() => "");
    const calls = [...new Set([...src.matchAll(/["'`](\/api\/[a-zA-Z0-9/_\-[\]$.{}]*)/g)].map((m) => m[1]))]
      .map((c) => c.replace(/\$\{[^}]*\}/g, ":param").replace(/\/$/, ""))
      .filter((c) => c !== "/api")
      .sort();
    const route = "/" + relative(join(ROOT, "app"), dir).replace(/\\/g, "/");
    rows.push({ route: route === "/." ? "/" : route, calls });
  }
  return rows;
}

const meta = (src) => {
  const m = /^---\n([\s\S]*?)\n---/.exec(src);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const v = kv[2].trim();
    out[kv[1]] = v.startsWith("[")
      ? v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean)
      : v.replace(/^["']|["']$/g, "");
  }
  return out;
};

/** The governance graph: playbooks → skills → skills, and the contracts. */
async function governance() {
  const missing = () => {
    throw new Error(`no registry mirror at ${REGISTRY} — run: npm run content:pull`);
  };
  const pbFiles = (await readdir(join(REGISTRY, "playbooks")).catch(missing)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md",
  );
  const playbooks = [];
  for (const f of pbFiles.sort()) {
    const m = meta(await readFile(join(REGISTRY, "playbooks", f), "utf8"));
    playbooks.push({ name: f.replace(/\.md$/, ""), skills: m.skills ?? [], declared: Boolean(m.name) });
  }
  const skillDirs = (await readdir(join(REGISTRY, "skills"), { withFileTypes: true }).catch(missing))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const skills = [];
  for (const name of skillDirs.sort()) {
    const src = await readFile(join(REGISTRY, "skills", name, "SKILL.md"), "utf8").catch(() => "");
    const m = meta(src);
    skills.push({ name, skills: m.skills ?? [], description: m.description ?? "" });
  }
  const contracts = (await readdir(join(REGISTRY, "contracts")).catch(() => []))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
  const templates = [];
  for (const kind of ["sections", "advisory", "misc"]) {
    for (const f of (await readdir(join(TEMPLATES, kind)).catch(() => [])).sort()) {
      if (f.endsWith(".md")) templates.push(`${kind}/${f.replace(/\.md$/, "")}`);
    }
  }
  return { playbooks, skills, contracts, templates };
}

// ── rendering ─────────────────────────────────────────────────────────────────

const HEAD = "<!-- GENERATED by scripts/gen-docs.mjs — do not edit by hand. Run `node scripts/gen-docs.mjs`. -->";

/** Mermaid ids must be alphanumeric; keep the mapping stable and readable. */
const id = (s) => s.replace(/[^a-zA-Z0-9]/g, "_");

function groupOf(path) {
  const seg = path.split("/")[2] ?? "root";
  return seg;
}

function renderApiMap(routes) {
  const groups = new Map();
  for (const r of routes) {
    const g = groupOf(r.path);
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }

  const lines = [
    HEAD,
    "",
    "# API map",
    "",
    `Every HTTP endpoint the portal exposes: **${routes.length} routes**, grouped by area.`,
    "Generated from `app/api/**/route.ts`, so it cannot drift from the code.",
    "",
    "```mermaid",
    "graph LR",
  ];
  for (const [g, rs] of [...groups.entries()].sort()) {
    lines.push(`  subgraph ${id(g)}["/api/${g}"]`);
    for (const r of rs) {
      const label = r.path.replace(`/api/${g}`, "") || "/";
      lines.push(`    ${id(r.path)}["${label}<br/><i>${r.verbs.join(" ")}</i>"]`);
    }
    lines.push("  end");
  }
  lines.push("```", "");

  lines.push("| Route | Methods | Source |", "|---|---|---|");
  for (const r of routes) lines.push(`| \`${r.path}\` | ${r.verbs.join(", ") || "—"} | \`${r.file}\` |`);
  lines.push("");
  return lines.join("\n");
}

function renderPages(rows) {
  const lines = [
    HEAD,
    "",
    "# Pages and the endpoints they call",
    "",
    `**${rows.length} pages.** Each row lists the \`/api\` paths referenced by the page and the client`,
    "components beside it. A page with no calls renders from a server component and reads its",
    "data directly through `lib/` — which is the portal's default, not an omission.",
    "",
    "```mermaid",
    "graph LR",
  ];
  for (const p of rows) {
    lines.push(`  ${id(p.route)}(["${p.route}"])`);
    for (const c of p.calls) lines.push(`  ${id(p.route)} --> ${id(c)}["${c}"]`);
  }
  lines.push("```", "");
  lines.push("| Page | Calls |", "|---|---|");
  for (const p of rows) lines.push(`| \`${p.route}\` | ${p.calls.length ? p.calls.map((c) => `\`${c}\``).join("<br/>") : "_server-rendered_"} |`);
  lines.push("");
  return lines.join("\n");
}

function renderGovernance(g) {
  const lines = [
    HEAD,
    "",
    "# Governance graph",
    "",
    `**${g.playbooks.length} playbooks · ${g.skills.length} skills · ${g.contracts.length} contracts** —`,
    "all in `du-agent-registry`, none in this repository.",
    "",
    "A playbook composes skills, and a skill may compose skills of its own — resolved",
    "transitively by `lib/agent/compose.ts`, which reports anything missing and terminates",
    "on a cycle. This is what lets the platform grow by adding a file and naming it.",
    "",
    "## Playbooks that compose skills",
    "",
    "```mermaid",
    "graph LR",
  ];
  for (const p of g.playbooks.filter((x) => x.skills.length)) {
    lines.push(`  PB_${id(p.name)}["📘 ${p.name}"]`);
    for (const s of p.skills) lines.push(`  PB_${id(p.name)} --> SK_${id(s)}["🔧 ${s}"]`);
  }
  for (const s of g.skills.filter((x) => x.skills.length)) {
    for (const child of s.skills) lines.push(`  SK_${id(s.name)} --> SK_${id(child)}["🔧 ${child}"]`);
  }
  lines.push("```", "");

  const plain = g.playbooks.filter((x) => !x.skills.length);
  lines.push(
    "## Playbooks with no skills",
    "",
    "Single-purpose prompts — the fourteen ported section coaches, the four advisory passes,",
    "and the agent framings. They are guidance in themselves and compose nothing.",
    "",
    plain.map((p) => `\`${p.name}\``).join(" · "),
    "",
    "## Skills",
    "",
    "| Skill | Composes | Purpose |",
    "|---|---|---|",
  );
  for (const s of g.skills) {
    lines.push(`| \`${s.name}\` | ${s.skills.map((x) => `\`${x}\``).join(", ") || "—"} | ${s.description.slice(0, 120)} |`);
  }
  lines.push("", "## Contracts", "", g.contracts.map((c) => `\`${c}\``).join(" · "), "");
  lines.push(
    "",
    "## Templates",
    "",
    `From \`du-templates\` — **${g.templates.length}** artefact templates, also outside this repository.`,
    "",
    g.templates.map((t) => `\`${t}\``).join(" · "),
    "",
  );
  return lines.join("\n");
}

// ── main ──────────────────────────────────────────────────────────────────────

const files = {
  "api-map.md": renderApiMap(await apiRoutes()),
  "pages.md": renderPages(await pages()),
  "governance.md": renderGovernance(await governance()),
};

const check = process.argv.includes("--check");
let stale = [];
for (const [name, body] of Object.entries(files)) {
  const path = join(DOCS, name);
  const current = await readFile(path, "utf8").catch(() => null);
  if (current === body) continue;
  if (check) stale.push(name);
  else await writeFile(path, body);
}

if (check && stale.length) {
  console.error(`stale docs: ${stale.join(", ")} — run: node scripts/gen-docs.mjs`);
  process.exit(1);
}
if (!check) console.log(`wrote ${Object.keys(files).length} maps to docs/`);
