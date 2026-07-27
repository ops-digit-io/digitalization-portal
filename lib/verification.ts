/**
 * PoC / pilot acceptance tracking — the durable "checkmark" state for a demand's
 * epics, features (user stories), and acceptance criteria.
 *
 * The checkmarks live in the demand README's `## Verification` section, NOT in the
 * auto-generated `requirements.md` — so that re-running the requirements-analysis
 * agent (which regenerates `requirements.md` from scratch) never wipes what a human
 * verified during a PoC or pilot. The parser reads only `## State`/`## Gates`, so
 * this is a zero-schema-change prose section (the same seam as `## Attachments`).
 *
 * Storage is a GitHub-flavoured task list of the TICKED keys only — a key is any
 * stable requirement id: an epic (`E1`), a story/feature (`US-1`), or an acceptance
 * criterion (`US-1#2`). Each ticked line carries a light audit suffix. These helpers
 * are PURE markdown rewrites.
 */

export type VerifyResult = { ok: true; markdown: string } | { ok: false; reason: string };

/** A verification key is opaque to storage; callers form them from requirement ids. */
export function storyKey(storyId: string): string { return storyId; }
export function epicKey(epicId: string): string { return epicId; }
export function acceptanceKey(storyId: string, index: number): string { return `${storyId}#${index + 1}`; }

function sectionBody(markdown: string): string | undefined {
  const m = /(?:^|\n)##\s+Verification[^\n]*\n([\s\S]*?)(?=\n##\s|$)/.exec(markdown);
  return m?.[1];
}

/** The set of ticked keys. Reads `- [x] KEY …` lines; ignores unticked/other lines. */
export function parseVerification(markdown: string): Set<string> {
  const body = sectionBody(markdown);
  const out = new Set<string>();
  if (!body) return out;
  for (const line of body.split("\n")) {
    const m = /^\s*-\s*\[([ xX])\]\s+(\S+)/.exec(line);
    if (m && m[1]!.toLowerCase() === "x" && m[2]) out.add(m[2]);
  }
  return out;
}

export function isVerified(markdown: string, key: string): boolean {
  return parseVerification(markdown).has(key);
}

function renderBody(keys: string[], opts: { actor: string; date: string }): string {
  if (keys.length === 0) return "_Nothing verified yet._";
  return keys.map((k) => `- [x] ${k} — ${opts.date} by ${opts.actor}`).join("\n");
}

/** Natural-ish key order: epics (E1) before stories (US-1) before their criteria. */
function sortKeys(keys: Iterable<string>): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Write the `## Verification` section (replace if present, else insert before `## History`). */
function writeSection(markdown: string, keys: string[], opts: { actor: string; date: string }): string {
  const intro = "_PoC / pilot acceptance. Ticked items were verified during a PoC or pilot._";
  const body = `${intro}\n\n${renderBody(keys, opts)}`;
  const re = /(\n##\s+Verification[^\n]*\n)([\s\S]*?)(?=\n##\s|$)/;
  if (re.test(markdown)) return markdown.replace(re, (_m, head: string) => `${head}\n${body}\n`);
  const section = `## Verification\n\n${body}\n\n`;
  const histIdx = markdown.search(/^##\s+History/m);
  if (histIdx !== -1) return markdown.slice(0, histIdx) + section + markdown.slice(histIdx);
  return `${markdown.trimEnd()}\n\n## Verification\n\n${body}\n`;
}

/**
 * Tick or untick a verification key. Idempotent: ticking an already-ticked key (or
 * unticking a missing one) returns the markdown unchanged. Only the ticked set is
 * stored; unticking removes the line.
 */
export function toggleVerification(
  markdown: string,
  key: string,
  checked: boolean,
  opts: { actor: string; date: string },
): VerifyResult {
  const clean = key.trim();
  if (clean === "" || /\s/.test(clean)) return { ok: false, reason: "Invalid verification key." };
  const current = parseVerification(markdown);
  if (checked === current.has(clean)) return { ok: true, markdown }; // no change
  if (checked) current.add(clean);
  else current.delete(clean);
  return { ok: true, markdown: writeSection(markdown, sortKeys(current), opts) };
}
