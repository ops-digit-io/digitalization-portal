/**
 * In-app specification reader helpers. The `docs/` folder ships with the app; a
 * `/docs` route reads it at request time (server-side, from `process.cwd()`).
 *
 * The pure parts (slug guard, title derivation) live here so they are unit-tested
 * without the filesystem. Doc filenames are mixed-case and hyphenated
 * (e.g. `ARCHITECTURE-intake.md`), so the slug charset is deliberately permissive
 * but blocks path traversal (no `/`, `.`, or separators).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DOCS_DIR = "docs";

/** A slug is valid iff it is exactly `[A-Za-z0-9-]+` — no dots, slashes, or `..`. */
export function safeDocSlug(slug: string): string | null {
  return /^[A-Za-z0-9-]+$/.test(slug) ? slug : null;
}

/** The document title: its first `# H1`, else the slug. Never throws. */
export function docTitle(markdown: string, slug: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m?.[1]?.trim() || slug;
}

/** List available doc slugs (filenames without `.md`), sorted. Server-only. */
export async function listDocSlugs(baseDir = process.cwd()): Promise<string[]> {
  const entries = await readdir(join(baseDir, DOCS_DIR)).catch(() => [] as string[]);
  return entries
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}

/** Read one doc's markdown, or undefined if the slug is invalid/missing. Server-only. */
export async function readDoc(slug: string, baseDir = process.cwd()): Promise<string | undefined> {
  const safe = safeDocSlug(slug);
  if (!safe) return undefined;
  return readFile(join(baseDir, DOCS_DIR, `${safe}.md`), "utf8").catch(() => undefined);
}
