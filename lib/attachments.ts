/**
 * Attachments as markdown links (docs/12-architecture — "attachment references").
 *
 * Binaries are NOT committed to the funnel repo (constraint #4: every artifact is
 * markdown, and diffs must stay meaningful). Instead each demand carries an
 * `## Attachments` section of links — to a Vercel Blob object, or any pasted URL.
 * The parser reads only `## State`/`## Gates`, so this is a zero-schema-change prose
 * section. These helpers are PURE markdown rewrites.
 */

export interface Attachment {
  label: string;
  url: string;
}

/** Accept http(s) links (Blob URLs are https). */
export function isValidUrl(u: string): boolean {
  return /^https?:\/\/[^\s)]+$/i.test(u.trim());
}

// Match on a leading `\n` (not the `m` flag) so `$` means end-of-document and the
// whole multi-line body is captured, not just its first line.
function sectionBody(markdown: string): string | undefined {
  const m = /(?:^|\n)##\s+Attachments[^\n]*\n([\s\S]*?)(?=\n##\s|$)/.exec(markdown);
  return m?.[1];
}

/** Parse the `## Attachments` section into a list of links. */
export function listAttachments(markdown: string): Attachment[] {
  const body = sectionBody(markdown);
  if (!body) return [];
  const out: Attachment[] = [];
  const re = /-\s*\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push({ label: m[1]!.trim(), url: m[2]!.trim() });
  return out;
}

function renderBody(atts: Attachment[]): string {
  return atts.length === 0 ? "_None._" : atts.map((a) => `- [${a.label}](${a.url})`).join("\n");
}

/** Write the `## Attachments` section (replace if present, else insert before `## History`). */
function writeSection(markdown: string, atts: Attachment[]): string {
  const body = renderBody(atts);
  const re = /(\n##\s+Attachments[^\n]*\n)([\s\S]*?)(?=\n##\s|$)/;
  if (re.test(markdown)) return markdown.replace(re, (_m, head: string) => `${head}\n${body}\n`);
  const section = `## Attachments\n\n${body}\n\n`;
  const histIdx = markdown.search(/^##\s+History/m);
  if (histIdx !== -1) return markdown.slice(0, histIdx) + section + markdown.slice(histIdx);
  return `${markdown.trimEnd()}\n\n## Attachments\n\n${body}\n`;
}

export type AttachResult = { ok: true; markdown: string } | { ok: false; reason: string };

/** Add an attachment link (idempotent by URL). */
export function addAttachment(markdown: string, att: Attachment, opts?: { label?: string }): AttachResult {
  const url = att.url.trim();
  if (!isValidUrl(url)) return { ok: false, reason: "Attachment must be a valid http(s) URL." };
  const label = (opts?.label ?? att.label ?? url).trim() || url;
  const existing = listAttachments(markdown);
  if (existing.some((a) => a.url === url)) return { ok: true, markdown }; // already attached
  return { ok: true, markdown: writeSection(markdown, [...existing, { label, url }]) };
}

/** Remove an attachment by URL. */
export function removeAttachment(markdown: string, url: string): AttachResult {
  const existing = listAttachments(markdown);
  const next = existing.filter((a) => a.url !== url.trim());
  if (next.length === existing.length) return { ok: true, markdown }; // nothing to remove
  return { ok: true, markdown: writeSection(markdown, next) };
}
