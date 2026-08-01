import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import {
  getAllCategories, getCategories, saveCategories, resetCategories, categoriesEditable, isCategoryKind,
  normalizeCategoryList, seedFor, blockedPlantRemovals, plantsInUse, PROTECTED_PLANTS,
} from "@/lib/category-store";
import { reassignPlant } from "@/lib/plant-reassign";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reference categories (plants, domains) for the selection dropdowns. GET is open —
 * these are just the lists a form offers. Writes are admin-only (`can(session,"all")`):
 * only an administrator manages what categories exist.
 */
export async function GET() {
  const categories = await getAllCategories();
  return NextResponse.json({ ok: true, categories, editable: categoriesEditable() });
}

export async function POST(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "all")) {
    return NextResponse.json({ ok: false, error: t("api.categories.adminOnly", "Only an administrator can manage categories.") }, { status: 403 });
  }

  let body: { kind?: string; values?: unknown; action?: string; from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }

  // Reassign & retire: move every demand from one plant to another, then remove the
  // old plant. The guided alternative to a hard-blocked removal.
  if (body.action === "reassign_plant") {
    const from = String(body.from ?? "").trim();
    const to = String(body.to ?? "").trim();
    if (from === "" || to === "") return NextResponse.json({ ok: false, error: t("api.categories.fromToRequired", "from and to are required.") }, { status: 400 });
    if (from.toLowerCase() === to.toLowerCase()) return NextResponse.json({ ok: false, error: t("api.categories.chooseDifferentPlant", "Choose a different destination plant.") }, { status: 400 });
    if (PROTECTED_PLANTS.has(from.toUpperCase())) return NextResponse.json({ ok: false, error: `"${from}" ${t("api.categories.protectedScope", "is a protected scope and can't be retired.")}` }, { status: 400 });
    if (!categoriesEditable()) return NextResponse.json({ ok: false, error: t("api.categories.editingNotConfigured", "Category editing isn't configured (set KV_REST_API_URL / KV_REST_API_TOKEN).") }, { status: 400 });

    const current = await getCategories("plant");
    const known = new Set(current.map((p) => p.toLowerCase()));
    if (!known.has(to.toLowerCase())) return NextResponse.json({ ok: false, error: `${t("api.categories.destination", "Destination")} "${to}" ${t("api.categories.notKnownPlant", "is not a known plant.")}` }, { status: 400 });

    const date = new Date().toISOString().slice(0, 10);
    const { reassigned } = await reassignPlant(from, to, { actor: session.user, date });
    // The old plant is now unused → safe to retire from the managed list.
    const nextPlants = current.filter((p) => p.toLowerCase() !== from.toLowerCase());
    const saved = nextPlants.length > 0 ? await saveCategories("plant", nextPlants) : { ok: true as const, values: current };
    if (!saved.ok) return NextResponse.json({ ok: false, error: saved.reason }, { status: 400 });
    return NextResponse.json({ ok: true, reassigned, from, to, values: saved.values });
  }

  const kind = String(body.kind ?? "");
  if (!isCategoryKind(kind)) {
    return NextResponse.json({ ok: false, error: t("api.categories.kindPlantOrDomain", "kind must be 'plant' or 'domain'.") }, { status: 400 });
  }

  // Determine the proposed next list (reset → seed) so we can guard plant removals.
  const isReset = body.action === "reset";
  if (!isReset && !Array.isArray(body.values)) {
    return NextResponse.json({ ok: false, error: t("api.categories.valuesArray", "values must be an array of strings.") }, { status: 400 });
  }
  const next = isReset ? seedFor(kind) : normalizeCategoryList((body.values as unknown[]).map((x) => String(x)));

  // Guard: a plant that a demand still uses (or the protected "ALL" scope) cannot be
  // removed — doing so would orphan that demand and strand its plant-scoped RBAC.
  if (kind === "plant") {
    const [current, inUse] = await Promise.all([getCategories("plant"), plantsInUse()]);
    const blocked = blockedPlantRemovals(current, next, inUse);
    if (blocked.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `${t("api.categories.plantsCantBeRemoved", "These plants can't be removed — reassign their demands first (or \"ALL\" is protected):")} ${blocked.join(", ")}.`,
        blocked,
      }, { status: 409 });
    }
  }

  const result = isReset ? await resetCategories(kind) : await saveCategories(kind, next);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, kind, values: result.values });
}
