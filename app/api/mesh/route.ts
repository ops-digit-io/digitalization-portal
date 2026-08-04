import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { loadNeighbourhood } from "@/lib/mesh-store";
import { parseTarget, REFERENCE_KINDS, type ReferenceKind } from "@/lib/references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An artifact's neighbourhood in the context mesh — what it references, and what
 * references it.
 *
 * Exists because the mesh has more than one consumer. Server pages call
 * `loadNeighbourhood` directly, but client pages (the process engagement view) and
 * agent tools cannot, and both want the same answer. Read-only by construction:
 * writing an edge goes through the artifact that owns it, never through here.
 *
 * Scoped to `view_board` like the rest of the portfolio surface. It reports edges,
 * not content — a reference to a confidential case reveals that the case exists and
 * is related, which is what the board already shows to the same audience.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "").trim().toLowerCase();
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Accept an explicit kind, or infer it from the id's shape the way a reference
  // written by hand is resolved — one grammar, not two.
  const known = REFERENCE_KINDS.some((k) => k.kind === kind);
  const target = known ? { kind: kind as ReferenceKind, id } : parseTarget(id);
  if (!target) {
    return NextResponse.json(
      { error: `cannot tell what kind of artifact "${id}" is — pass kind=<${REFERENCE_KINDS.map((k) => k.kind).join("|")}>` },
      { status: 400 },
    );
  }

  const mesh = await loadNeighbourhood(target);
  return NextResponse.json({ subject: target, ...mesh });
}
