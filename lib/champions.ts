/**
 * Digital Champions — the hub-and-spoke network, and where it has holes.
 *
 * The operating model only scales if the hub stops being the bottleneck: work is
 * carried locally by named people, and the central unit supports rather than
 * executes. That model is currently invisible. A process engagement records an
 * `owner` (the spoke, who can decide a change) and a `champion` (who has capacity
 * to carry it), but only as free text on one engagement — so nobody can answer
 * "which plants have nobody?", which is the question the model lives or dies on.
 *
 * This module answers it. A champion is a RECORD; coverage is computed against the
 * plants and domains the portal already knows; and load is counted from the work
 * actually attributed to a person.
 *
 * WHAT THIS DELIBERATELY IS NOT — and the constraint is the same one the Persona
 * Analyst carries, for the same reason:
 *   - not a leaderboard. There is no ranking of people by volume, no "top
 *     champion", no score. Load is reported so the hub can SUPPORT someone who is
 *     carrying too much, not compare them with a colleague.
 *   - not a performance record. Everything here describes coverage of the
 *     ORGANISATION, which is the hub's responsibility, not the individual's.
 * A gap is a finding about the network. It is never a finding about a person.
 *
 * Pure and deterministic; the store is `champions-store.ts`.
 */

export const CHAMPION_ROLES = ["spoke", "champion", "hub"] as const;
export type ChampionRole = (typeof CHAMPION_ROLES)[number];

/** What each role means, in the words the operating model uses. */
export const ROLE_MEANING: Record<ChampionRole, string> = {
  spoke: "Can decide a change to a process in their area. Without one, there is no intake.",
  champion: "Has capacity to carry the work locally. Without one, the hub carries it.",
  hub: "Central digital unit. Supports; does not own the process.",
};

export interface Champion {
  /** Stable id, `C-01`. */
  id: string;
  name: string;
  /** Work address — how the hub reaches them, and the key demands are matched on. */
  email: string;
  role: ChampionRole;
  /** Plant/site they cover. Empty means organisation-wide (usually hub). */
  plants: string[];
  /** Domains they cover. Empty means all domains at their plant. */
  domains: string[];
  /** Free text: how much time they actually have. The honest field. */
  capacity: string;
  /** ISO date they took the role. */
  since?: string;
  /** Set when they hand it back — coverage then reads as a gap, which is the point. */
  until?: string;
  notes: string;
  updatedAt?: string;
}

/** What a champion is carrying right now. A support signal, never a score. */
export interface ChampionLoad {
  championId: string;
  /** Process engagements where they are the spoke (owner). */
  engagementsOwned: number;
  /** Process engagements where they are the named champion. */
  engagementsChampioned: number;
  /** Demands they raised in the funnel. */
  demandsRaised: number;
  /** Engagement titles, so the hub can see WHAT rather than only how much. */
  carrying: string[];
}

/** One cell of the coverage map: a plant × domain pair, and who covers it. */
export interface CoverageCell {
  plant: string;
  domain: string;
  /** Ids of active champions covering this cell. Empty = a hole in the network. */
  covered: string[];
  /** True when a SPOKE covers it — without one there is no intake here at all. */
  hasSpoke: boolean;
}

export interface CoverageReport {
  cells: CoverageCell[];
  /** Cells nobody covers — the work list, ordered plant then domain. */
  gaps: CoverageCell[];
  /** Cells with a champion but no spoke: work can be carried, nothing decided. */
  spokeless: CoverageCell[];
  plantsCovered: number;
  plantsTotal: number;
  /** 0..1 share of plant × domain cells with at least one active champion. */
  coverage: number;
}

// ── ids ────────────────────────────────────────────────────────────────────────

const ID_RE = /^C-(\d{2,})$/;

export function isChampionId(v: string): boolean {
  return ID_RE.test((v ?? "").trim());
}

