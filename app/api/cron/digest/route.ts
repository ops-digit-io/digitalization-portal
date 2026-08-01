import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest/service";
import { getNotifier } from "@/lib/notify";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly review-and-staleness digest (docs/12-architecture §12.8, `0 7 * * 1`).
 * Builds the digest from the funnel and emails it: a team digest to
 * `DIGEST_TEAM_EMAIL` + per-demand nudges to accountable owners. Inert when email
 * isn't configured (the /digest page still works). Authenticated by `CRON_SECRET`,
 * idempotent (safe to run more than once).
 */
async function run(req: Request): Promise<NextResponse> {
  const t = getT();
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: t("api.unauthorized", "unauthorized") }, { status: 401 });
  }
  try {
    const digest = await buildDigest(new Date().toISOString());
    const notifier = getNotifier();
    const notified = notifier
      ? await notifier.sendDigest(digest, { teamEmail: process.env.DIGEST_TEAM_EMAIL, appUrl: process.env.PORTAL_URL })
      : { channel: "none", sent: 0, skipped: 0, recipients: [] };
    return NextResponse.json({ ok: true, flagged: digest.summary.flagged, summary: digest.summary, notified });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "digest failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run; // Vercel cron issues a GET with the Authorization header
