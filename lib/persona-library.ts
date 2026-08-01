/**
 * The Persona Library — the governed vocabulary requirements are written in.
 *
 * A user story says "As a **maintenance planner**, I want …". Today that phrase is
 * a free string picked from a hardcoded list, which means two analysts writing
 * about the same person can mean different people, and nobody can check whether a
 * requirement actually serves them. This module makes the persona a RECORD with a
 * stable id, so a story cites `P-03` and everyone can read what P-03 wants, what
 * gets in their way, and who has to approve the spend.
 *
 * Two kinds, because a requirement needs both and they are not the same person:
 *   - `user`  — lives with the result. Their goals and frictions are the acceptance
 *               criteria.
 *   - `buyer` — decides whether it happens. Their triggers and objections are why
 *               the business case reads the way it does.
 * An `influencer` neither uses nor signs but can stop it (works council, IT
 * security, quality). Naming them is how a requirement stops being surprised late.
 *
 * The record is MARKDOWN, not JSON: it lands in git, a change is reviewable as a
 * diff, and a person who has never opened the portal can read their own persona
 * and say "that is not what my day looks like". `parsePersona`/`renderPersona`
 * round-trip, which is what makes the file the system of record rather than a
 * cache of one.
 *
 * Everything here is PURE. The store is `persona-library-store.ts`.
 */

export const PERSONA_KINDS = ["user", "buyer", "influencer"] as const;
export type PersonaKind = (typeof PERSONA_KINDS)[number];

/** How much of a decision this persona carries. Descriptive, not a rank. */
export const AUTHORITIES = ["decides", "approves budget", "influences", "uses", "must not be surprised"] as const;
export type Authority = (typeof AUTHORITIES)[number];

export interface Persona {
  /** Stable id, `P-01`. Requirements cite this; it never changes or is reused. */
  id: string;
  /** The role, as the business says it ("Maintenance Planner"). Not a job title. */
  name: string;
  kind: PersonaKind;
  /** What they carry in a decision. */
  authority: Authority;
  /** Domains this persona appears in (matches intake domains); empty = any. */
  domains: string[];
  /** Plants/sites where the role exists as described; empty = organisation-wide. */
  plants: string[];
  /** One sentence: who they are and what they are responsible for. */
  summary: string;
  /** What they are trying to achieve — the "so that" half of a user story. */
  goals: string[];
  /** What gets in the way today. The acceptance criteria answer these. */
  frictions: string[];
  /** Systems and tools they work in — the integration surface, named early. */
  systems: string[];
  /** How THEY would know it worked. Not the project's KPI — theirs. */
  successLooksLike: string[];
  /** buyer/influencer: what makes them say yes now rather than next year. */
  triggers: string[];
  /** buyer/influencer: what they say no to, and why. Costs least to hear early. */
  objections: string[];
  /** Verbatim from a real conversation, if one happened. Quoted, never invented. */
  quote?: string;
  /** Who described this persona, so a reader can go back and ask. */
  sourcedFrom?: string;
  updatedAt?: string;
}

export interface PersonaValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// ── ids ────────────────────────────────────────────────────────────────────────

const ID_RE = /^P-(\d{2,})$/;

export function isPersonaId(v: string): boolean {
  return ID_RE.test((v ?? "").trim());
}

/**
 * The next free id. Ids are never reused: a retired persona's number stays spent,
 * because a requirement written last year still cites it and must keep resolving
 * to the same person.
 */
