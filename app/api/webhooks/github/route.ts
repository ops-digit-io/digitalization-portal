import { NextResponse } from "next/server";
import { verifyGithubSignature } from "@/lib/projection/webhook";
import { reconcileFunnel } from "@/lib/projection/reconcile";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GitHub push webhook for `du-demands` → rebuild the read-model projection.
 *
 * This is the freshness half of the CQRS split: git is the system of record, and a
 * push here reconciles the projection the funnel views read from, so 14k readers hit
 * the projection (fast) while staying seconds-fresh. Authenticated by HMAC (the
 * shared `GITHUB_WEBHOOK_SECRET`), not a session — it is called by GitHub, not a user.
 */
export async function POST(req: Request) {
  const t = getT();
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ ok: false, error: t("api.webhooks.notConfigured", "webhook not configured") }, { status: 503 });
  }

  const body = await req.text();
  if (!verifyGithubSignature(body, req.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ ok: false, error: t("api.webhooks.invalidSignature", "invalid signature") }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true, pong: true });
  if (event !== "push") return NextResponse.json({ ok: true, ignored: event });

  // Only the funnel repo drives a funnel reconcile.
  let repoName = "";
  try {
    repoName = (JSON.parse(body) as { repository?: { name?: string } }).repository?.name ?? "";
  } catch {
    /* fall through — reconcile anyway on unparseable payloads is safe (idempotent) */
  }
  const funnel = process.env.DEMANDS_REPO ?? "du-demands";
  if (repoName && repoName !== funnel) return NextResponse.json({ ok: true, ignored: repoName });

  try {
    const result = await reconcileFunnel();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "reconcile failed" }, { status: 500 });
  }
}
