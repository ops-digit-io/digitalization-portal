import { NextResponse } from "next/server";
import { buildDigest } from "@/lib/digest/service";
import { sendDigestEverywhere } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly review-and-staleness digest (docs/12-architecture §12.8, `0 7 * * 1`).
 * Builds the digest from the funnel and sends it through every configured channel
 * (N4): email — a team digest to `DIGEST_TEAM_EMAIL` plus per-demand nudges to
 * accountable owners — and a Teams/Slack webhook, which receives the team digest
 * only. Inert when no channel is configured (the /digest page still works), and
 * one channel's failure never fails the run. Authenticated by `CRON_SECRET`,
 * idempotent (safe to run more than once).
 */
async function run(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const digest = await buildDigest(new Date().toISOString());
    const notified = await sendDigestEverywhere(digest, {
      teamEmail: process.env.DIGEST_TEAM_EMAIL,
      appUrl: process.env.PORTAL_URL,
    });
    const sent = notified.reduce((n, r) => n + r.sent, 0);
    return NextResponse.json({ ok: true, flagged: digest.summary.flagged, summary: digest.summary, sent, notified });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "digest failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run; // Vercel cron issues a GET with the Authorization header
