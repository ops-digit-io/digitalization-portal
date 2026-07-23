/**
 * Seed the registry from the portal's bundled skills & playbooks.
 *
 * The portal ships a canonical set of skills and playbooks in `skills/` and
 * `playbooks/`. When the registry repo (`du-agent-registry`) was created before a
 * skill/playbook existed, the live app can't find it there — so the agents fall
 * back to the bundled copy, but the entry isn't visible or editable in the
 * registry. This pushes the bundle INTO the registry so every skill and playbook
 * is present in git, catalogued, and hot-editable.
 *
 * It writes through `saveEntry`, which commits to `du-agent-registry`'s `main`
 * directly (the registry is not a gated use-case repo — no PR, no merge, so
 * constraint #1 is untouched). By default it ADDS missing entries only and skips
 * ones already in the registry, so it never clobbers an edit made there; pass
 * `overwrite` to force every bundled entry.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readEntryFile, saveEntry, type EntryType, type RegistryFile } from "./registry-store.js";

const SKILLS_DIR = "skills";
const PLAYBOOKS_DIR = "playbooks";

export interface BundledEntry {
  type: EntryType;
  name: string;
  bundle: boolean;
  files: RegistryFile[];
}

/** All file paths (relative to `base`) under `dir`, recursively. */
async function walk(base: string, dir: string, acc: string[] = []): Promise<string[]> {
  const ents = await readdir(join(base, dir), { withFileTypes: true }).catch(() => []);
  for (const e of ents) {
    const rel = join(dir, e.name);
    if (e.isDirectory()) await walk(base, rel, acc);
    else acc.push(rel);
  }
  return acc;
}

async function bundledPlaybooks(root: string): Promise<BundledEntry[]> {
  const dir = join(root, PLAYBOOKS_DIR);
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
  const out: BundledEntry[] = [];
  for (const file of files.sort()) {
    const content = await readFile(join(dir, file), "utf8");
    out.push({ type: "playbook", name: file.replace(/\.md$/, ""), bundle: false, files: [{ path: file, content }] });
  }
  return out;
}

async function bundledSkills(root: string): Promise<BundledEntry[]> {
  const ents = await readdir(join(root, SKILLS_DIR), { withFileTypes: true }).catch(() => []);
  const out: BundledEntry[] = [];
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.toLowerCase() === "readme.md") continue;
    if (e.isDirectory()) {
      const rels = await walk(join(root, SKILLS_DIR), e.name);
      const files: RegistryFile[] = [];
      for (const rel of rels.sort()) {
        const content = await readFile(join(root, SKILLS_DIR, rel), "utf8");
        files.push({ path: rel.slice(e.name.length + 1), content }); // entry-relative path
      }
      if (files.length) out.push({ type: "skill", name: e.name, bundle: true, files });
    } else if (e.name.endsWith(".md")) {
      const content = await readFile(join(root, SKILLS_DIR, e.name), "utf8");
      out.push({ type: "skill", name: e.name.replace(/\.md$/, ""), bundle: false, files: [{ path: e.name, content }] });
    }
  }
  return out;
}

/** Every skill and playbook the portal ships, as savable registry entries. */
export async function listBundledEntries(root = process.cwd()): Promise<BundledEntry[]> {
  const [playbooks, skills] = await Promise.all([bundledPlaybooks(root), bundledSkills(root)]);
  return [...skills, ...playbooks];
}

export interface SyncItem {
  type: EntryType;
  name: string;
  action: "added" | "updated" | "skipped";
  files: number;
}
export interface SyncReport {
  host: string;
  items: SyncItem[];
  added: number;
  updated: number;
  skipped: number;
}

/** The entry file used to test whether an entry already exists in the registry. */
function probePath(entry: BundledEntry): string | undefined {
  if (entry.type === "playbook") return undefined; // readEntryFile resolves the playbook file
  return entry.bundle ? "SKILL.md" : undefined;
}

/**
 * Push the bundled skills & playbooks into the registry. Adds missing entries
 * only unless `overwrite` is set. Meaningful when the GitHub App is configured
 * (writes `du-agent-registry`); offline the registry IS the bundle, so all skip.
 */
export async function syncBundledToRegistry(opts?: { overwrite?: boolean; root?: string }): Promise<SyncReport> {
  const root = opts?.root ?? process.cwd();
  const entries = await listBundledEntries(root);
  const items: SyncItem[] = [];
  let host = "local";

  for (const entry of entries) {
    const existing = await readEntryFile(entry.type, entry.name, probePath(entry)).catch(() => undefined);
    const exists = existing !== undefined && existing.trim() !== "";
    if (exists && !opts?.overwrite) {
      items.push({ type: entry.type, name: entry.name, action: "skipped", files: entry.files.length });
      continue;
    }
    const res = await saveEntry({
      type: entry.type,
      name: entry.name,
      bundle: entry.bundle,
      files: entry.files,
      message: `Sync ${entry.type} ${entry.name} from portal bundle`,
    });
    host = res.host;
    items.push({ type: entry.type, name: entry.name, action: exists ? "updated" : "added", files: entry.files.length });
  }

  return {
    host,
    items,
    added: items.filter((i) => i.action === "added").length,
    updated: items.filter((i) => i.action === "updated").length,
    skipped: items.filter((i) => i.action === "skipped").length,
  };
}
