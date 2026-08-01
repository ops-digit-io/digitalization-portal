import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { analyseNetwork } from "@/lib/champions-analysis";
import { listChampions } from "@/lib/champions-store";
import { getAllCategories } from "@/lib/category-store";
import { listDemandRows } from "@/lib/demands-store";
import type { EngagementRef } from "@/lib/champions";
import * as processStore from "@/lib/process/store";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run the Champions Analyst over everything the portal knows about the network.
 *
 * POST rather than GET: the run costs a model call, so it happens when somebody
 * asks for it rather than on every page load. It always returns actions — the
 * deterministic floor stands in when no key is configured or the model fails —
 * and it always reports what governed the run.
 */
export async function POST() {
  const t = getT();
  const session = await getSession();
  if (!can(session, "view_board")) return NextResponse.json({ error: t("api.notAuthenticated", "not authenticated") }, { status: 401 });

  const [champions, categories, engagements, demandRequesters] = await Promise.all([
    listChampions(),
    getAllCategories(),
    processStore
      .list()
      .then((ms): EngagementRef[] => ms.map((m) => ({ slug: m.slug, title: m.title, owner: m.owner, champion: m.champion })))
      .catch(() => [] as EngagementRef[]),
    listDemandRows().then((rows) => rows.map((r) => r.requester ?? "").filter((r) => r !== "")).catch(() => [] as string[]),
  ]);

  const analysis = await analyseNetwork(
    { champions, plants: categories.plant, domains: categories.domain, engagements, demandRequesters },
    new Date().toISOString(),
  );
  return NextResponse.json(analysis);
}
