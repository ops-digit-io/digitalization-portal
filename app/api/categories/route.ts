import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import {
  getAllCategories, saveCategories, resetCategories, categoriesEditable, isCategoryKind,
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

  if (body.action === "reset") {
    const result = await resetCategories(kind);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true, kind, values: result.values });
  }

  if (!Array.isArray(body.values)) {
    return NextResponse.json({ ok: false, error: "values must be an array of strings." }, { status: 400 });
  }
  const result = await saveCategories(kind, body.values.map((x) => String(x)));
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true, kind, values: result.values });
}
