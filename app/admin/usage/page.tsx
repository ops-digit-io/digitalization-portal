import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { readUsage, type Rollup, type ToolRollup } from "@/lib/usage-meter";
import { isPriced } from "@/lib/pricing";
import { toolLabel } from "@/lib/portal-tools";
import { getT } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { UsageControls } from "./controls";

export const dynamic = "force-dynamic";

/** Friendly names for the metered features — the raw key is shown too. */
const FEATURE_LABEL: Record<string, string> = {
  "process.section": "Process · section drafting",
  "process.advisory": "Process · advisory passes",
  "process.digest": "Process · digest",
  "process.coach": "Process · dimension coaching",
  "process.analysis": "Process · demand split",
  "process.chat": "Process · other",
  "champions.analysis": "Champions · network analysis",
  requirements: "Requirements · analysis",
  research: "Requirements · domain research",
  "intake.turn": "Intake · interview turn",
  "intake.enhance": "Intake · enhancement",
  "agent.chat": "Analyst agent · chat",
  "agent.simulate": "Analyst agent · simulate",
  "agent.analysis": "Analyst agent · portfolio",
  "agent.poc": "Analyst agent · PoC",
};

const fmt = new Intl.NumberFormat("en-US");
const usd = (n: number | null): string =>
  n === null ? "—" : n < 0.01 ? "<$0.01" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const tokens = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n));

