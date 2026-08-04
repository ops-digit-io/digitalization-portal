import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import {
  buildDemand,
  classifyDemand,
  missingRequired,
  parseDemandToAnswers,
  EMPTY_ANSWERS,
  type DemandAnswers,
} from "@/lib/demand";
import { enqueueDemand, pendingSaveResult } from "@/lib/pending/service";
import { addReference, targetFor, RELATIONS, type Reference, type Relation } from "@/lib/references";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Capture-year for new demand ids (fixed for the demo so ids are stable). */
const INTAKE_YEAR = 2026;

/**
 * Read the relations the capture UI collected. External input: every target goes
 * through `parseTarget`, an unknown relation is dropped rather than invented, and
 * the note is bounded — this writes into the funnel's system of record.
 */
function coerceReferences(raw: unknown): Reference[] {
  if (!Array.isArray(raw)) return [];
  const out: Reference[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 20)) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as { kind?: unknown; id?: unknown; relation?: unknown; note?: unknown };
    const target = targetFor(r.kind, r.id);
    if (!target) continue;
    const key = `${target.kind}:${target.id.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const relation = RELATIONS.includes(r.relation as Relation) ? (r.relation as Relation) : undefined;
    out.push({
      ...target,
      note: typeof r.note === "string" ? r.note.trim().slice(0, 300) : "",
      ...(relation ? { relation } : {}),
    });
  }
  return out;
}

function coerce(a: unknown): DemandAnswers {
  const src = (a ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_ANSWERS };
  for (const k of Object.keys(out) as (keyof DemandAnswers)[]) {
    if (typeof src[k] === "string") out[k] = src[k] as string;
  }
  return out;
}

/**
 * Intake API. `preview` renders the deterministic demand + classification without
 * writing; `save` persists it to the central intake repo. The rendered markdown is
 * a pure function of the answers — same answers, same page — so preview and save
 * always agree.
 */
export async function POST(req: Request) {
  const session = await getSession(); // real deployment resolves this from the OIDC session
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let body: { action?: string; answers?: unknown; markdown?: string; id?: string; references?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Three tools, one output: the Chat and Form tools send `answers`; the Markdown
  // tool sends raw `markdown`, which we parse back to answers so it re-renders
  // through the same buildDemand. Whatever the tool, the saved page is identical.
  const answers = typeof body.markdown === "string" ? parseDemandToAnswers(body.markdown) : coerce(body.answers);
  // Relations the requester recognised at capture — the duplicate check asks them
  // to make a judgement ("open one instead of duplicating?"), and until now the
  // answer was thrown away. Whitelisted, never trusted: an unparseable target is
  // dropped rather than written into the funnel.
  const references = coerceReferences(body.references);
  const classification = classifyDemand(answers);
  const missing = missingRequired(answers).map((f) => f.key);

  if (body.action === "preview") {
    const id = typeof body.id === "string" && body.id ? body.id : "UC-YYYY-NNNN";
    const markdown = buildDemand({ id, createdOn: "YYYY-MM-DD", lane: classification.lane }, answers);
    return NextResponse.json({ classification, missing, markdown });
  }

  if (body.action === "save") {
    if (missing.length > 0) {
      return NextResponse.json({ error: `missing required: ${missing.join(", ")}`, missing }, { status: 400 });
    }
    // Per-user submit throttle so one person can't flood the funnel (14k scale).
    const rl = await rateLimit(`intake:${session.user}`, { limit: 10, windowSec: 300 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `You've submitted a lot in a short time — please wait ${rl.resetSec}s and try again.` },
        { status: 429 },
      );
    }
    try {
      // Persist to the interim buffer and return immediately — the submit does NOT
      // wait on git. A background flush commits it to du-demands (the SoR); ids are
      // allocated collision-free by the buffer, and reads merge it in the meantime.
      // dedupKey makes an identical double-submit idempotent (returns the same id).
      const createdOn = new Date().toISOString().slice(0, 10);
      const dedupKey = createHash("sha256").update(JSON.stringify({ answers, references })).digest("hex").slice(0, 16);
      const { id, markdown, kind } = await enqueueDemand(
        INTAKE_YEAR,
        (uid) =>
          references.reduce(
            (md, ref) => addReference(md, ref),
            buildDemand({ id: uid, createdOn, lane: classification.lane }, answers),
          ),
        { dedupKey },
      );
      const repo = process.env.DEMANDS_REPO ?? "du-demands";
      const result = pendingSaveResult(id, kind, repo, `demands/${id}/README.md`);
      return NextResponse.json({ id, result, classification, markdown });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "capture failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action must be 'preview' or 'save'" }, { status: 400 });
}
