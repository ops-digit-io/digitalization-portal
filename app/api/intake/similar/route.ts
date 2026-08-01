import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { queryFunnel } from "@/lib/funnel/query";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Duplicate detection at capture: search the funnel (committed + pending) for
 * demands whose id/title match what the requester is typing, so they can link or
 * upvote an existing one instead of adding a duplicate — the thing that keeps a
 * 14k-sourced funnel lean. Read-only; scoped to `draft` like the rest of intake.
 */
export async function GET(req: Request) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "draft")) {
    return NextResponse.json({ error: t("api.forbidden", "forbidden") }, { status: 403 });
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ matches: [] });

  const page = await queryFunnel({ search: q, page: 1, pageSize: 5 });
  const matches = page.rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: r.stage ?? null,
    lane: r.lane ?? null,
    pending: r.pending ?? false,
  }));
  return NextResponse.json({ matches, total: page.total });
}