export function nextPersonaId(existing: string[]): string {
  const max = existing.reduce((acc, id) => {
    const m = ID_RE.exec((id ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `P-${String(max + 1).padStart(2, "0")}`;
}

// ── validation ────────────────────────────────────────────────────────────────

const MAX_NAME = 60;

/**
 * What a persona must carry to be usable in a requirement, and what merely makes
 * it better. The split matters: an over-strict form makes people invent content to
 * get past it, and an invented persona is worse than none.
 */
export function validatePersona(p: Partial<Persona>): PersonaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = (p.name ?? "").trim();

  if (name === "") errors.push("A persona needs a name — the role as the business says it.");
  else if (name.length > MAX_NAME) errors.push(`The name is longer than ${MAX_NAME} characters.`);
  if ((p.summary ?? "").trim() === "") errors.push("One sentence of summary: who they are and what they answer for.");
  if (!(p.goals ?? []).some((g) => g.trim() !== "")) errors.push("At least one goal — a story's 'so that' comes from here.");
  if (p.kind && !PERSONA_KINDS.includes(p.kind)) errors.push(`Unknown kind "${p.kind}".`);
  if (p.authority && !AUTHORITIES.includes(p.authority)) errors.push(`Unknown authority "${p.authority}".`);

  if (!(p.frictions ?? []).some((f) => f.trim() !== "")) {
    warnings.push("No frictions recorded — acceptance criteria have nothing to bite on.");
  }
  if (!(p.systems ?? []).some((s) => s.trim() !== "")) {
    warnings.push("No systems named — the integration surface stays a surprise.");
  }
  if ((p.kind === "buyer" || p.kind === "influencer") && !(p.objections ?? []).some((o) => o.trim() !== "")) {
    warnings.push("A buyer or influencer with no recorded objection is usually one nobody has asked.");
  }
  if (!(p.sourcedFrom ?? "").trim()) {
    warnings.push("No source recorded — a persona nobody can trace back is a guess with a number on it.");
  }
  return { ok: errors.length === 0, errors, warnings };
}

// ── markdown round-trip ───────────────────────────────────────────────────────

const LIST_FIELDS = [
  ["Goals", "goals"],
  ["Frictions", "frictions"],
  ["Systems", "systems"],
  ["Success looks like", "successLooksLike"],
  ["Triggers", "triggers"],
  ["Objections", "objections"],
] as const;

function bullets(items: string[]): string {
  const clean = items.map((i) => i.trim()).filter((i) => i !== "");
  return clean.length ? clean.map((i) => `- ${i}`).join("\n") : "_none recorded_";
}

/** The persona as its file. This IS the record — the UI renders from it. */
export function renderPersona(p: Persona): string {
  const csv = (v: string[]) => (v.length ? v.join(", ") : "—");
  const out: string[] = [
    `# ${p.id} · ${p.name}`,
    "",
    `**Kind:** ${p.kind}`,
    `**Authority:** ${p.authority}`,
    `**Domains:** ${csv(p.domains)}`,
    `**Plants:** ${csv(p.plants)}`,
    ...(p.sourcedFrom ? [`**Sourced from:** ${p.sourcedFrom}`] : []),
    ...(p.updatedAt ? [`**Updated:** ${p.updatedAt}`] : []),
    "",
    "## Summary",
    "",
    p.summary || "_not recorded_",
    "",
  ];
  for (const [heading, key] of LIST_FIELDS) {
    out.push(`## ${heading}`, "", bullets(p[key] as string[]), "");
  }
  if (p.quote?.trim()) out.push("## Quote", "", `> ${p.quote.trim()}`, "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function section(md: string, heading: string): string {
  // The terminator is "the next ## heading, or the end of the input". `$` alone
  // would stop at the first line break under /m, and `\Z` is not a JavaScript
  // escape at all — it matches a literal Z, which silently drops the LAST
  // section of every file.
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "im");
  return re.exec(md)?.[1]?.trim() ?? "";
}

function listOf(md: string, heading: string): string[] {
  const body = section(md, heading);
  if (body === "" || /^_none recorded_$/i.test(body)) return [];
  return body
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter((l) => l !== "" && !/^_.*_$/.test(l));
}

function field(md: string, label: string): string {
  const re = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, "im");
  const v = re.exec(md)?.[1]?.trim() ?? "";
  return v === "—" ? "" : v;
}

function csvField(md: string, label: string): string[] {
  const v = field(md, label);
  return v === "" ? [] : v.split(",").map((s) => s.trim()).filter((s) => s !== "");
}

/** Parse a persona file back into a record. Round-trips with `renderPersona`. */
export function parsePersona(md: string): Persona {
  const head = /^#\s*(P-\d{2,})\s*·\s*(.+)$/im.exec(md);
  const kindRaw = field(md, "Kind").toLowerCase();
  const authRaw = field(md, "Authority").toLowerCase();
  const summaryBody = section(md, "Summary");
  const quoteBody = section(md, "Quote").replace(/^>\s?/gm, "").trim();

  const p: Persona = {
    id: head?.[1]?.trim() ?? "",
    name: head?.[2]?.trim() ?? "",
    kind: (PERSONA_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as PersonaKind) : "user",
    authority: (AUTHORITIES as readonly string[]).includes(authRaw) ? (authRaw as Authority) : "uses",
    domains: csvField(md, "Domains"),
    plants: csvField(md, "Plants"),
    summary: /^_not recorded_$/i.test(summaryBody) ? "" : summaryBody,
    goals: listOf(md, "Goals"),
    frictions: listOf(md, "Frictions"),
    systems: listOf(md, "Systems"),
    successLooksLike: listOf(md, "Success looks like"),
    triggers: listOf(md, "Triggers"),
    objections: listOf(md, "Objections"),
  };
  if (quoteBody !== "") p.quote = quoteBody;
  const src = field(md, "Sourced from");
  if (src !== "") p.sourcedFrom = src;
  const upd = field(md, "Updated");
  if (upd !== "") p.updatedAt = upd;
  return p;
}

/** Fill a partial into a complete persona — the single place defaults are decided. */
export function completePersona(input: Partial<Persona>, id: string, now?: string): Persona {
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter((x) => x !== "") : [];
  return {
    id,
    name: (input.name ?? "").trim(),
    kind: input.kind && PERSONA_KINDS.includes(input.kind) ? input.kind : "user",
    authority: input.authority && AUTHORITIES.includes(input.authority) ? input.authority : "uses",
    domains: list(input.domains),
    plants: list(input.plants),
    summary: (input.summary ?? "").trim(),
    goals: list(input.goals),
    frictions: list(input.frictions),
    systems: list(input.systems),
    successLooksLike: list(input.successLooksLike),
    triggers: list(input.triggers),
    objections: list(input.objections),
    ...(input.quote?.trim() ? { quote: input.quote.trim() } : {}),
    ...(input.sourcedFrom?.trim() ? { sourcedFrom: input.sourcedFrom.trim() } : {}),
    ...(now ? { updatedAt: now } : {}),
  };
}

// ── selection (what requirements actually call) ───────────────────────────────

/**
 * The personas that apply to a domain, most specific first: a persona naming the
 * domain outranks an organisation-wide one, and within each group `user` comes
 * before `buyer` because stories are written from the user's side.
 *
 * Ordering is total and deterministic — the same demand must produce the same
 * requirements document twice, or the diff between two runs is unreadable.
 */
export function personasForDomain(all: Persona[], domain: string): Persona[] {
  const d = (domain ?? "").trim().toLowerCase();
  const applies = all.filter((p) => p.domains.length === 0 || p.domains.some((x) => x.toLowerCase() === d));
  const kindRank: Record<PersonaKind, number> = { user: 0, buyer: 1, influencer: 2 };
  return applies.sort((a, b) => {
    const aSpecific = a.domains.some((x) => x.toLowerCase() === d) ? 0 : 1;
    const bSpecific = b.domains.some((x) => x.toLowerCase() === d) ? 0 : 1;
    return aSpecific - bSpecific || kindRank[a.kind] - kindRank[b.kind] || a.id.localeCompare(b.id);
  });
}

/** "P-03 · Maintenance Planner" — how a persona is cited in a story. */
export function citePersona(p: Persona): string {
  return `${p.id} · ${p.name}`;
}

/**
 * Resolve a story's persona string back to a library record. Accepts a citation
 * ("P-03 · Maintenance Planner"), a bare id, or a name — so documents written
 * before the library existed still link up instead of silently losing the person.
 */
export function resolvePersona(all: Persona[], ref: string): Persona | undefined {
  const v = (ref ?? "").trim();
  if (v === "") return undefined;
  const id = /^(P-\d{2,})/i.exec(v)?.[1]?.toUpperCase();
  if (id) return all.find((p) => p.id.toUpperCase() === id);
  const lower = v.toLowerCase();
  return all.find((p) => p.name.toLowerCase() === lower);
}

/**
 * Which personas a requirements document leans on but the library does not
 * define. This is the standardization check: an unresolved persona means a story
 * is written about somebody nobody has described.
 */
export function unknownPersonaRefs(all: Persona[], refs: string[]): string[] {
  const missing = refs
    .map((r) => r.trim())
    .filter((r) => r !== "" && resolvePersona(all, r) === undefined);
  return [...new Set(missing)].sort((a, b) => a.localeCompare(b));
}
