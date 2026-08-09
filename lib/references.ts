/**
 * The context mesh: typed references between the portal's artifacts.
 *
 * The portal's objects already relate to each other — a demand comes out of a
 * process diagnosis, a user story cites a persona, a champion carries a plant's
 * work, a skill governed a classification. Until now those relations lived as
 * prose ("Finding from the process diagnosis “X”") or as one-way metadata, so
 * nothing could navigate them and nothing could invert them.
 *
 * This module is the mesh's grammar. Three commitments shape it:
 *
 * 1. **Markdown, never frontmatter** (design commitment #4). References live in a
 *    `## Related` section — the one `docs/03-data-model.md §3.5` already specifies
 *    and nothing has written until now — as ordinary list items a human can read,
 *    write and diff without the portal.
 * 2. **Never throws** (the `lib/parse.ts` rule). A malformed reference is dropped,
 *    not fatal: an unreadable relation must never cost you the document holding it.
 * 3. **Round-trip stable** (the `lib/reconcile.ts` rule). Parse then serialize
 *    returns the same lines, so the mesh can be rewritten without churning diffs.
 *
 * The grammar, from the spec's own example outwards:
 *
 * ```markdown
 * ## Related
 *
 * - UC-2026-0033 — shares the cause-code taxonomy
 * - process:downtime-reason-capture — diagnosed here before intake
 * - persona:P-03 — primary persona for the pilot stories
 * - champion:C-01 — carries this at DE-ALD
 * - skill:demand-classification — governed the lane proposal
 * ```
 *
 * A bare id is resolved by its shape (`UC-2026-0033` is a demand, `P-03` a
 * persona), so the document the spec wrote parses unchanged. Everything after the
 * em dash is a note: free prose, never parsed, and the reason the mesh is worth
 * reading — an edge without a stated reason is trivia.
 */

/** The artifact kinds the mesh can point at. */
export type ReferenceKind =
  | "demand"
  | "process"
  | "persona"
  | "champion"
  | "skill"
  | "playbook"
  | "requirement"
  | "repo"
  | "department"
  | "lane"
  | "tool";

/**
 * How two artifacts relate.
 *
 * The note stays free prose — but the FIRST word of it is worth typing, because the
 * portal's central promise is that a demand is captured once. "This is a duplicate
 * of UC-2026-0033" has to be answerable by a query across the funnel, and it cannot
 * be if the only record of it is a sentence.
 *
 * The vocabulary is deliberately short and it is a suggestion, not a schema: an
 * unrecognised note is still a perfectly good reference, it just has no relation.
 */
export const RELATIONS = ["duplicate", "supersedes", "superseded-by", "depends-on", "blocks", "part-of", "related"] as const;
export type Relation = (typeof RELATIONS)[number];

/** How each relation reads in a sentence, and how it is written back out. */
export const RELATION_LABEL: Record<Relation, string> = {
  duplicate: "duplicate of",
  supersedes: "supersedes",
  "superseded-by": "superseded by",
  "depends-on": "depends on",
  blocks: "blocks",
  "part-of": "part of",
  related: "related",
};

/** The inverse of each relation, for reading an edge from the other end. */
export const RELATION_INVERSE: Record<Relation, Relation> = {
  duplicate: "duplicate",
  supersedes: "superseded-by",
  "superseded-by": "supersedes",
  "depends-on": "blocks",
  blocks: "depends-on",
  "part-of": "part-of",
  related: "related",
};

export interface Reference {
  kind: ReferenceKind;
  /** The target's own identifier — `UC-2026-0033`, a process slug, `P-03`, `C-01`. */
  id: string;
  /** Why the edge exists. Free prose; may be empty, but a mesh of bare ids is trivia. */
  note: string;
  /** The typed relation, when the note opens with one of `RELATIONS`. */
  relation?: Relation;
}

export interface ReferenceKindDef {
  kind: ReferenceKind;
  /** The `kind:` prefix as written in markdown. */
  prefix: string;
  /** Human label for the UI. */
  label: string;
  /** Shape of a bare id of this kind, for prefix-less references. Optional: a
   *  process slug has no distinguishing shape and always needs its prefix. */
  bareId?: RegExp;
  /** Where the target lives in the portal. */
  href: (id: string) => string;
}

/**
 * The kind table — the mesh's only extension seam. A new artifact kind is one
 * entry here; nothing else in the module knows the list.
 *
 * Order matters for bare-id inference: the first kind whose `bareId` matches wins,
 * so patterns must not overlap.
 */
