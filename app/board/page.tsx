import Link from "next/link";
import { assembleBoard, type BoardCard, type BoardFilter } from "@/lib/board";
import { STAGES, GATES, type Stage, type Lane } from "@/lib/types";
import { getSession } from "@/lib/auth/current";
import { loadPortfolioRows } from "@/lib/portfolio";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { BoardColumn } from "@/components/portal/board-column";
import { FilterBar } from "@/components/portal/filter-bar";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<Stage, string> = {
  S1: "Demand", S2: "Shaping", S3: "Assess", S4: "POC", S5: "Pilot", S6: "Scale", S7: "Rollout", S8: "Steady ops",
};
const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local",
};

type Group = "stage" | "lane" | "plant";
interface Params { lane?: string; plant?: string; domain?: string; heat?: string; status?: string; q?: string; group?: string }

const eur = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function hrefWith(params: Params, patch: Partial<Params>): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) merged[k] = v as string;
  const qs = new URLSearchParams(merged).toString();
  return qs ? `/board?${qs}` : "/board";
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tone ? { color: `hsl(var(${tone}))` } : undefined}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export default async function BoardPage({ searchParams }: { searchParams: Params }) {
  const group: Group = searchParams.group === "lane" ? "lane" : searchParams.group === "plant" ? "plant" : "stage";
  const filter: BoardFilter = {
    ...(searchParams.lane ? { lane: searchParams.lane } : {}),
    ...(searchParams.plant ? { plant: searchParams.plant } : {}),
    ...(searchParams.domain ? { domain: searchParams.domain } : {}),
    ...(searchParams.heat ? { heat: searchParams.heat } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.q ? { q: searchParams.q } : {}),
  };

  // Real funnel — live from du-demands when the GitHub App is configured, else the local workspace.
  const session = await getSession();
  const { rows, now, live, source } = await loadPortfolioRows();
  const board = assembleBoard(rows, session, now, filter);

  // Value KPIs are portfolio aggregates, shown only to view_all sessions.
  const canValue = can(session, "view_all");

  // Board quick-actions — only for a live funnel the session may manage. Advance is a
  // coarse "holds gate authority" check; the route enforces the specific gate.
  const canAdvanceAny = GATES.some((g) => can(session, "gate_pass", { gate: g }));
  const manage = live && (canAdvanceAny || can(session, "park") || can(session, "kill"))
    ? { advance: canAdvanceAny, park: can(session, "park"), kill: can(session, "kill"), reactivate: can(session, "park") }
    : undefined;
  const visibleIds = new Set(board.cards.map((c) => c.id));
  const visibleRows = rows.filter((r) => visibleIds.has(r.id));
  const pipeline = canValue ? visibleRows.filter((r) => (r.status ?? "active") === "active").reduce((s, r) => s + (r.valueProjected ?? 0), 0) : 0;
  const realized = canValue ? visibleRows.reduce((s, r) => s + (r.valueRealized ?? 0), 0) : 0;

  const lanes = [...new Set(rows.map((r) => r.lane).filter(Boolean))] as string[];
  const plants = [...new Set(rows.map((r) => r.plant).filter(Boolean))] as string[];
  const domains = [...new Set(rows.map((r) => r.domain).filter(Boolean))] as string[];

  // Build the columns for the chosen grouping.
  const stageIdx = (s?: Stage) => (s ? STAGES.indexOf(s) : 99);
  let columns: { title: string; subtitle?: string; colorVar?: string; cards: BoardCard[] }[];
  if (group === "stage") {
    columns = STAGES.map((s) => ({ title: `${s} ${STAGE_LABEL[s]}`, colorVar: `--stage-${s.toLowerCase()}`, cards: board.columns[s] }));
  } else {
    const key = group === "lane" ? (c: BoardCard) => (c.lane as string) ?? "—" : (c: BoardCard) => c.plant ?? "—";
    const groups = new Map<string, BoardCard[]>();
    for (const c of [...board.cards].sort((a, b) => stageIdx(a.stage) - stageIdx(b.stage))) {
      const k = key(c);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
    }
    columns = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, cards]) => ({ title: LANE_LABEL[k] ?? k, cards }));
  }

  const groupTabs: { id: Group; label: string }[] = [{ id: "stage", label: "Stage" }, { id: "lane", label: "Lane" }, { id: "plant", label: "Plant" }];

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Portfolio board</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
              title={live ? `Read live from ${source}` : `Read from the ${source} — configure the GitHub App to read the live du-demands funnel`}
            >
              {live ? `● live · ${source}` : `○ ${source}`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Every demand the Digital Unit owns, by stage — flow, stalls, and health at a glance. Value is a portfolio aggregate; figures stay indicative until pilot.</p>
        </div>
        <div className="flex overflow-hidden rounded-md border text-sm">
          {groupTabs.map((t) => (
            <Link key={t.id} href={hrefWith(searchParams, { group: t.id === "stage" ? undefined : t.id })} className={`px-3 py-1.5 ${group === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</Link>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Active" value={String(board.summary.active)} />
        <Kpi label="Stalled" value={String(board.summary.stalled)} sub={`> ${30} days in stage`} tone={board.summary.stalled > 0 ? "--warn" : undefined} />
        <Kpi label="Needs attention" value={String(board.summary.needsAttention)} tone={board.summary.needsAttention > 0 ? "--destructive" : undefined} />
        <Kpi label="Parked / killed" value={`${board.summary.parked} / ${board.summary.killed}`} />
        <Kpi label="Pipeline value" value={canValue ? eur(pipeline) : "—"} sub="indicative" tone="--info" />
        <Kpi label="Realized value" value={canValue ? eur(realized) : "—"} sub="to date" tone="--ok" />
      </div>

      {/* Filters — search + dropdowns */}
      <div className="mt-5">
        <FilterBar
          path="/board"
          current={searchParams as Record<string, string | undefined>}
          search={{ param: "q", placeholder: "Search id or title…" }}
          selects={[
            { param: "lane", label: "Lane", options: lanes, labels: LANE_LABEL },
            { param: "plant", label: "Plant", options: plants },
            { param: "domain", label: "Domain", options: domains },
            { param: "status", label: "Status", options: ["active", "parked", "killed"] },
            { param: "heat", label: "Heat", options: ["high", "medium", "low"] },
          ]}
        />
      </div>

      {board.needsAttention.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="text-warn" aria-hidden>⚠</span>
          <span>{board.needsAttention.length} use case{board.needsAttention.length > 1 ? "s" : ""} {board.needsAttention.length > 1 ? "need" : "needs"} attention — state could not be read.</span>
        </div>
      )}

      {board.cards.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">No use cases match the filter.</Card>
      ) : (
        <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <BoardColumn key={col.title} title={col.title} subtitle={col.subtitle} colorVar={col.colorVar} cards={col.cards} {...(manage ? { manage } : {})} />
          ))}
        </div>
      )}
    </main>
  );
}
