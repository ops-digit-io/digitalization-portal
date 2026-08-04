import { NextResponse } from "next/server";
import * as store from "@/lib/process/store";
import { generate, parseDigest, NoDigestError } from "@/lib/process/digest";
import * as llm from "@/lib/process/llm";
import { deny, now } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  return NextResponse.json({ digest: await store.readDigest(params.slug) });
}

/** Regenerate the derived digest. 503 without a model key — it cannot be faked. */
export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  if (!(await llm.available())) return NextResponse.json({ error: "live generation disabled", code: "NO_KEY" }, { status: 503 });
  try {
    return NextResponse.json({ digest: await generate(params.slug, now()) });
  } catch (e) {
    if (e instanceof NoDigestError) return NextResponse.json({ error: e.message, code: e.code, reply: e.reply }, { status: 502 });
    const err = e as Error & { code?: string };
    return NextResponse.json({ error: err.message, code: err.code || "ERROR" }, { status: err.code === "NO_KEY" ? 503 : 502 });
  }
}

/**
 * Store a digest produced OUTSIDE the portal — the return leg of "Copy prompt",
 * and the only way to an overview on a deployment with no model key. Accepts the
 * whole model reply or just its JSON; `parseDigest` whitelists it rather than
 * trusting it, because this is external content reaching the store by hand.
 *
 * The result is marked `provider: "pasted"` so the panel can say where the numbers
 * came from. A digest is derived either way — but derived by a model the portal
 * called and derived by one a person ran elsewhere are not the same claim.
 */
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  if (!(await store.exists(params.slug))) return NextResponse.json({ error: "no such engagement" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { digest?: unknown; text?: string };
  const parsed = parseDigest(body.digest ?? body.text ?? "");
  if (!parsed.ok) return NextResponse.json({ error: parsed.reason, code: "BAD_DIGEST" }, { status: 400 });

  const digest = await store.writeDigest(params.slug, { ...parsed.digest, model: null, provider: "pasted" }, now());
  return NextResponse.json({ digest });
}