/** A horizontal proportion bar — CSS only, so no chart dependency. */
function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div className="h-1.5 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function UsagePage({ searchParams }: { searchParams: { days?: string } }) {
  const t = getT();
  const session = await getSession();
  if (!can(session, "all")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">{t("usage.adminHeading", "Administration · Cost & usage")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.adminOnly", "This page is for administrators only.")}</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">{t("admin.backHome", "← Home")}</Link>
      </main>
    );
  }

  const days = Math.min(120, Math.max(1, Math.round(Number(searchParams.days ?? 30)) || 30));
  const u = await readUsage(days);
  const maxFeatureCalls = Math.max(1, ...u.byFeature.map((f) => f.calls));
  const maxModelCost = Math.max(1e-9, ...u.byModel.map((m) => m.cost ?? 0));
  const maxDayCalls = Math.max(1, ...u.daily.map((d) => d.calls));
  const maxToolTotal = Math.max(1, ...u.byTool.map((t) => t.total));

  return (
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/settings" className="hover:text-foreground">{t("settings.title", "Settings")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("usage.breadcrumb", "Cost & usage")}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("usage.title", "Usage & cost")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("usage.introA", "How the portal is used and what it costs — AI calls and human interaction — over the last")} {days} {t("usage.daysUnit", "days")} ({u.from} → {u.to}).{" "}
            {t("usage.introB", "Costs are estimates from list prices; interaction counts are aggregate, never per-person.")}
          </p>
        </div>
        <UsageControls days={days} canReset={u.enabled} />
      </div>

      {!u.enabled && (
        <Card className="mt-5 border-warn/30 bg-warn/5 p-4 text-sm">
          <span className="font-medium">{t("usage.metering.title", "Metering needs a durable store.")}</span> {t("usage.metering.body1", "Usage is counted in KV so it survives restarts. Set")} <code className="rounded border px-1 py-0.5">KV_REST_API_URL</code> {t("usage.and", "and")}{" "}
          <code className="rounded border px-1 py-0.5">KV_REST_API_TOKEN</code> {t("usage.metering.body2", "to start recording. Everything below reads zero until then.")}
        </Card>
      )}

      {/* Totals — AI cost on the left, human activity on the right */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.estimatedCost", "Estimated cost")}</div>
          <div className="mt-1 text-2xl font-semibold">{usd(u.totals.cost)}</div>
          {u.hasUnpriced && <div className="mt-0.5 text-[11px] text-warn">{t("usage.card.excludesUnpriced", "excludes unpriced models")}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.aiCalls", "AI calls")}</div>
          <div className="mt-1 text-2xl font-semibold">{fmt.format(u.totals.calls)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{t("usage.card.messagesAnalyses", "messages & analyses")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.inputTokens", "Input tokens")}</div>
          <div className="mt-1 text-2xl font-semibold">{tokens(u.totals.input)}</div>
          {u.totals.cacheRead > 0 && <div className="mt-0.5 text-[11px] text-muted-foreground">{tokens(u.totals.cacheRead)} {t("usage.card.cached", "cached")}</div>}
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.outputTokens", "Output tokens")}</div>
          <div className="mt-1 text-2xl font-semibold">{tokens(u.totals.output)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.pageViews", "Page views")}</div>
          <div className="mt-1 text-2xl font-semibold">{fmt.format(u.totals.views)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{t("usage.card.humanInterface", "human interface")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("usage.card.clicks", "Clicks")}</div>
          <div className="mt-1 text-2xl font-semibold">{fmt.format(u.totals.clicks)}</div>
        </Card>
      </div>

      {/* By tool — the human-interface view: how the portal is actually used */}
      <Card className="mt-5 p-4">
        <h2 className="text-sm font-semibold">{t("usage.byTool.heading", "By tool · human interface")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("usage.byTool.desc", "Views and clicks per portal tool — which tools people actually reach for. Aggregate counts only; no user is recorded.")}
        </p>
        {u.byTool.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("usage.noInteraction", "No interaction recorded in this window.")}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">{t("usage.col.tool", "Tool")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.views", "Views")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.clicks", "Clicks")}</th>
                <th className="w-1/3 pb-2 pl-3 font-medium">{t("usage.col.activity", "Activity")}</th>
              </tr>
            </thead>
            <tbody>
              {u.byTool.map((t: ToolRollup) => (
                <tr key={t.key} className="border-b last:border-0">
                  <td className="py-2">
                    <div>{toolLabel(t.key)}</div>
                    <code className="text-[11px] text-muted-foreground">{t.key}</code>
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmt.format(t.views)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt.format(t.clicks)}</td>
                  <td className="py-2 pl-3"><Bar value={t.total} max={maxToolTotal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* By feature — the AI "what to limit" view */}
      <Card className="mt-5 p-4">
        <h2 className="text-sm font-semibold">{t("usage.byFeature.heading", "By feature · AI calls")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("usage.byFeature.desc", "Where the calls go. To cut cost, limit the busiest features — the agent-tools kill switch (AGENT_TOOLS) and the model picker are the two blunt levers; per-feature limits can follow.")}
        </p>
        {u.byFeature.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("usage.noActivity", "No activity recorded in this window.")}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">{t("usage.col.feature", "Feature")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.calls", "Calls")}</th>
                <th className="w-1/3 pb-2 pl-3 font-medium">{t("usage.col.share", "Share")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.in", "In")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.out", "Out")}</th>
              </tr>
            </thead>
            <tbody>
              {u.byFeature.map((f: Rollup) => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="py-2">
                    <div>{t(`usage.feature.${f.key}`, FEATURE_LABEL[f.key] ?? f.key)}</div>
                    <code className="text-[11px] text-muted-foreground">{f.key}</code>
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmt.format(f.calls)}</td>
                  <td className="py-2 pl-3"><Bar value={f.calls} max={maxFeatureCalls} /></td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{tokens(f.input)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{tokens(f.output)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* By model — the "where the money is" view */}
      <Card className="mt-5 p-4">
        <h2 className="text-sm font-semibold">{t("usage.byModel.heading", "By model · AI cost")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("usage.byModel.desc", "Cost is priced per model. Switch the default model in the options to trade capability for cost.")}</p>
        {u.byModel.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("usage.noActivity", "No activity recorded in this window.")}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">{t("usage.col.model", "Model")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.calls", "Calls")}</th>
                <th className="pb-2 text-right font-medium">{t("usage.col.estCost", "Est. cost")}</th>
                <th className="w-1/4 pb-2 pl-3 font-medium">{t("usage.col.share", "Share")}</th>
              </tr>
            </thead>
            <tbody>
              {u.byModel.map((m: Rollup) => (
                <tr key={m.key} className="border-b last:border-0">
                  <td className="py-2">
                    <code>{m.key}</code>
                    {!isPriced(m.key) && <span className="ml-2 text-[11px] text-warn">{t("usage.unpriced", "unpriced")}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmt.format(m.calls)}</td>
                  <td className="py-2 text-right tabular-nums">{usd(m.cost)}</td>
                  <td className="py-2 pl-3"><Bar value={m.cost ?? 0} max={maxModelCost} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Daily trend */}
      <Card className="mt-5 p-4">
        <h2 className="text-sm font-semibold">{t("usage.dailyActivity", "Daily activity")}</h2>
        <div className="mt-3 flex items-end gap-0.5" style={{ height: 96 }}>
          {u.daily.map((d) => (
            <div key={d.date} className="group relative flex-1" title={`${d.date}: ${fmt.format(d.calls)} ${t("usage.callsUnit", "calls")} · ${usd(d.cost)}`}>
              <div
                className="w-full rounded-t bg-foreground/60 transition-colors group-hover:bg-foreground"
                style={{ height: `${Math.round((d.calls / maxDayCalls) * 88)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{u.from}</span>
          <span>{u.to}</span>
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        {t("usage.footer1", "Costs are estimates from published list prices")} (<code className="rounded border px-1 py-0.5">lib/pricing.ts</code>){t("usage.footer2", ", not a billing feed. Metering records only token counts and model names — never prompt or response content.")}
      </p>
    </main>
  );
}