export const REFERENCE_KINDS: readonly ReferenceKindDef[] = [
  {
    kind: "demand",
    prefix: "uc",
    label: "Demand",
    bareId: /^UC-\d{4}-\d{3,}$/i,
    href: (id) => `/uc/${encodeURIComponent(id)}`,
  },
  {
    kind: "requirement",
    prefix: "requirement",
    label: "Requirements",
    href: (id) => `/requirements/${encodeURIComponent(id)}`,
  },
  {
    kind: "process",
    prefix: "process",
    label: "Process diagnosis",
    href: (id) => `/process/${encodeURIComponent(id)}`,
  },
  {
    kind: "persona",
    prefix: "persona",
    label: "Persona",
    bareId: /^P-\d{2,}$/i,
    href: (id) => `/personas/library#${encodeURIComponent(id)}`,
  },
  {
    kind: "champion",
    prefix: "champion",
    label: "Champion",
    bareId: /^C-\d{2,}$/i,
    href: (id) => `/champions#${encodeURIComponent(id)}`,
  },
  {
    kind: "skill",
    prefix: "skill",
    label: "Skill",
    href: (id) => `/catalog/skill/${encodeURIComponent(id)}`,
  },
  {
    kind: "playbook",
    prefix: "playbook",
    label: "Playbook",
    href: (id) => `/catalog/playbook/${encodeURIComponent(id)}`,
  },
  {
    // A scaffolded `uc-*` repository — a use case earns its own repo at the PoC
    // stage. The node is derived (nobody authors `repo:` in `## Related`); its id is
    // the repo name `uc-yyyy-nnnn-<slug>`, and it links to where the portal manages
    // that PoC rather than out to GitHub, so the href stays env-independent.
    kind: "repo",
    prefix: "repo",
    label: "Scaffolded repo",
    bareId: /^uc-\d{4}-\d{3,}-[a-z0-9-]+$/i,
    href: (id) => {
      const uc = /^(uc-\d{4}-\d{3,})/i.exec(id)?.[1];
      return uc ? `/uc/${uc.toUpperCase()}/poc` : "/build";
    },
  },
  {
    // A department in the organization-context layer (Department OS). Derived — nobody
    // authors `department:` in `## Related`; the id is the department slug.
    kind: "department",
    prefix: "department",
    label: "Department",
    href: (id) => `/org/${encodeURIComponent(id)}`,
  },
  {
    // A lane pack within a department. Its id is `<dept-slug>/<lane-slug>`, which maps
    // straight onto the lane route. Derived.
    kind: "lane",
    prefix: "lane",
    label: "Lane",
    href: (id) => `/org/${id}`,
  },
  {
    // An app tool (a launchpad tile) — nodes so the graph shows the whole app and how
    // each tool relates to the artifacts it produces. Derived; the id is the tile id,
    // and the node links back to the launchpad.
    kind: "tool",
    prefix: "tool",
    label: "Tool",
    href: () => `/`,
  },
];

const BY_PREFIX = new Map(REFERENCE_KINDS.map((k) => [k.prefix, k]));
const BY_KIND = new Map(REFERENCE_KINDS.map((k) => [k.kind, k]));

export function referenceKind(kind: ReferenceKind): ReferenceKindDef | undefined {
  return BY_KIND.get(kind);
}

/** Canonical id: trimmed, and upper-cased for the kinds whose ids are upper-case. */
function normaliseId(kind: ReferenceKind, raw: string): string {
  const id = raw.trim();
  return kind === "demand" || kind === "persona" || kind === "champion" ? id.toUpperCase() : id;
}

/** Where a reference points in the portal, or "" for an unknown kind. */
export function referenceHref(ref: Reference): string {
  return BY_KIND.get(ref.kind)?.href(ref.id) ?? "";
}

/**
 * Build a target from a kind and an id that arrived as separate values — a form
 * post, a query string, an agent tool call.
 *
 * Exists because the obvious thing to write is `parseTarget(\`${kind}:${id}\`)`, and
 * that is WRONG for any kind whose prefix differs from its name: a demand's prefix
 * is "uc", so "demand:UC-2026-0001" names no kind and is silently dropped. That bug
 * shipped once and cost every reference a requester flagged at intake. Callers with
 * a kind in hand should use this and never assemble the string themselves.
 */
export function targetFor(kind: unknown, id: unknown): { kind: ReferenceKind; id: string } | undefined {
  if (typeof id !== "string" || id.trim() === "") return undefined;
  const def = typeof kind === "string" ? REFERENCE_KINDS.find((k) => k.kind === kind || k.prefix === kind) : undefined;
  // No usable kind — fall back to reading the id on its own, which still resolves
  // a bare "UC-2026-0001" or a fully prefixed "process:some-slug".
  if (!def) return parseTarget(id);
  return { kind: def.kind, id: normaliseId(def.kind, id) };
}