export function nextChampionId(existing: string[]): string {
  const max = existing.reduce((acc, id) => {
    const m = ID_RE.exec((id ?? "").trim());
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `C-${String(max + 1).padStart(2, "0")}`;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const norm = (s: string | undefined): string => (s ?? "").trim().toLowerCase();

/** Active on a given date: started, and not yet handed back. */
export function isActive(c: Champion, on: string): boolean {
  if (c.since && c.since > on) return false;
  return !(c.until && c.until <= on);
}

/**
 * Does this champion cover a plant × domain cell? An empty list means "all" —
 * a hub role with no plants covers every plant, which is exactly the situation
 * the model is trying to grow out of, so it still counts as coverage but the
 * report separates it out through `hasSpoke`.
 */
export function covers(c: Champion, plant: string, domain: string): boolean {
  const plantOk = c.plants.length === 0 || c.plants.some((p) => norm(p) === norm(plant));
  const domainOk = c.domains.length === 0 || c.domains.some((d) => norm(d) === norm(domain));
  return plantOk && domainOk;
}

// ── coverage ──────────────────────────────────────────────────────────────────

/**
 * The coverage map over every plant × domain the organisation runs.
 *
 * Reported as a grid rather than a total, because a single percentage hides the
 * shape of the hole: 80 % coverage with one entirely uncovered plant is a
 * different problem from 80 % spread evenly, and only the first has a site where
 * nobody can raise anything.
 */
export function buildCoverage(
  champions: Champion[],
  plants: string[],
  domains: string[],
  on: string,
): CoverageReport {
  const active = champions.filter((c) => isActive(c, on));
  const cells: CoverageCell[] = [];

  for (const plant of plants) {
    for (const domain of domains) {
      const here = active.filter((c) => covers(c, plant, domain));
      cells.push({
        plant,
        domain,
        covered: here.map((c) => c.id).sort(),
        hasSpoke: here.some((c) => c.role === "spoke"),
      });
    }
  }

  const gaps = cells.filter((c) => c.covered.length === 0);
  const spokeless = cells.filter((c) => c.covered.length > 0 && !c.hasSpoke);
  const plantsCovered = plants.filter((p) => cells.some((c) => c.plant === p && c.covered.length > 0)).length;

  return {
    cells,
    gaps,
    spokeless,
    plantsCovered,
    plantsTotal: plants.length,
    coverage: cells.length === 0 ? 0 : (cells.length - gaps.length) / cells.length,
  };
}

// ── load ──────────────────────────────────────────────────────────────────────

/** The minimum an engagement has to expose for load to be attributable. */
export interface EngagementRef {
  slug: string;
  title: string;
  owner: string;
  champion: string;
}

/**
 * What each champion is carrying, matched on email first and name second — the
 * process funnel records a free-text owner, so a name is often all there is.
 *
 * Returned in the champions' own id order, NOT sorted by load. Sorting people by
 * how much they carry is the first step to reading this as a ranking, and it is
 * not one: the number exists so the hub can offer help.
 */
export function buildLoads(
  champions: Champion[],
  engagements: EngagementRef[],
  demandRequesters: string[],
): ChampionLoad[] {
  return champions.map((c) => {
    const keys = [norm(c.email), norm(c.name)].filter((k) => k !== "");
    const matches = (v: string) => keys.includes(norm(v));

    const owned = engagements.filter((e) => matches(e.owner));
    const championed = engagements.filter((e) => matches(e.champion));
    return {
      championId: c.id,
      engagementsOwned: owned.length,
      engagementsChampioned: championed.length,
      demandsRaised: demandRequesters.filter(matches).length,
      carrying: [...new Set([...owned, ...championed].map((e) => e.title))].sort((a, b) => a.localeCompare(b)),
    };
  });
}

// ── candidates ────────────────────────────────────────────────────────────────

export interface ChampionCandidate {
  name: string;
  /** Where they already appear: as a process owner, a champion, or a requester. */
  seenAs: string[];
  /** How many times, across everything — evidence they are already doing the work. */
  occurrences: number;
}

/**
 * People already acting like champions who are not in the register.
 *
 * The register's failure mode is being a wish-list nobody maintains. Everyone who
 * already owns a process, is already named as a champion, or already raises
 * demands is doing the job whether or not a record says so — surfacing them turns
 * "who should we ask?" into "who is already doing it?".
 *
 * Alphabetical, never by count: this is a list of people to talk to, not a
 * shortlist ordered by keenness.
 */
export function findCandidates(
  champions: Champion[],
  engagements: EngagementRef[],
  demandRequesters: string[],
): ChampionCandidate[] {
  const known = new Set(champions.flatMap((c) => [norm(c.email), norm(c.name)]).filter((k) => k !== ""));
  const seen = new Map<string, { display: string; roles: Set<string>; n: number }>();

  const note = (raw: string, as: string) => {
    const key = norm(raw);
    if (key === "" || known.has(key)) return;
    const hit = seen.get(key) ?? { display: raw.trim(), roles: new Set<string>(), n: 0 };
    hit.roles.add(as);
    hit.n += 1;
    seen.set(key, hit);
  };

  for (const e of engagements) {
    note(e.owner, "process owner");
    note(e.champion, "named champion");
  }
  for (const r of demandRequesters) note(r, "raises demands");

  return [...seen.values()]
    .map((v) => ({ name: v.display, seenAs: [...v.roles].sort(), occurrences: v.n }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── validation ────────────────────────────────────────────────────────────────

export interface ChampionValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateChampion(c: Partial<Champion>): ChampionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if ((c.name ?? "").trim() === "") errors.push("A champion needs a name — the register exists to reach a person.");
  if (c.role && !CHAMPION_ROLES.includes(c.role)) errors.push(`Unknown role "${c.role}".`);
  if ((c.email ?? "").trim() !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((c.email ?? "").trim())) {
    errors.push("That does not look like an email address.");
  }
  if (c.since && c.until && c.until < c.since) errors.push("The end date is before the start date.");

  if ((c.email ?? "").trim() === "") {
    warnings.push("No email — load can only be matched on the name, which is fragile.");
  }
  if (c.role === "spoke" && (c.plants ?? []).length === 0) {
    warnings.push("A spoke covering every plant is usually the hub wearing a spoke's hat.");
  }
  if ((c.capacity ?? "").trim() === "") {
    warnings.push("No capacity recorded — the register cannot tell who to stop asking.");
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function completeChampion(input: Partial<Champion>, id: string, now?: string): Champion {
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter((x) => x !== "") : [];
  return {
    id,
    name: (input.name ?? "").trim(),
    email: (input.email ?? "").trim(),
    role: input.role && CHAMPION_ROLES.includes(input.role) ? input.role : "champion",
    plants: list(input.plants),
    domains: list(input.domains),
    capacity: (input.capacity ?? "").trim(),
    ...(input.since?.trim() ? { since: input.since.trim() } : {}),
    ...(input.until?.trim() ? { until: input.until.trim() } : {}),
    notes: (input.notes ?? "").trim(),
    ...(now ? { updatedAt: now } : {}),
  };
}
