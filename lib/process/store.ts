/**
 * Process-funnel engagements on disk. No database — ported from PDT's
 * `store.js`. The artefacts ARE the product: a markdown file per section, which
 * diffs, greps, and survives this application.
 *
 * This mirrors the portal's own local-first persistence pattern (`.poc-workspace`,
 * `.pending-demands`): a working directory under the repo root, overridable with
 * `PROCESS_DATA_DIR`. Server-only (`fs`).
 *
 * Layout:
 *   <root>/<slug>/meta.json          title, owner, unit, timestamps, gate verdicts
 *   <root>/<slug>/<nn-section>.md    the artefacts
 *   <root>/<slug>/history/…          previous versions, timestamped
 */

import fs from "node:fs";
import path from "node:path";
import { SECTIONS, byKey } from "./sections";

export const ROOT = process.env.PROCESS_DATA_DIR || path.join(process.cwd(), ".process-workspace");

export interface EngagementMeta {
  slug: string;
  title: string;
  owner: string;
  unit: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  gates: Record<string, { passed: boolean; reason: string; at: string }>;
}

export function ensureRoot(): void {
  fs.mkdirSync(ROOT, { recursive: true });
}

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Refuses anything that could escape the data root. */
function dir(slug: string): string {
  const clean = slugify(slug);
  if (!clean) throw new Error("invalid slug");
  const p = path.join(ROOT, clean);
  if (!p.startsWith(ROOT + path.sep)) throw new Error("path escape");
  return p;
}

export function meta(slug: string): EngagementMeta {
  const p = path.join(dir(slug), "meta.json");
  const m = JSON.parse(fs.readFileSync(p, "utf8")) as EngagementMeta;
  m.slug = slugify(slug);
  return m;
}

export function list(): EngagementMeta[] {
  ensureRoot();
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => {
      try {
        return meta(d.name);
      } catch {
        return null;
      }
    })
    .filter((m): m is EngagementMeta => m !== null)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function exists(slug: string): boolean {
  try {
    return fs.existsSync(path.join(dir(slug), "meta.json"));
  } catch {
    return false;
  }
}

export function create(input: { title: string; owner?: string; unit?: string; note?: string }, now: string): EngagementMeta {
  ensureRoot();
  const slug = slugify(input.title);
  if (!slug) throw new Error("title yields empty slug");
  const d = dir(slug);
  if (fs.existsSync(d)) throw new Error("engagement already exists");
  fs.mkdirSync(path.join(d, "history"), { recursive: true });
  const m: EngagementMeta = {
    slug,
    title: String(input.title).trim(),
    owner: String(input.owner || "").trim(),
    unit: String(input.unit || "").trim(),
    note: String(input.note || "").trim(),
    createdAt: now,
    updatedAt: now,
    gates: {},
  };
  fs.writeFileSync(path.join(d, "meta.json"), JSON.stringify(m, null, 2));
  return m;
}

export function writeMeta(slug: string, patch: Partial<EngagementMeta>, now: string): EngagementMeta {
  const m = meta(slug);
  Object.assign(m, patch, { updatedAt: now });
  fs.writeFileSync(path.join(dir(slug), "meta.json"), JSON.stringify(m, null, 2));
  return m;
}

export function artefactPath(slug: string, sectionKey: string): string {
  const s = byKey[sectionKey];
  if (!s) throw new Error(`unknown section ${sectionKey}`);
  return path.join(dir(slug), s.file);
}

export function read(slug: string, sectionKey: string): string {
  const p = artefactPath(slug, sectionKey);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/** Keeps the previous version; overwriting an assessment without a trail is how
 *  findings quietly change after the fact. */
export function write(slug: string, sectionKey: string, content: string, now: string): { changed: boolean } {
  const p = artefactPath(slug, sectionKey);
  if (fs.existsSync(p)) {
    const prev = fs.readFileSync(p, "utf8");
    if (prev === content) return { changed: false };
    const stamp = String(now).replace(/[:.]/g, "-");
    fs.mkdirSync(path.join(dir(slug), "history"), { recursive: true });
    fs.writeFileSync(path.join(dir(slug), "history", `${sectionKey}.${stamp}.md`), prev);
  }
  fs.writeFileSync(p, content);
  writeMeta(slug, {}, now);
  return { changed: true };
}

export function setGate(slug: string, sectionKey: string, passed: boolean, reason: string, now: string): EngagementMeta {
  const m = meta(slug);
  m.gates = m.gates || {};
  m.gates[sectionKey] = { passed: !!passed, reason: String(reason || ""), at: now };
  return writeMeta(slug, { gates: m.gates }, now);
}

export interface SectionState {
  key: string;
  label: string;
  group: string;
  order: number;
  gate: boolean;
  blocking: string[];
  filled: boolean;
  chars: number;
  gateResult: { passed: boolean; reason: string; at: string } | null;
  score?: unknown;
  locked?: boolean;
}

/** Everything the overview needs, in one read. */
export function state(slug: string): { meta: EngagementMeta; sections: SectionState[] } {
  const m = meta(slug);
  const sections: SectionState[] = SECTIONS.map((s) => {
    const content = read(slug, s.key);
    return {
      key: s.key,
      label: s.label,
      group: s.group,
      order: s.order,
      gate: s.gate,
      blocking: s.blocking,
      filled: content.trim().length > 0,
      chars: content.length,
      gateResult: (m.gates || {})[s.key] || null,
    };
  });
  return { meta: m, sections };
}

/**
 * Removes an engagement by moving it aside, not deleting it. An assessment is
 * somebody's afternoon with a plant manager; a mis-click must not spend that twice.
 */
export function remove(slug: string, now: string): { removed: string; recoverableAt: string } {
  const src = dir(slug);
  if (!fs.existsSync(src)) throw new Error("no such engagement");
  const graveyard = path.join(ROOT, "_deleted");
  fs.mkdirSync(graveyard, { recursive: true });
  const stamp = String(now).replace(/[:.]/g, "-");
  const dest = path.join(graveyard, `${slugify(slug)}.${stamp}`);
  fs.renameSync(src, dest);
  return { removed: slugify(slug), recoverableAt: dest };
}

export function history(slug: string, sectionKey: string): string[] {
  const d = path.join(dir(slug), "history");
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.startsWith(`${sectionKey}.`))
    .sort()
    .reverse();
}
