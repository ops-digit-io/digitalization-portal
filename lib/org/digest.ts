/**
 * A compact organization-context digest — the Department OS layer, small enough to sit
 * in an agent's system prompt.
 *
 * The whole point of Department OS is that the *other* tools read it. This is the seam:
 * the analyst (and anything else that reasons about a demand) gets the org behind the
 * work — each department's purpose, how complete its context is, and its lanes with the
 * authority level an agent may reach there. It is the org's OWN declared context
 * (authored by the department, scored by the portal), so it is trusted governance, not
 * untrusted external data — but it is deliberately BOUNDED so it can never dominate the
 * prompt: a handful of departments, a handful of lanes each, one line apiece.
 */

import { listDepartments } from "./store.js";
import { listLanes } from "./lane-store.js";

const MAX_DEPARTMENTS = 12;
const MAX_LANES = 8;

function oneLine(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * The digest as markdown, or "" when the org context is empty/unreachable. Never throws
 * — an agent must degrade to "no org context", not fail, if Department OS can't be read.
 */
export async function orgContextDigest(): Promise<string> {
  const departments = await listDepartments().catch(() => []);
  if (departments.length === 0) return "";

  const lines: string[] = [
    "=== ORGANIZATION CONTEXT (Department OS) ===",
    "The organization behind the work. Ground your analysis in it; do not contradict a department's stated scope, decision rights, standards or systems of record. This is the org's own declared context.",
    "",
  ];

  const shown = departments.slice(0, MAX_DEPARTMENTS);
  for (const d of shown) {
    const purpose = d.purpose ? ` — ${oneLine(d.purpose)}` : "";
    lines.push(`## ${d.name}${purpose} (context ${d.score.score}%)`);
    const lanes = await listLanes(d.slug).catch(() => []);
    if (lanes.length > 0) {
      const laneBits = lanes
        .slice(0, MAX_LANES)
        .map((l) => `${l.name}${l.authority ? ` [${l.authority}]` : ""}`)
        .join(", ");
      lines.push(`Lanes & autonomy: ${laneBits}`);
    }
    if (d.score.criticalStale.length > 0) {
      lines.push(`⚠ Critical sections stale/expired — do not rely on: ${d.score.criticalStale.join(", ")}.`);
    }
    lines.push("");
  }
  if (departments.length > shown.length) {
    lines.push(`(+${departments.length - shown.length} more departments not shown)`);
  }
  return lines.join("\n").trim();
}
