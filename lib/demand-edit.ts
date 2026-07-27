/**
 * Edit a demand's content IN PLACE (docs/03-data-model.md).
 *
 * A PURE markdown rewrite that patches only the parts a user may edit — the prose
 * sections, the title, Plant/Domain, and the People rows — and leaves everything
 * else (Stage, Status, Lane, Gates, History timeline) untouched. This is the
 * critical difference from `buildDemand`, which regenerates the whole document and
 * would wipe gate progress, the assigned lane, owners, and history. Editing must
 * never rebuild; it surgically replaces sections.
 *
 * The caller (`/api/demands/[id]/edit`) persists the result with `saveDemand`
 * (overwrite), the same way advance/triage persist their rewrites.
 */

import { INTAKE_FIELDS, parseDemandToAnswers, missingRequired, type DemandAnswers } from "./demand.js";
import { setStateField, appendHistory } from "./demand-advance.js";
import { parsePeople } from "./parse.js";
import { can, type Session } from "./rbac.js";

/**
 * May this session edit this demand's content? `draft` (any content-authoring role)
 * AND either broad reach (`view_all`) or being the named requester of THIS demand —
 * mirroring the named-individual widening in `lib/visibility.ts`. Used by the edit
 * and attachment routes (status transitions use their own gate/park/kill gates).
 */
export function canEditDemand(session: Session, markdown: string): boolean {
  if (!can(session, "draft")) return false;
  if (can(session, "view_all")) return true;
  const requester = (parsePeople(markdown).requester ?? "").trim().toLowerCase();
  return requester !== "" && requester === session.user.trim().toLowerCase();
}

/** Fields a user may edit: the intake answers plus the two named owners. */
export type EditPatch = Partial<DemandAnswers> & { sponsor?: string; value_owner?: string };

export type EditResult = { ok: true; markdown: string; changed: string[] } | { ok: false; reason: string };

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace the body under a `## Heading` section, preserving the rest. The section
 * boundary is the next `## ` heading or end-of-document; we match on a leading `\n`
 * (headings always follow a blank line) rather than the `m` flag, so `$` means
 * end-of-string and the whole multi-line body is replaced, not just its first line.
 */
function replaceSectionBody(md: string, heading: string, body: string): string {
  const re = new RegExp(`(\\n##\\s+${esc(heading)}[^\\n]*\\n)([\\s\\S]*?)(?=\\n##\\s|$)`);
  if (!re.test(md)) return md;
  const clean = body.trim();
  return md.replace(re, (_m, head: string) => `${head}\n${clean}\n`);
}

/** Replace the H1 title, keeping the `UC-… · ` id prefix. */
function replaceTitle(md: string, title: string): string {
  return md.replace(/^(#\s+UC-[A-Z0-9-]+\s*·\s*).*$/m, `$1${title.trim()}`);
}

/** Set a People-table row's person cell (Requester / Sponsor / Value owner). */
function setPeopleRow(md: string, roleLabel: string, person: string): string {
  const re = new RegExp(`(^\\|\\s*${esc(roleLabel)}\\s*\\|)([^\\n|]*)(\\|)`, "m");
  if (!re.test(md)) return md;
  const value = person.trim() || "<!-- unassigned -->";
  return md.replace(re, `$1 ${value} $3`);
}

const SECTION_BY_KEY = new Map(INTAKE_FIELDS.filter((f) => f.section).map((f) => [f.key, f.section as string]));

/**
 * Apply an edit to a demand's markdown. Refuses to blank a required field (so a
 * save can't strip the demand below intake completeness). Records a `## History`
 * line naming what changed. Only the patched fields are written.
 */
export function editDemand(markdown: string, patch: EditPatch, opts: { actor: string; date: string }): EditResult {
  const current = parseDemandToAnswers(markdown);
  // Merge the patch over current answers, then guard required completeness.
  const merged: DemandAnswers = { ...current };
  for (const k of Object.keys(patch) as (keyof EditPatch)[]) {
    if (k in current && typeof patch[k] === "string") (merged as unknown as Record<string, string>)[k] = patch[k] as string;
  }
  const missing = missingRequired(merged);
  if (missing.length > 0) {
    return { ok: false, reason: `These fields are required: ${missing.map((f) => f.label).join(", ")}.` };
  }

  let md = markdown;
  const changed: string[] = [];

  // Prose sections + title.
  for (const f of INTAKE_FIELDS) {
    if (!(f.key in patch)) continue;
    const value = patch[f.key];
    if (typeof value !== "string" || value === current[f.key]) continue;
    if (f.key === "title") {
      md = replaceTitle(md, value || "Untitled demand");
      changed.push("title");
    } else if (f.section) {
      md = replaceSectionBody(md, f.section, value || f.placeholder);
      changed.push(f.label);
    } else if (f.key === "plant") {
      md = setStateField(md, "Plant", value);
      changed.push("plant");
    } else if (f.key === "domain") {
      md = setStateField(md, "Domain", value);
      changed.push("domain");
    } else if (f.key === "requester") {
      md = setPeopleRow(md, "Requester", value);
      changed.push("requester");
    }
  }

  // Owners (People table).
  if (typeof patch.sponsor === "string") { md = setPeopleRow(md, "Sponsor", patch.sponsor); changed.push("sponsor"); }
  if (typeof patch.value_owner === "string") { md = setPeopleRow(md, "Value owner", patch.value_owner); changed.push("value owner"); }

  if (changed.length === 0) return { ok: false, reason: "Nothing changed." };

  md = appendHistory(md, `${opts.date} — edited (${changed.join(", ")}) by ${opts.actor}`);
  return { ok: true, markdown: md, changed };
}
