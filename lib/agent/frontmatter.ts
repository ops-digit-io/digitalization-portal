/**
 * Minimal frontmatter parser for skills and playbooks
 * (`docs/10-skills.md`, `docs/11-playbooks.md`, `docs/BUILD.md` M5).
 *
 * Skills and playbooks are PORTAL-repo artifacts (not use-case artifacts), so a
 * small frontmatter block is permitted here — constraint #4 ("no YAML in
 * use-case repositories") does not apply to the portal's own agent registry.
 *
 * Deliberately dependency-free and tolerant: supports `key: value` and
 * `key: [a, b, c]` list syntax. Never throws — malformed frontmatter yields an
 * empty meta and the whole document as the body, so a bad skill file degrades to
 * "no metadata" rather than crashing the loader.
 */

export interface Frontmatter {
  meta: Record<string, string | string[]>;
  body: string;
}

const FENCE = "---";

export function parseFrontmatter(source: string): Frontmatter {
  const text = source ?? "";
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== FENCE) {
    return { meta: {}, body: text };
  }

  const meta: Record<string, string | string[]> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === FENCE) {
      i++;
      break;
    }
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let rawValue = line.slice(idx + 1).trim();
    if (key === "") continue;

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1).trim();
      meta[key] = inner === "" ? [] : inner.split(",").map((s) => s.trim()).filter((s) => s !== "");
    } else {
      // Strip surrounding quotes if present.
      rawValue = rawValue.replace(/^["']|["']$/g, "");
      meta[key] = rawValue;
    }
  }

  const body = lines.slice(i).join("\n").replace(/^\n+/, "");
  return { meta, body };
}

/** Coerce a meta field to a string array (single value → one-element array). */
export function metaList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Rebuild a markdown file from a frontmatter object and a body. Inverse of parse. */
export function serializeFrontmatter(meta: Record<string, string | string[]>, body: string): string {
  const keys = Object.keys(meta).filter((k) => {
    const v = meta[k];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
  });
  if (keys.length === 0) return body.replace(/^\n+/, "");
  const lines = ["---"];
  for (const k of keys) {
    const v = meta[k]!;
    lines.push(Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`);
  }
  lines.push("---", "", body.replace(/^\n+/, ""));
  return lines.join("\n");
}
