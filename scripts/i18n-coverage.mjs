#!/usr/bin/env node
/**
 * i18n coverage scan — the objective measure of "100% of the tools are translated".
 *
 * It walks `app/**` and `components/**` and flags likely USER-FACING English string
 * literals that are NOT wrapped in a translator (`t(...)` / `getT`): JSX text nodes,
 * and the `placeholder` / `title` / `aria-label` string props. It is a heuristic — it
 * deliberately errs toward flagging, and an allowlist covers the known non-UI files and
 * the `/process` copy-layer shim. The number it prints must strictly DECREASE as pages
 * are translated; once it reaches zero, wire it into CI to fail on any new offender.
 *
 * Usage:  node scripts/i18n-coverage.mjs [--list]
 *   --list  print each offender (file:line: text); otherwise just the per-area counts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components"];

// Files with no user-facing English, or that translate through another system.
const ALLOW_FILES = [
  /components\/ui\//,             // primitives — text comes from children/props
  /components\/process\//,        // localized via the C.pc(locale) copy layer
  /app\/process\//,               // localized via the C.pc(locale) copy layer
  /components\/portal\/telemetry/,
  /components\/portal\/md-components/,
  /components\/portal\/markdown-page/,
  /\.test\./,
];

// A JSX text node or string-prop value that is "just English words" (has a letter,
// isn't obviously a token/className/url), and isn't already a {t(...)} expression.
const TEXT_NODE = />\s*([A-Z][A-Za-z][^<>{}\n]{2,})</g;                 // >Some English<
const STR_PROP = /\b(?:placeholder|title|aria-label)=\{?"([A-Z][A-Za-z][^"\n]{2,})"/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function looksLikeToken(s) {
  // Skip CSS-ish, single-word ALLCAPS constants, urls, and pure punctuation runs.
  if (/^https?:/.test(s)) return true;
  if (/^[A-Z0-9_]+$/.test(s.trim())) return true;
  if (!/[a-z]/.test(s)) return true; // no lowercase letter → not prose
  return false;
}

const offenders = [];
for (const d of DIRS) {
  for (const file of walk(join(ROOT, d))) {
    const rel = relative(ROOT, file);
    if (ALLOW_FILES.some((re) => re.test(rel))) continue;
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const re of [TEXT_NODE, STR_PROP]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line))) {
          const text = m[1].trim();
          if (looksLikeToken(text)) continue;
          offenders.push({ file: rel, line: i + 1, text });
        }
      }
    });
  }
}

const byArea = {};
for (const o of offenders) {
  const area = o.file.split("/").slice(0, 2).join("/");
  byArea[area] = (byArea[area] ?? 0) + 1;
}

if (process.argv.includes("--list")) {
  for (const o of offenders) console.log(`${o.file}:${o.line}: ${o.text}`);
}
console.log("\ni18n coverage — remaining untranslated UI literals (heuristic):");
for (const [area, n] of Object.entries(byArea).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${area}`);
}
console.log(`  ${String(offenders.length).padStart(4)}  TOTAL`);
