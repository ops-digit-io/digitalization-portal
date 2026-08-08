/**
 * In-app specification reader helpers.
 *
 * The specification documents are NOT in this repository — they live in the
 * external `du-specifications` repo, read through the same content-repo seam as the
 * agent library and the templates (`lib/content-repo.ts`): live from GitHub when
 * the App is configured, else the local mirror (`npm run content:pull`), else
 * nothing — in which case `/docs` shows its empty state rather than pretending.
 *
 * The pure parts (slug guard, title derivation) live here so they are unit-tested
 * without any IO. Doc filenames are mixed-case and hyphenated
 * (e.g. `ARCHITECTURE-intake.md`), so the slug charset is deliberately permissive
 * but blocks path traversal (no `/`, `.`, or separators).
 */

import { specificationsRepo, listContent, readContent } from "./content-repo.js";

/** A slug is valid iff it is exactly `[A-Za-z0-9-]+` — no dots, slashes, or `..`. */
export function safeDocSlug(slug: string): string | null {
  return /^[A-Za-z0-9-]+$/.test(slug) ? slug : null;
}

/** The document title: its first `# H1`, else the slug. Never throws. */
export function docTitle(markdown: string, slug: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m?.[1]?.trim() || slug;
}

/** List available spec slugs (filenames without `.md`), sorted. Server-only. */
export async function listDocSlugs(): Promise<string[]> {
  const entries = await listContent(specificationsRepo(), "");
  return entries
    .filter((e) => e.type === "file" && e.name.toLowerCase().endsWith(".md"))
    .map((e) => e.name.slice(0, -3))
    .sort();
}

/** Read one spec's markdown, or undefined if the slug is invalid/missing. Server-only. */
export async function readDoc(slug: string): Promise<string | undefined> {
  const safe = safeDocSlug(slug);
  if (!safe) return undefined;
  return readContent(specificationsRepo(), `${safe}.md`);
}
