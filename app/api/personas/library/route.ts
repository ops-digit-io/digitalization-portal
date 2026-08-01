import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { validatePersona } from "@/lib/persona-library";
import { createPersona, isRetired, listPersonas } from "@/lib/persona-library-store";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The persona library — the governed vocabulary requirements are written in.
 * Readable by anyone who can see the board (a persona is about serving people,
 * so the people concerned must be able to read their own record); writable by
 * `draft` holders.
 */
export async function GET() {
  const t = getT();
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: t("api.notAuthenticated", "not authenticated") }, { status: 401 });
  const personas = await listPersonas();
  return NextResponse.json({
    personas: personas.map((p) => ({ ...p, retired: isRetired(p) })),
    counts: { total: personas.length },
  });
}

export async function POST(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: `${t("api.missingCapability", "missing capability:")} draft` }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const check = validatePersona(body);
  if (!check.ok) return NextResponse.json({ error: check.errors.join(" "), errors: check.errors }, { status: 400 });

  const p = await createPersona(body, new Date().toISOString());
  // Warnings ride along with the created record rather than blocking it: a form
  // that refuses until every box is full gets filled with invented content.
  return NextResponse.json({ persona: p, warnings: check.warnings }, { status: 201 });
}
