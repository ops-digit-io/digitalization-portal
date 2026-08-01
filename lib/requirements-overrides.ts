/**
 * Human edits to the AI-generated requirements — the "human in the loop" over the
 * model's assumptions.
 *
 * `requirements.md` is REGENERATED from scratch every time the analysis runs, so a
 * human edit written into it would be wiped on the next re-analysis. This overlay
 * lives instead in the demand README — the same durable seam `verification.ts`
 * uses for PoC checkmarks — and is APPLIED on top of the freshly-parsed document
 * at read time. Re-analysis regenerates the baseline; the human's epics, edits and
 * removals ride over it and survive.
 *
 * The overlay records three operations per kind (epic / story):
 *   - add:    human-authored items, with ids `E-H1` / `US-H1` that can never
 *             collide with the generated `E1` / `US-1`.
 *   - edit:   a partial patch keyed by the item's id (generated or human).
 *   - remove: a tombstone list of ids to drop.
 *
 * Editing keys by id, and the generated ids are DETERMINISTIC from the demand
 * answers — so as long as the demand itself is unchanged, re-analysis reproduces
 * the same ids and every edit re-applies to the item it was made against. The
 * board shows each item's provenance so a reviewer can see what the model wrote,
 * what a human changed, and what a human added.
 */

import type { Epic, UserStory, RequirementsDoc } from "./requirements.js";

export interface RequirementsOverlay {
  epics: { add: Epic[]; edit: Record<string, Partial<Epic>>; remove: string[] };
  stories: { add: UserStory[]; edit: Record<string, Partial<UserStory>>; remove: string[] };
}

export type Provenance = "ai" | "edited" | "added";

export function emptyOverlay(): RequirementsOverlay {
  return { epics: { add: [], edit: {}, remove: [] }, stories: { add: [], edit: {}, remove: [] } };
}

const SECTION = "Requirements Edits";
const clean = (s: unknown): string => String(s ?? "").replace(/\r/g, "").trim();

// ── read / write the overlay in the demand README ───────────────────────────────

/** The fenced-JSON overlay from the demand README, or an empty overlay. Never throws. */
export function parseOverrides(demandMarkdown: string): RequirementsOverlay {
  const m = new RegExp(`(?:^|\\n)##\\s+${SECTION}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`).exec(demandMarkdown);
  if (!m) return emptyOverlay();
  const fence = /```json\s*([\s\S]*?)```/.exec(m[1] ?? "");
  if (!fence) return emptyOverlay();
  try {
    const raw = JSON.parse(fence[1]!.trim()) as Partial<RequirementsOverlay>;
    const base = emptyOverlay();
    return {
      epics: {
        add: Array.isArray(raw.epics?.add) ? (raw.epics!.add as Epic[]) : base.epics.add,
        edit: raw.epics?.edit && typeof raw.epics.edit === "object" ? (raw.epics.edit as Record<string, Partial<Epic>>) : base.epics.edit,
        remove: Array.isArray(raw.epics?.remove) ? (raw.epics!.remove as string[]) : base.epics.remove,
      },
      stories: {
        add: Array.isArray(raw.stories?.add) ? (raw.stories!.add as UserStory[]) : base.stories.add,
        edit: raw.stories?.edit && typeof raw.stories.edit === "object" ? (raw.stories.edit as Record<string, Partial<UserStory>>) : base.stories.edit,
        remove: Array.isArray(raw.stories?.remove) ? (raw.stories!.remove as string[]) : base.stories.remove,
      },
    };
  } catch {
    return emptyOverlay();
  }
}

/** Is the overlay empty (nothing a human has changed)? */
export function isEmptyOverlay(o: RequirementsOverlay): boolean {
  return (
    o.epics.add.length === 0 && o.epics.remove.length === 0 && Object.keys(o.epics.edit).length === 0 &&
    o.stories.add.length === 0 && o.stories.remove.length === 0 && Object.keys(o.stories.edit).length === 0
  );
}

