import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import {
  getAllCategories, getCategories, saveCategories, resetCategories, categoriesEditable, isCategoryKind,
  normalizeCategoryList, seedFor, blockedPlantRemovals, plantsInUse,
} from "@/lib/category-store";

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
  const session = await getSession();
  if (!can(session, "all")) {
    return NextResponse.json({ ok: false, error: "Only an administrator can manage categories." }, { status: 403 });
  }

  let body: { kind?: string; values?: unknown; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const kind = String(body.kind ?? "");
  if (!isCategoryKind(kind)) {
    return NextResponse.json({ ok: false, error: "kind must be 'plant' or 'domain'." }, { status: 400 });
  }

  // Determine the proposed next list (reset → seed) so we can guard plant removals.
  const isReset = body.action === "reset";
  if (!isReset && !Array.isArray(body.values)) {
    return NextResponse.json({ ok: false, error: "values must be an array of strings." }, { status: 400 });
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
        error: `These plants can't be removed — reassign their demands first (or "ALL" is protected): ${blocked.join(", ")}.`,
        blocked,
      }, { status: 409 });
    }
  }

  const result = isReset ? await resetCategories(kind) : await saveCategories(kind, next);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, kind, values: result.values });
}
