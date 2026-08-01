import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { renderPersona, validatePersona } from "@/lib/persona-library";
import { isRetired, readPersona, retirePersona, writePersona } from "@/lib/persona-library-store";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(e: unknown): NextResponse {
  const err = e as Error & { status?: number };
  return NextResponse.json({ error: err.message }, { status: err.status ?? 500 });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: t("api.notAuthenticated", "not authenticated") }, { status: 401 });
  const p = await readPersona(params.id).catch(() => null);
  if (!p) return NextResponse.json({ error: t("api.personas.noSuchPersona", "no such persona") }, { status: 404 });
  // `markdown` is the record itself — the same bytes git holds, so a reader can
  // check the rendering against the source without a second endpoint.
  return NextResponse.json({ persona: { ...p, retired: isRetired(p) }, markdown: renderPersona(p) });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: `${t("api.missingCapability", "missing capability:")} draft` }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const current = await readPersona(params.id).catch(() => null);
  if (!current) return NextResponse.json({ error: t("api.personas.noSuchPersona", "no such persona") }, { status: 404 });

  // Validate the MERGED record: a patch that only touches one field must still
  // leave a persona a story can be written against.
  const check = validatePersona({ ...current, ...body });
  if (!check.ok) return NextResponse.json({ error: check.errors.join(" "), errors: check.errors }, { status: 400 });

  try {
    const p = await writePersona(params.id, body, new Date().toISOString());
    return NextResponse.json({ persona: p, warnings: check.warnings });
  } catch (e) {
    return fail(e);
  }
}

/**
 * Retire, never delete: a requirements document written last year still cites the
 * id, and a citation that resolves to nothing is a worse document than one that
 * resolves to "retired, and here is why".
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: `${t("api.missingCapability", "missing capability:")} draft` }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  try {
    const p = await retirePersona(params.id, String(body.reason ?? ""), new Date().toISOString());
    return NextResponse.json({ persona: p, retired: true });
  } catch (e) {
    return fail(e);
  }
}