/** The section heading the mesh lives under. */
export const RELATED_HEADING = "Related";

/**
 * Section this document's references sit in front of, so a rewrite lands where
 * `docs/03-data-model.md §3.5` puts it: after Gates, before History. History is
 * append-only and reads chronologically; references pushed below it would drift
 * further from the document every time something happened.
 */
const BEFORE = ["History"];

// --------------------------------------------------------------------- parse

/** The `- <ref> — <note>` line shape. The dash may be em, en, hyphen, or absent. */
const ITEM_RE = /^\s*[-*]\s+(.+?)\s*$/;
const SPLIT_RE = /\s+(?:—|–|--)\s+/;

/** Longest label first, so "superseded by" is never read as "supersedes". */
const RELATION_BY_LABEL: [Relation, string][] = (Object.entries(RELATION_LABEL) as [Relation, string][]).sort(
  (a, b) => b[1].length - a[1].length,
);

/**
 * Split a note into its leading relation and the rest.
 *
 * The spec's own example — "related, shares cause-code taxonomy" — is exactly this
 * shape, which is where the convention comes from. A note that opens with no known
 * relation keeps all of its text and simply has none.
 */
export function splitRelation(note: string): { relation?: Relation; rest: string } {
  const text = note.trim();
  for (const [relation, label] of RELATION_BY_LABEL) {
    if (!text.toLowerCase().startsWith(label)) continue;
    const after = text.slice(label.length);
    // The label must end the note or be followed by punctuation — otherwise
    // "related work stopped in March" would lose its first word.
    if (after === "") return { relation, rest: "" };
    const m = /^\s*[,;:—–-]\s*(.*)$/s.exec(after);
    if (m) return { relation, rest: (m[1] ?? "").trim() };
  }
  return { rest: text };
}

/** Rejoin a relation and its note into the single prose line stored in markdown. */
export function joinRelation(relation: Relation | undefined, rest: string): string {
  const note = rest.trim();
  if (!relation) return note;
  return note ? `${RELATION_LABEL[relation]}, ${note}` : RELATION_LABEL[relation];
}

/**
 * Read one reference target — `kind:id`, or a bare id resolved by its shape.
 * Returns undefined for anything that names no kind we know, which is how a typo
 * costs its own line and nothing else.
 */
export function parseTarget(raw: string): { kind: ReferenceKind; id: string } | undefined {
  const text = raw.trim().replace(/^\[|\]$/g, "").trim();
  if (text === "") return undefined;

  const colon = text.indexOf(":");
  if (colon > 0) {
    const def = BY_PREFIX.get(text.slice(0, colon).trim().toLowerCase());
    const id = text.slice(colon + 1).trim();
    if (def && id !== "") return { kind: def.kind, id: normaliseId(def.kind, id) };
    // A colon that names no kind is not a reference — fall through rather than
    // guess, so "note: see the board" never becomes an edge to a "note" artifact.
  }

  for (const def of REFERENCE_KINDS) {
    if (def.bareId?.test(text)) return { kind: def.kind, id: normaliseId(def.kind, text) };
  }
  return undefined;
}

/** Split the document into `## Heading` → body, lower-casing the headings. */
function sectionBody(markdown: string, heading: string): string | undefined {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const want = heading.toLowerCase();
  let collecting = false;
  const buf: string[] = [];
  for (const line of lines) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      if (collecting) break;
      collecting = h[1]!.trim().toLowerCase() === want;
      continue;
    }
    if (collecting) buf.push(line);
  }
  return collecting || buf.length ? buf.join("\n") : undefined;
}

/** A `## Related` line that could not be turned into an edge, and why. */
export interface UnresolvedReference {
  /** The list item as written, so a human can find and fix it. */
  line: string;
  reason: "unknown-kind" | "duplicate-target";
}

export interface ReferenceReport {
  refs: Reference[];
  /**
   * Lines the parser could not use. `parseReferences` drops these silently — which
   * is right for rendering a page and WRONG for judging whether the corpus is a
   * sound graph. A typo that quietly removes an edge is exactly the failure a mesh
   * cannot detect from the inside, so the integrity tooling reads this instead.
   */
  unresolved: UnresolvedReference[];
}

/**
 * Parse the `## Related` section, reporting what it could not use.
 *
 * Never throws and never partially fails. Duplicates (same kind + id) collapse to
 * the first, which keeps the mesh idempotent when two writers record the same edge.
 */
