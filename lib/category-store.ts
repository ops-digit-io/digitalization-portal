/**
 * Admin-managed reference categories — the values offered in the portal's selection
 * dropdowns (plants and domains).
 *
 * These used to be hardcoded `as const` tuples in `lib/demand.ts` (and the intended
 * `registry/plants.md` / `registry/domains.md` masters were never actually read).
 * They are now editable by an admin: the managed list persists in KV and is served to
 * every dropdown, with the original constants kept as the SEED / fallback so nothing
 * breaks when KV isn't provisioned and so existing demands still round-trip (the
 * deterministic `buildDemand`/`classifyDemand` never validated against these lists —
 * they only decide what a user may pick).
 *
 * Deliberately excludes LANES: a lane is a structural enum wired into repository
 * provisioning, triage routing, and RBAC gates (`lib/lanes.ts`, `lib/rbac.ts`) — not
 * a free reference label — so it stays in code.
 *
 * Degradation mirrors the rest of the app: with KV configured, edits persist and are
 * live for everyone; without it, the seed is served read-only (editing is refused
 * with a clear reason, the same inert-but-ready shape as file attachments).
 */

import { kvConfigured, kvCommand } from "./kv.js";
import { PLANTS, DOMAINS } from "./demand.js";
import { ROLES } from "./rbac.js";
import { listDemandRows } from "./demands-store.js";

export type CategoryKind = "plant" | "domain";
export const CATEGORY_KINDS: readonly CategoryKind[] = ["plant", "domain"];

export const CATEGORY_LABEL: Record<CategoryKind, { singular: string; plural: string }> = {
  plant: { singular: "plant", plural: "Plants" },
  domain: { singular: "domain", plural: "Domains" },
};

/** The seed each category falls back to — the original hardcoded values. */
export const CATEGORY_SEED: Record<CategoryKind, readonly string[]> = {
  plant: PLANTS,
  domain: DOMAINS,
};

export function isCategoryKind(v: string): v is CategoryKind {
  return (CATEGORY_KINDS as readonly string[]).includes(v);
}

function kvKey(kind: CategoryKind): string {
  return `categories:${kind}`;
}

export function seedFor(kind: CategoryKind): string[] {
  return [...CATEGORY_SEED[kind]];
}

/**
 * Sanitise a proposed category list: trim, drop empties, values with table/newline
 * characters, and over-long entries, and de-duplicate case-insensitively while
 * preserving the first spelling and order. Pure.
 */
export function normalizeCategoryList(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = (raw ?? "").trim();
    if (v === "" || v.length > 40 || /[|\n\r]/.test(v)) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * The values offered for a category — the managed list from KV if present and
 * non-empty, else the seed. Never throws: any KV error falls back to the seed, so a
 * dropdown always has options.
 */
export async function getCategories(kind: CategoryKind): Promise<string[]> {
  if (!kvConfigured()) return seedFor(kind);
  try {
    const raw = await kvCommand<string | null>(["GET", kvKey(kind)]);
    if (!raw) return seedFor(kind);
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = normalizeCategoryList(parsed.map((x) => String(x)));
      if (clean.length > 0) return clean;
    }
    return seedFor(kind);
  } catch {
    return seedFor(kind);
  }
}

/** All managed categories at once, for a form that needs several. */
export async function getAllCategories(): Promise<Record<CategoryKind, string[]>> {
  const [plant, domain] = await Promise.all([getCategories("plant"), getCategories("domain")]);
  return { plant, domain };
}

/** Whether a category is currently editable (i.e. a durable backend is configured). */
export function categoriesEditable(): boolean {
  return kvConfigured();
}

export type CategorySaveResult = { ok: true; values: string[] } | { ok: false; reason: string };

/** Replace a category's managed list (admin only — the route enforces authority). */
export async function saveCategories(kind: CategoryKind, values: string[]): Promise<CategorySaveResult> {
  const clean = normalizeCategoryList(values);
  if (clean.length === 0) return { ok: false, reason: "At least one value is required." };
  if (!categoriesEditable()) {
    return { ok: false, reason: "Category editing isn't configured (set KV_REST_API_URL / KV_REST_API_TOKEN). The seed values are read-only until then." };
  }
  await kvCommand(["SET", kvKey(kind), JSON.stringify(clean)]);
  return { ok: true, values: clean };
}

/** Reset a category back to its seed (removes the managed override). */
export async function resetCategories(kind: CategoryKind): Promise<CategorySaveResult> {
  if (!categoriesEditable()) {
    return { ok: false, reason: "Category editing isn't configured (set KV_REST_API_URL / KV_REST_API_TOKEN)." };
  }
  await kvCommand(["DEL", kvKey(kind)]);
  return { ok: true, values: seedFor(kind) };
}

// ── Plant ↔ RBAC coupling & removal guards ──────────────────────────────────────

/** The plant-scoped role's base IdP group (champion), for building scope-group names. */
const PLANT_SCOPED_GROUP = ROLES.find((r) => r.scope === "plant")?.group ?? "DU-Portal-Champions";

/**
 * The IdP group that scopes the plant-scoped role to a plant. Adding a plant makes
 * this group meaningful: `resolveSession` only grants a plant scope for a KNOWN plant,
 * so the RBAC scope goes live once the admin adds the plant here. Surfaced in the admin
 * UI so an administrator knows exactly which group to grant.
 */
export function plantScopeGroup(plant: string): string {
  return `${PLANT_SCOPED_GROUP}-${plant}`;
}

/** Plants that must never be removed — structural, enterprise-wide scope. */
export const PROTECTED_PLANTS: ReadonlySet<string> = new Set(["ALL"]);

/**
 * Which plants a removal would strand and must therefore be blocked: a plant that is
 * still referenced by a demand (removing it would orphan that demand's classification
 * and its plant-scoped RBAC), or a protected plant. Pure, so it is unit-testable.
 */
export function blockedPlantRemovals(current: string[], next: string[], inUse: string[]): string[] {
  const nextSet = new Set(next.map((p) => p.trim().toLowerCase()));
  const inUseSet = new Set(inUse.map((p) => p.trim().toLowerCase()));
  const removed = current.filter((p) => !nextSet.has(p.trim().toLowerCase()));
  return removed.filter((p) => inUseSet.has(p.trim().toLowerCase()) || PROTECTED_PLANTS.has(p.trim().toUpperCase()));
}

/** The distinct plant codes currently referenced by demands in the funnel. */
export async function plantsInUse(): Promise<string[]> {
  const rows = await listDemandRows();
  const set = new Set<string>();
  for (const r of rows) {
    const p = (r.plant ?? "").trim();
    if (p !== "") set.add(p);
  }
  return [...set];
}