/** Upsert the `## Requirements Edits` section (dropping it entirely when empty). */
export function writeOverrides(demandMarkdown: string, overlay: RequirementsOverlay): string {
  const re = new RegExp(`\\n##\\s+${SECTION}[^\\n]*\\n[\\s\\S]*?(?=\\n##\\s|$)`);
  const stripped = demandMarkdown.replace(re, "").trimEnd();
  if (isEmptyOverlay(overlay)) return stripped + "\n";
  const intro = "_Human edits to the AI-generated requirements. Applied over the regenerated baseline, so they survive re-analysis. Machine-managed — edit through the requirements board._";
  const block = "```json\n" + JSON.stringify(overlay, null, 2) + "\n```";
  const section = `## ${SECTION}\n\n${intro}\n\n${block}\n`;
  // Insert before ## History if present, else append.
  const histIdx = stripped.search(/\n##\s+History/);
  if (histIdx !== -1) return `${stripped.slice(0, histIdx)}\n${section}${stripped.slice(histIdx)}\n`;
  return `${stripped}\n\n${section}`;
}

// ── apply the overlay to a parsed requirements document ─────────────────────────

export interface MergedRequirements {
  doc: RequirementsDoc;
  /** id → where this item came from, for the provenance badge. */
  provenance: Record<string, Provenance>;
  /** Ids the human removed, with a snapshot title so the UI can offer "restore". */
  removed: { id: string; kind: "epic" | "story"; title: string }[];
}

/** Apply a human overlay to the generated document. Pure. */
export function applyOverrides(doc: RequirementsDoc, overlay: RequirementsOverlay): MergedRequirements {
  const provenance: Record<string, Provenance> = {};
  const removed: MergedRequirements["removed"] = [];

  const epicRemove = new Set(overlay.epics.remove);
  const storyRemove = new Set(overlay.stories.remove);

  const epics: Epic[] = [];
  for (const e of doc.epics) {
    if (epicRemove.has(e.id)) { removed.push({ id: e.id, kind: "epic", title: e.title }); continue; }
    const patch = overlay.epics.edit[e.id];
    epics.push(patch ? { ...e, ...patch, id: e.id } : e);
    provenance[e.id] = patch ? "edited" : "ai";
  }
  for (const e of overlay.epics.add) {
    if (epicRemove.has(e.id)) continue;
    const patch = overlay.epics.edit[e.id];
    epics.push(patch ? { ...e, ...patch, id: e.id } : e);
    provenance[e.id] = "added";
  }

  const stories: UserStory[] = [];
  for (const s of doc.stories) {
    if (storyRemove.has(s.id)) { removed.push({ id: s.id, kind: "story", title: s.capability }); continue; }
    const patch = overlay.stories.edit[s.id];
    stories.push(patch ? { ...s, ...patch, id: s.id } : s);
    provenance[s.id] = patch ? "edited" : "ai";
  }
  for (const s of overlay.stories.add) {
    if (storyRemove.has(s.id)) continue;
    const patch = overlay.stories.edit[s.id];
    stories.push(patch ? { ...s, ...patch, id: s.id } : s);
    provenance[s.id] = "added";
  }

  return { doc: { ...doc, epics, stories }, provenance, removed };
}

// ── mutations (pure overlay transforms, validated) ──────────────────────────────

export type OverlayResult = { ok: true; overlay: RequirementsOverlay } | { ok: false; reason: string };

const PRIORITIES: UserStory["priority"][] = ["must", "should", "could"];

/** Next free human id for a kind, e.g. E-H3 / US-H2 — never reuses. */
function nextHumanId(prefix: "E-H" | "US-H", overlay: RequirementsOverlay): string {
  const ids = prefix === "E-H" ? overlay.epics.add.map((e) => e.id) : overlay.stories.add.map((s) => s.id);
  let n = 1;
  const used = new Set(ids);
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function addEpic(overlay: RequirementsOverlay, input: { title: string; description: string }): OverlayResult {
  const title = clean(input.title);
  if (title === "") return { ok: false, reason: "An epic needs a title." };
  const id = nextHumanId("E-H", overlay);
  const epic: Epic = { id, title, description: clean(input.description) };
  return { ok: true, overlay: { ...overlay, epics: { ...overlay.epics, add: [...overlay.epics.add, epic] } } };
}

export function addStory(overlay: RequirementsOverlay, input: Partial<UserStory>): OverlayResult {
  const capability = clean(input.capability);
  const epic = clean(input.epic);
  if (capability === "") return { ok: false, reason: "A story needs a capability (the “I want …”)." };
  if (epic === "") return { ok: false, reason: "A story must belong to an epic." };
  const priority = PRIORITIES.includes(input.priority as UserStory["priority"]) ? (input.priority as UserStory["priority"]) : "should";
  const acceptance = Array.isArray(input.acceptance) ? input.acceptance.map(clean).filter(Boolean) : [];
  const story: UserStory = {
    id: nextHumanId("US-H", overlay),
    epic,
    persona: clean(input.persona) || "user",
    capability,
    benefit: clean(input.benefit),
    acceptance,
    priority,
  };
  return { ok: true, overlay: { ...overlay, stories: { ...overlay.stories, add: [...overlay.stories.add, story] } } };
}

/** True for an id that a human added (vs a generated baseline id). */
function isAddedEpic(overlay: RequirementsOverlay, id: string): boolean {
  return overlay.epics.add.some((e) => e.id === id);
}
function isAddedStory(overlay: RequirementsOverlay, id: string): boolean {
  return overlay.stories.add.some((s) => s.id === id);
}

export function updateEpic(overlay: RequirementsOverlay, id: string, patch: Partial<Epic>): OverlayResult {
  if (clean(id) === "") return { ok: false, reason: "Missing epic id." };
  const fields: Partial<Epic> = {};
  if (patch.title !== undefined) { if (clean(patch.title) === "") return { ok: false, reason: "An epic needs a title." }; fields.title = clean(patch.title); }
  if (patch.description !== undefined) fields.description = clean(patch.description);
  // Editing a human-added item patches the add entry in place; editing a generated
  // one records an edit keyed by its id.
  if (isAddedEpic(overlay, id)) {
    return { ok: true, overlay: { ...overlay, epics: { ...overlay.epics, add: overlay.epics.add.map((e) => (e.id === id ? { ...e, ...fields } : e)) } } };
  }
  return { ok: true, overlay: { ...overlay, epics: { ...overlay.epics, edit: { ...overlay.epics.edit, [id]: { ...overlay.epics.edit[id], ...fields } } } } };
}

export function updateStory(overlay: RequirementsOverlay, id: string, patch: Partial<UserStory>): OverlayResult {
  if (clean(id) === "") return { ok: false, reason: "Missing story id." };
  const fields: Partial<UserStory> = {};
  for (const k of ["persona", "capability", "benefit", "epic"] as const) {
    if (patch[k] !== undefined) fields[k] = clean(patch[k]);
  }
  if (patch.capability !== undefined && fields.capability === "") return { ok: false, reason: "A story needs a capability." };
  if (patch.priority !== undefined) {
    if (!PRIORITIES.includes(patch.priority)) return { ok: false, reason: "Priority must be must / should / could." };
    fields.priority = patch.priority;
  }
  if (patch.acceptance !== undefined) fields.acceptance = (Array.isArray(patch.acceptance) ? patch.acceptance : []).map(clean).filter(Boolean);
  if (isAddedStory(overlay, id)) {
    return { ok: true, overlay: { ...overlay, stories: { ...overlay.stories, add: overlay.stories.add.map((s) => (s.id === id ? { ...s, ...fields } : s)) } } };
  }
  return { ok: true, overlay: { ...overlay, stories: { ...overlay.stories, edit: { ...overlay.stories.edit, [id]: { ...overlay.stories.edit[id], ...fields } } } } };
}

export function removeEpic(overlay: RequirementsOverlay, id: string): OverlayResult {
  if (clean(id) === "") return { ok: false, reason: "Missing epic id." };
  // Removing a human-added epic just drops it from the add list; removing a
  // generated one tombstones its id. Its edit entry is cleaned up either way.
  const edit = { ...overlay.epics.edit }; delete edit[id];
  if (isAddedEpic(overlay, id)) {
    return { ok: true, overlay: { ...overlay, epics: { add: overlay.epics.add.filter((e) => e.id !== id), edit, remove: overlay.epics.remove } } };
  }
  const remove = overlay.epics.remove.includes(id) ? overlay.epics.remove : [...overlay.epics.remove, id];
  return { ok: true, overlay: { ...overlay, epics: { add: overlay.epics.add, edit, remove } } };
}

export function removeStory(overlay: RequirementsOverlay, id: string): OverlayResult {
  if (clean(id) === "") return { ok: false, reason: "Missing story id." };
  const edit = { ...overlay.stories.edit }; delete edit[id];
  if (isAddedStory(overlay, id)) {
    return { ok: true, overlay: { ...overlay, stories: { add: overlay.stories.add.filter((s) => s.id !== id), edit, remove: overlay.stories.remove } } };
  }
  const remove = overlay.stories.remove.includes(id) ? overlay.stories.remove : [...overlay.stories.remove, id];
  return { ok: true, overlay: { ...overlay, stories: { add: overlay.stories.add, edit, remove } } };
}

/** Undo a removal (restore a tombstoned baseline id). */
export function restore(overlay: RequirementsOverlay, kind: "epic" | "story", id: string): OverlayResult {
  if (kind === "epic") return { ok: true, overlay: { ...overlay, epics: { ...overlay.epics, remove: overlay.epics.remove.filter((x) => x !== id) } } };
  return { ok: true, overlay: { ...overlay, stories: { ...overlay.stories, remove: overlay.stories.remove.filter((x) => x !== id) } } };
}