export function parseReferenceReport(markdown: string): ReferenceReport {
  const body = sectionBody(markdown, RELATED_HEADING);
  if (body === undefined) return { refs: [], unresolved: [] };

  const refs: Reference[] = [];
  const unresolved: UnresolvedReference[] = [];
  const seen = new Set<string>();
  for (const line of body.split("\n")) {
    const item = ITEM_RE.exec(line);
    if (!item) continue;
    const raw = item[1]!;
    const [head, ...rest] = raw.split(SPLIT_RE);
    const target = parseTarget(head ?? "");
    if (!target) {
      unresolved.push({ line: raw.trim(), reason: "unknown-kind" });
      continue;
    }
    const key = `${target.kind}:${target.id.toLowerCase()}`;
    if (seen.has(key)) {
      unresolved.push({ line: raw.trim(), reason: "duplicate-target" });
      continue;
    }
    seen.add(key);
    const { relation, rest: note } = splitRelation(rest.join(" — "));
    refs.push({ ...target, note, ...(relation ? { relation } : {}) });
  }
  return { refs, unresolved };
}

/**
 * Every reference in a document's `## Related` section, in document order.
 *
 * The forgiving read, for rendering: unusable lines are dropped. Use
 * `parseReferenceReport` when the drops themselves matter.
 */
export function parseReferences(markdown: string): Reference[] {
  return parseReferenceReport(markdown).refs;
}

// ----------------------------------------------------------------- serialize

/** One reference as its markdown line. */
export function serializeReference(ref: Reference): string {
  const def = BY_KIND.get(ref.kind);
  // A demand keeps the bare form the spec wrote; everything else is prefixed.
  const target = ref.kind === "demand" ? ref.id : `${def?.prefix ?? ref.kind}:${ref.id}`;
  const note = joinRelation(ref.relation, ref.note);
  return note ? `- ${target} — ${note}` : `- ${target}`;
}

/** The body of a `## Related` section. Round-trips with `parseReferences`. */
export function serializeReferences(refs: readonly Reference[]): string {
  return refs.map(serializeReference).join("\n");
}

// -------------------------------------------------------------------- write

/**
 * Replace the document's `## Related` section, inserting it in spec position when
 * it is not there yet. Section-surgical, like `lib/demand-edit.ts`: nothing
 * outside the section is touched, so a rewrite can never disturb State or Gates.
 *
 * An empty reference list removes the section rather than leaving an empty
 * heading — a `## Related` with nothing under it reads as "checked, none found",
 * which is a claim this function is in no position to make.
 */
export function setReferences(markdown: string, refs: readonly Reference[]): string {
  const src = String(markdown ?? "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.+?)\s*$/.exec(lines[i]!);
    if (!h) continue;
    if (start >= 0) { end = i; break; }
    if (h[1]!.trim().toLowerCase() === RELATED_HEADING.toLowerCase()) start = i;
  }

  const block = refs.length ? [`## ${RELATED_HEADING}`, "", serializeReferences(refs), ""] : [];

  if (start >= 0) {
    const next = [...lines.slice(0, start), ...block, ...lines.slice(end)];
    return next.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  }
  if (!refs.length) return src;

  // Not present — insert before the first section it must precede, else append.
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    const h = /^##\s+(.+?)\s*$/.exec(lines[i]!);
    if (h && BEFORE.some((b) => b.toLowerCase() === h[1]!.trim().toLowerCase())) { at = i; break; }
  }
  const next = at >= 0 ? [...lines.slice(0, at), ...block, ...lines.slice(at)] : [...lines, "", ...block];
  return next.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
}

/**
 * Record an edge, idempotently. An existing reference to the same target keeps its
 * place; its note is refreshed only when the caller supplies one, so a re-run of
 * an automated writer never blanks a note a human improved by hand.
 */
export function addReference(markdown: string, ref: Reference): string {
  const refs = parseReferences(markdown);
  const at = refs.findIndex((r) => r.kind === ref.kind && r.id.toLowerCase() === ref.id.toLowerCase());
  if (at < 0) return setReferences(markdown, [...refs, ref]);
  const note = ref.note.trim();
  const sameRelation = (ref.relation ?? undefined) === (refs[at]!.relation ?? undefined);
  if ((note === "" || note === refs[at]!.note) && sameRelation) return markdown;
  const next = [...refs];
  next[at] = { ...refs[at]!, ...(note ? { note } : {}), ...(ref.relation ? { relation: ref.relation } : {}) };
  return setReferences(markdown, next);
}

/** Drop an edge. Absent target → document unchanged. */
export function removeReference(markdown: string, kind: ReferenceKind, id: string): string {
  const refs = parseReferences(markdown);
  const next = refs.filter((r) => !(r.kind === kind && r.id.toLowerCase() === id.toLowerCase()));
  return next.length === refs.length ? markdown : setReferences(markdown, next);
}
