import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { buildCoverage, buildLoads, findCandidates, validateChampion, type EngagementRef } from "@/lib/champions";
import { createChampion, listChampions } from "@/lib/champions-store";
import { getAllCategories } from "@/lib/category-store";
import { listDemandRows } from "@/lib/demands-store";
import * as process_ from "@/lib/process/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The champions network: the curated register, plus everything derivable from
 * work already happening — coverage over the managed plants × domains, what each
 * champion is carrying, and the people who are already doing the job without
 * being registered.
 *
 * The derived halves are read concurrently and each degrades on its own: a
 * failing demand funnel must not blank the coverage map, because coverage is the
 * answer this endpoint exists to give.
 */
export async function GET() {
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const [champions, categories, engagements, requesters] = await Promise.all([
    listChampions(),
    getAllCategories(),
    process_
      .list()
      .then((ms): EngagementRef[] => ms.map((m) => ({ slug: m.slug, title: m.title, owner: m.owner, champion: m.champion })))
      .catch(() => [] as EngagementRef[]),
    listDemandRows()
      .then((rows) => rows.map((r) => r.requester ?? "").filter((r) => r !== ""))
      .catch(() => [] as string[]),
  ]);

  const on = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    champions,
    coverage: buildCoverage(champions, categories.plant, categories.domain, on),
    loads: buildLoads(champions, engagements, requesters),
    candidates: findCandidates(champions, engagements, requesters),
    plants: categories.plant,
    domains: categories.domain,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session, "draft")) return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const check = validateChampion(body);
  if (!check.ok) return NextResponse.json({ error: check.errors.join(" "), errors: check.errors }, { status: 400 });

  const c = await createChampion(body, new Date().toISOString());
  return NextResponse.json({ champion: c, warnings: check.warnings }, { status: 201 });
}
