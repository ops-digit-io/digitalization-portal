/**
 * Small shared markdown helpers. Kept separate from `lib/parse.ts` (which owns
 * the load-bearing README contract) so registry/board code can read tables
 * without depending on the use-case parser.
 */

/** Split a markdown table row into trimmed cells, dropping the outer pipes. */
export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, "")));
}

export interface MarkdownTable {
  headers: string[];
  /** Data rows as cell arrays (header and `---` separator removed). */
  rows: string[][];
}

/**
 * Extract the first markdown pipe-table found in the text. Returns undefined if
 * none. Never throws. Rows shorter/longer than the header are returned as-is;
 * callers index defensively.
 */
export function parseFirstTable(markdown: string): MarkdownTable | undefined {
  const lines = (markdown ?? "").split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (lines.length === 0) return undefined;
  const all = lines.map(splitRow);
  const headers = all[0] ?? [];
  const rows = all.slice(1).filter((cells) => !isSeparatorRow(cells));
  return { headers, rows };
}

/** Map a header label to its column index, case-insensitively. -1 if absent. */
export function columnIndex(headers: string[], label: string): number {
  const want = label.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === want);
}
