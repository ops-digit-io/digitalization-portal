import Link from "next/link";
import { queryFunnel, type FunnelScope } from "@/lib/funnel/query";
import { getCurrentUser } from "@/lib/auth/current";
import { LANES, STAGES } from "@/lib/types";
import { getCategories } from "@/lib/category-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

type Params = { scope?: string; q?: string; lane?: string; plant?: string; stage?: string; page?: string };

/** Build a /demands URL from the current params plus an override (drops empties). */
function href(current: Params, over: Partial<Params>): string {
  const p = new URLSearchParams();
  const merged = { ...current, ...over };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/demands?${s}` : "/demands";
}

export default async function Demands({ searchParams }: { searchParams: Params }) {
  const t = getT();
  const SCOPES: { id: FunnelScope; label: string }[] = [
    { id: "mine", label: t("demands.scope.mine", "My demands") },
    { id: "all", label: t("demands.scope.all", "All demands") },
  ];
  const { session } = await getCurrentUser();
  const plants = await getCategories("plant");
  const scope: FunnelScope = searchParams.scope === "all" ? "all" : "mine";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const q = (searchParams.q ?? "").trim();

  const result = await queryFunnel({
    scope,
    requester: session.user,
    ...(q ? { search: q } : {}),
    ...(searchParams.lane ? { lane: searchParams.lane } : {}),
    ...(searchParams.plant ? { plant: searchParams.plant } : {}),
    ...(searchParams.stage ? { stage: searchParams.stage } : {}),
    page,
    pageSize: 25,
  });

  // Params that scope tabs / pagination must preserve (page resets on a tab/filter change).
  const keep: Params = { scope, q: q || undefined, lane: searchParams.lane, plant: searchParams.plant, stage: searchParams.stage };

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("demands.title", "Demands")}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("demands.title", "Demands")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("demands.subtitle", "The inbound funnel. Reads the projection + your just-captured demands; scoped and paginated so it stays fast at any size.")}
          </p>
        </div>
        <Link href="/intake" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {t("demands.capture", "Capture a demand")} →
        </Link>
      </div>

      {/* Scope tabs */}
      <div className="mt-4 flex gap-1 rounded-md border p-0.5 text-sm w-fit">
        {SCOPES.map((s) => (
          <Link
            key={s.id}
            href={href(keep, { scope: s.id, page: undefined })}
            className={`rounded px-3 py-1 ${scope === s.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Search + filters (GET form — no client JS, scale-safe) */}
      <form method="get" action="/demands" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="scope" value={scope} />
        <input
          name="q"
          defaultValue={q}
          placeholder={t("demands.searchPlaceholder", "Search id or title…")}
          className="h-9 w-56 rounded-md border bg-transparent px-3 outline-none focus:ring-1 focus:ring-ring"
        />
        <select name="lane" defaultValue={searchParams.lane ?? ""} className="h-9 rounded-md border bg-transparent px-2 text-muted-foreground">
          <option value="">{t("demands.allLanes", "All lanes")}</option>
          {LANES.map((l) => <option key={l} value={l}>{t(`lane.${l}`, LANE_LABEL[l] ?? l)}</option>)}
        </select>
        <select name="plant" defaultValue={searchParams.plant ?? ""} className="h-9 rounded-md border bg-transparent px-2 text-muted-foreground">
          <option value="">{t("demands.allPlants", "All plants")}</option>
          {plants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select name="stage" defaultValue={searchParams.stage ?? ""} className="h-9 rounded-md border bg-transparent px-2 text-muted-foreground">
          <option value="">{t("demands.allStages", "All stages")}</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="h-9 rounded-md border px-3 hover:border-foreground/40">{t("common.filter", "Filter")}</button>
        {(q || searchParams.lane || searchParams.plant || searchParams.stage) && (
          <Link href={href({ scope }, {})} className="h-9 rounded-md px-2 leading-9 text-xs text-muted-foreground hover:text-foreground">{t("demands.clear", "Clear")}</Link>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{result.total} {result.total === 1 ? t("demands.match", "match") : t("demands.matches", "matches")}</span>
      </form>

      <Card className="mt-3 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">{t("demands.col.demand", "Demand")}</th>
              <th className="px-4 py-2.5 font-medium">{t("demands.col.stage", "Stage")}</th>
              <th className="px-4 py-2.5 font-medium">{t("demands.col.lane", "Lane")}</th>
              <th className="px-4 py-2.5 font-medium">{t("demands.col.plant", "Plant")}</th>
              <th className="px-4 py-2.5 font-medium">{t("demands.col.domain", "Domain")}</th>
              <th className="px-4 py-2.5 font-medium">{t("demands.col.since", "Since")}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/30">
                <td className="px-4 py-2.5">
                  <Link href={`/uc/${d.id}`} className="font-medium hover:underline">{d.title}</Link>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                    {d.pending && <Badge variant="outline" className="border-info/50 font-normal text-info">{t("demands.syncing", "syncing")}</Badge>}
                    {d.needsAttention && <Badge variant="outline" className="border-warn/50 font-normal text-warn">{t("demands.needsAttention", "needs attention")}</Badge>}
                  </div>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{d.stage ?? "—"}</td>
                <td className="px-4 py-2.5">{d.lane ? <Badge variant="secondary" className="font-normal text-muted-foreground">{t(`lane.${d.lane}`, LANE_LABEL[d.lane] ?? d.lane)}</Badge> : "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.plant ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.domain ?? "—"}</td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{d.since ?? "—"}</td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {scope === "mine"
                    ? <>{t("demands.emptyMine", "No demands raised by you yet.")} <Link href={href(keep, { scope: "all", page: undefined })} className="underline">{t("demands.seeAll", "See all demands")}</Link> {t("demands.or", "or")} <Link href="/intake" className="underline">{t("demands.captureOne", "capture one")}</Link>.</>
                    : <>{t("demands.emptyAll", "No demands match.")} <Link href="/intake" className="underline">{t("demands.captureFirst", "Capture the first one.")}</Link></>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {result.pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">{t("demands.page", "Page")} {result.page} {t("demands.of", "of")} {result.pageCount}</span>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link href={href(keep, { page: String(result.page - 1) })} className="rounded-md border px-3 py-1.5 text-xs hover:border-foreground/40">← {t("demands.prev", "Prev")}</Link>
            )}
            {result.page < result.pageCount && (
              <Link href={href(keep, { page: String(result.page + 1) })} className="rounded-md border px-3 py-1.5 text-xs hover:border-foreground/40">{t("common.next", "Next")} →</Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
