import { NextResponse } from "next/server";
import { flushPending, pendingStats } from "@/lib/pending/service";
import { reconcileFunnel } from "@/lib/projection/reconcile";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flush the interim buffer to git, then rebuild the projection. Runs on a schedule
 * (Vercel cron) and can be triggered manually. Authenticated by the shared
 * `CRON_SECRET` bearer, not a session. Idempotent — safe to run as often as needed.
 */
async function run(req: Request): Promise<NextResponse> {
  const t = getT();
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: t("api.unauthorized", "unauthorized") }, { status: 401 });
  }
  try {
    const flushed = await flushPending();
    const projection = await reconcileFunnel();
    const stats = await pendingStats();
    return NextResponse.json({ ok: true, ...flushed, stats, projected: projection.projected, projectionRows: projection.rows });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "flush failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run; // Vercel cron issues a GET with the Authorization header
