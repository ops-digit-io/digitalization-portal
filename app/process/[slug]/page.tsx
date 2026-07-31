"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, SectionLabel } from "@/components/process/ui";
import { ArtefactCard } from "@/components/process/artefact-card";
import { useI18n } from "@/components/providers";
import type { Locale } from "@/lib/i18n";
import * as C from "@/lib/process/content";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const TEXTAREA = "mt-1 min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

// ------------------------------------------------------------------ types
type Status = "gruen" | "gelb" | "rot" | "grau";
type Anflug = "process" | "technology";
type KoState = "pass" | "fail" | "open";

interface DimensionResult {
  id: string;
  label: string;
  weight: number;
  /** 1..5; nicht erhobene Kriterien zählen als S1 (§1.3), daher nie null. */
  score: number;
  rated: number;
  total: number;
  covered: boolean;
  worstComponent?: string;
}
interface KnockOutResult {
  id: string;
  label: string;
  koClass: "intake" | "optimisation";
  level: number;
  rated: boolean;
  state: KoState;
}
interface Profile {
  dimensions: DimensionResult[];
  knockOuts: KnockOutResult[];
  status: Status;
  reason: string;
  portfolioValue: number; // Σ(Gewicht × Dimension), immer definiert (§6.1)
  coverage: number;
  ratedCount: number;
  totalCount: number;
  confidenceDominant: "S" | "P" | "I" | null;
  directions: string[];
}
interface GateVerdict {
  passed: boolean;
  reason: string;
  at: string;
}
interface Meta {
  slug: string;
  title: string;
  owner: string;
  champion: string;
  unit: string;
  anflug: Anflug;
  components: { id: string; label: string }[];
  phase: string;
  branch?: string;
  riskClass?: string;
  gates: Record<string, GateVerdict>;
  filledArtefacts?: string[];
  demands?: DemandRef[];
}
interface DemandRef {
  id: string;
  title: string;
  at: string;
}
interface Phase {
  id: string;
  n: number;
  label: string;
  purpose: string;
  gate: { id: string; label: string; condition: string; fail: string };
}
interface Artefact {
  id: string;
  phase: string;
  title: string;
  purpose: string;
}
interface Branch {
  id: string;
  label: string;
  when: string;
  conditions: string[];
}
interface RiskClass {
  id: string;
  label: string;
  tactic: string;
}
interface RiskCheck {
  n: number;
  label: string;
  how: string;
}
interface Config {
  phases: Phase[];
  artefacts: Artefact[];
  branches: Branch[];
  riskClasses: RiskClass[];
  riskChecks: RiskCheck[];
  liveCoaching: boolean;
}
interface Engagement {
  meta: Meta;
  profile: Profile;
  filledArtefacts?: string[];
}

// ------------------------------------------------------------------ Analyse & Bedarfe types
type Lane = "run" | "regulatory" | "continuous_improvement" | "transform" | "innovation" | "data_ai" | "local";

const LANE_OPTIONS: { id: Lane | ""; label: string }[] = [
  { id: "", label: "— automatisch —" },
  { id: "run", label: "run" },
  { id: "regulatory", label: "regulatory" },
  { id: "continuous_improvement", label: "continuous_improvement" },
  { id: "transform", label: "transform" },
  { id: "innovation", label: "innovation" },
  { id: "data_ai", label: "data_ai" },
  { id: "local", label: "local" },
];

interface DemandProposal {
  title: string;
  problem: string;
  lane?: string;
  domain?: string;
  basis?: string;
}
interface Proposal extends DemandProposal {
  _create: boolean;
}
interface AnalyseResult {
  demands: DemandProposal[];
  live: boolean;
}
interface CreatedDemand {
  id: string;
  title: string;
  host?: string;
  path?: string;
}

const STATUS_CLS: Record<Status, string> = {
  gruen: "bg-[hsl(var(--ok))] text-white",
  gelb: "bg-amber-500 text-white",
  rot: "bg-[hsl(var(--destructive))] text-white",
  grau: "bg-secondary text-secondary-foreground",
};

function StatusPill({ status, locale }: { status: Status; locale: Locale }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLS[status]}`}>
      <span className="size-2 rounded-full bg-current opacity-90" aria-hidden />
      {C.statusPill(locale, status)}
    </span>
  );
}

/** Score → bar width % and health colour (score alone is never the only signal). */
function barColor(score: number): string {
  if (score < 2) return "bg-[hsl(var(--destructive))]";
  if (score < 3) return "bg-amber-500";
  return "bg-[hsl(var(--ok))]";
}

const PROFIL = "__profil__";
const ANALYSE = "__analyse__";

// ------------------------------------------------------------------ page
export default function EngagementCockpit() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { locale } = useI18n();

  const [eng, setEng] = useState<Engagement | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(PROFIL);

  const reload = useCallback(async () => {
    const e = await apiGet<Engagement>(`/engagements/${slug}`);
    setEng(e);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiGet<Engagement>(`/engagements/${slug}`), apiGet<Config>("/config")])
      .then(([e, c]) => {
        if (cancelled) return;
        setEng(e);
        setConfig(c);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-6">
        <Link href="/process" className="text-sm text-muted-foreground hover:text-foreground">← Process Funnel</Link>
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      </main>
    );
  }
  if (!eng || !config) {
    return <main className="mx-auto max-w-[1100px] px-4 py-6 text-sm text-muted-foreground">{C.pc(locale, "loading")}</main>;
  }

  const { meta, profile } = eng;
  const filledArtefacts = meta.filledArtefacts ?? eng.filledArtefacts ?? [];
  const reportUrl = `/api/process/engagements/${slug}/report?format=md`;

  const activePhase = config.phases.find((p) => p.id === tab);

  // One model for the strip, so the keyboard handler and the markup agree.
  const tabs: { id: string; label: string; current?: boolean; count?: string; gate?: "pass" | "fail" | null }[] = [
    { id: PROFIL, label: C.pc(locale, "tab.profile") },
    { id: ANALYSE, label: C.pc(locale, "tab.analyse") },
    ...config.phases.map((p) => {
      const inPhase = config.artefacts.filter((a) => a.phase === p.id);
      const done = inPhase.filter((a) => filledArtefacts.includes(a.id)).length;
      const verdict = meta.gates[p.gate.id];
      return {
        id: p.id,
        label: `${p.n} · ${C.phaseText(locale, p.id).label}`,
        current: p.id === meta.phase,
        ...(inPhase.length ? { count: `${done}/${inPhase.length}` } : {}),
        gate: verdict ? (verdict.passed ? ("pass" as const) : ("fail" as const)) : null,
      };
    }),
  ];

  /** Arrow keys move along the strip and wrap; Home/End jump to the ends. */
  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === tab);
    const last = tabs.length - 1;
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "ArrowLeft" ? (i <= 0 ? last : i - 1)
      : (i >= last ? 0 : i + 1);
    const id = tabs[next]?.id;
    if (!id) return;
    setTab(id);
    // Follow-focus: the newly selected tab is the strip's only tab stop.
    requestAnimationFrame(() => document.getElementById(`tab-${id}`)?.focus());
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/process" className="hover:text-foreground">{C.pc(locale, "funnel.title")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{meta.title}</span>
      </nav>

      {/* Header — identity, the light with its reason, and the numbers behind it */}
      <Card className="overflow-hidden p-0">
        <span className={`block h-1 w-full ${STATUS_CLS[profile.status]}`} aria-hidden />
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">{meta.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {meta.owner || C.pc(locale, "row.noOwner")}
                {meta.champion ? ` · ${C.pc(locale, "field.champion")} ${meta.champion}` : ""}
                {meta.unit ? ` · ${meta.unit}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{C.pc(locale, "field.anflug")}: {C.anflugLabel(locale, meta.anflug)}</p>
            </div>
            <div className="max-w-md text-right">
              <StatusPill status={profile.status} locale={locale} />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{C.explainStatus(locale, profile)}</p>
              <a href={`${reportUrl}&lang=${locale}`} className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline" download>
                {C.pc(locale, "report.link")}
              </a>
            </div>
          </div>

          {/* The numbers the light rests on — a green light over 8 % coverage is not a green process. */}
          <dl className="mt-4 grid gap-4 border-t pt-3 sm:grid-cols-3">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "stat.coverage")}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums leading-none">{Math.round(profile.coverage * 100)}</span>
                <span className="text-xs text-muted-foreground">% · {profile.ratedCount}/{profile.totalCount}</span>
              </dd>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-foreground/70" style={{ width: `${Math.round(profile.coverage * 100)}%` }} />
              </div>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "stat.portfolio")}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums leading-none">{profile.portfolioValue}</dd>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{C.pc(locale, "stat.portfolioNote")}</p>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "stat.phase")}</dt>
              <dd className="mt-1 text-sm font-medium leading-tight">
                {config.phases.find((p) => p.id === meta.phase)?.n ?? "—"} · {C.phaseText(locale, meta.phase).label}
              </dd>
              {meta.branch && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {meta.branch} · {C.branchText(locale, meta.branch).label}{meta.riskClass ? ` · ${meta.riskClass}` : ""}
                </p>
              )}
            </div>
          </dl>
        </div>
      </Card>

      {/* Tab strip — a real tablist: one tab stop, arrow keys move between tabs */}
      <div
        role="tablist"
        aria-label={C.pc(locale, "tabs.label")}
        className="mt-4 flex flex-nowrap gap-1 overflow-x-auto border-b"
        onKeyDown={onTabKeyDown}
      >
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            id={t.id}
            label={t.label}
            active={tab === t.id}
            current={t.current}
            count={t.count}
            gate={t.gate}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="mt-4 outline-none"
      >
        {tab === PROFIL && <ProfilTab slug={slug} profile={profile} locale={locale} />}
        {tab === ANALYSE && <AnalyseTab slug={slug} demands={meta.demands ?? []} onChanged={reload} locale={locale} />}
        {activePhase && (
          <PhaseTab
            key={activePhase.id}
            slug={slug}
            phase={activePhase}
            meta={meta}
            profile={profile}
            config={config}
            filledArtefacts={filledArtefacts}
            onChanged={reload}
            locale={locale}
          />
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ tab button
function TabButton({
  id,
  label,
  active,
  current,
  count,
  gate,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  current?: boolean;
  count?: string;
  /** The phase gate's verdict, once recorded — passed reads ✓, failed reads ✕. */
  gate?: "pass" | "fail" | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      // Roving tabindex: the strip is one tab stop, arrows move within it.
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
        active ? "border-b-2 border-foreground font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {current && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
      {label}
      {gate && (
        <span
          aria-hidden
          className={`text-xs font-semibold ${gate === "pass" ? "text-[hsl(var(--ok))]" : "text-destructive"}`}
        >
          {gate === "pass" ? "✓" : "✕"}
        </span>
      )}
      {count && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span>}
    </button>
  );
}

// ------------------------------------------------------------------ Profil tab
function ProfilTab({ slug, profile, locale }: { slug: string; profile: Profile; locale: Locale }) {
  return (
    <div className="space-y-4">
      {/* Knock-outs */}
      <section>
        <SectionLabel>{C.pc(locale, "ko.heading")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {profile.knockOuts.map((k) => {
            const tone =
              k.state === "pass"
                ? "border-[hsl(var(--ok))]/40 bg-[hsl(var(--ok))]/10"
                : k.state === "fail"
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-border bg-secondary/40";
            const mark = k.state === "pass" ? "✓" : k.state === "fail" ? "✕" : "○";
            const markCls =
              k.state === "pass" ? "text-[hsl(var(--ok))]" : k.state === "fail" ? "text-destructive" : "text-muted-foreground";
            return (
              <div key={k.id} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${markCls}`} aria-hidden>{mark}</span>
                  <span className="font-medium">{k.id}</span>
                  <span className="text-muted-foreground">{C.critText(locale, k.id).label}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {k.level}/5{k.rated ? "" : ` (${C.pc(locale, "ko.notRated")})`} · {C.koStateLabel(locale, k.state)} · {C.koClassLabel(locale, k.koClass)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dimension profile */}
      <section>
        <SectionLabel>{C.pc(locale, "dim.heading")}</SectionLabel>
        <Card className="divide-y">
          {profile.dimensions.map((d) => (
            <Link
              key={d.id}
              href={`/process/${slug}/assess/${d.id}`}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent"
            >
              <div className="w-56 shrink-0">
                <div className="text-sm font-medium leading-snug">{d.id} · {C.dimText(locale, d.id).label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{C.pc(locale, "dim.weight")} {d.weight}%</div>
              </div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${barColor(d.score)}`} style={{ width: `${(d.score / 5) * 100}%` }} />
                </div>
                {d.worstComponent && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{C.pc(locale, "dim.worst")}: {d.worstComponent}</div>
                )}
              </div>
              <div className="w-28 shrink-0 text-right text-xs">
                <div className="font-medium text-foreground">{d.score.toFixed(1)}</div>
                <div className="text-muted-foreground">{d.rated}/{d.total} {C.pc(locale, "rated")}</div>
              </div>
            </Link>
          ))}
        </Card>
      </section>

      {/* Direction vector */}
      {profile.directions.length > 0 && (
        <section>
          <SectionLabel>{C.pc(locale, "directions.heading")}</SectionLabel>
          <Card className="p-3">
            <ul className="space-y-1 text-sm">
              {profile.directions.map((code) => (
                <li key={code} className="flex gap-2">
                  <span className="text-muted-foreground" aria-hidden>→</span>
                  <span>{C.directionText(locale, code)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Analyse & Bedarfe tab
function AnalyseTab({
  slug,
  demands,
  onChanged,
  locale,
}: {
  slug: string;
  demands: DemandRef[];
  onChanged: () => Promise<void>;
  locale: Locale;
}) {
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedDemand[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function analyse() {
    setRunning(true);
    setErr(null);
    setCreated(null);
    try {
      const r = await apiSend<AnalyseResult>("POST", `/engagements/${slug}/analyse`);
      setLive(r.live);
      setProposals(r.demands.map((d) => ({ ...d, _create: true })));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function update(i: number, patch: Partial<Proposal>) {
    setProposals((prev) => (prev ? prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) : prev));
  }

  async function createSelected() {
    if (!proposals) return;
    const selected: DemandProposal[] = proposals
      .filter((p) => p._create)
      .map(({ _create, ...rest }) => rest);
    if (selected.length === 0) return;
    setCreating(true);
    setErr(null);
    try {
      const r = await apiSend<{ created: CreatedDemand[] }>("POST", `/engagements/${slug}/demands`, { demands: selected });
      setCreated(r.created);
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const selectedCount = proposals?.filter((p) => p._create).length ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {C.pc(locale, "analyse.intro")}
      </p>

      {/* Demands already created */}
      {demands.length > 0 && (
        <section>
          <SectionLabel as="h3">{C.pc(locale, "analyse.existing")}</SectionLabel>
          <Card className="divide-y">
            {demands.map((d) => (
              <Link
                key={d.id}
                href="/demands"
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{d.id}</span> · {d.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{d.at}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Analyse starten */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={running} onClick={analyse}>
          {running ? C.pc(locale, "btn.analysing") : C.pc(locale, "btn.analyse")}
        </Button>
        {running && <span className="text-xs text-muted-foreground">{C.pc(locale, "analyse.running")}</span>}
        {live === false && (
          <span className="text-xs text-muted-foreground">{C.pc(locale, "analyse.offline")}</span>
        )}
      </div>

      {/* Proposals */}
      {proposals && (
        <section className="space-y-3">
          <SectionLabel as="h3">{C.pc(locale, "proposals.heading")}</SectionLabel>
          {proposals.length === 0 && <p className="text-sm text-muted-foreground">{C.pc(locale, "proposals.none")}</p>}
          <div className="space-y-2">
            {proposals.map((p, i) => (
              <Card key={i} className="p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={p._create}
                    onChange={(e) => update(i, { _create: e.target.checked })}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  {C.pc(locale, "proposals.create")}
                </label>

                <div className="mt-2">
                  <label className={LABEL}>{C.pc(locale, "field.title")}</label>
                  <input
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className={INPUT}
                  />
                </div>

                <div className="mt-2">
                  <label className={LABEL}>{C.pc(locale, "field.problem")}</label>
                  <textarea
                    value={p.problem}
                    onChange={(e) => update(i, { problem: e.target.value })}
                    className={TEXTAREA}
                  />
                </div>

                <div className="mt-2">
                  <label className={LABEL}>{C.pc(locale, "field.lane")}</label>
                  <select
                    value={p.lane ?? ""}
                    onChange={(e) => update(i, { lane: e.target.value || undefined })}
                    className={INPUT}
                  >
                    {LANE_OPTIONS.map((o) => (
                      <option key={o.id || "_auto"} value={o.id}>{o.id === "" ? C.pc(locale, "lane.auto") : o.label}</option>
                    ))}
                  </select>
                </div>

                {p.basis && <p className="mt-2 text-xs text-muted-foreground">{C.pc(locale, "proposals.basis")}: {p.basis}</p>}
              </Card>
            ))}
          </div>

          {proposals.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" disabled={creating || selectedCount === 0} onClick={createSelected}>
                {creating ? C.pc(locale, "btn.creating") : `${C.pc(locale, "btn.createSelected")}${selectedCount ? ` (${selectedCount})` : ""}`}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Created demands (result) */}
      {created && created.length > 0 && (
        <section>
          <SectionLabel as="h3">{C.pc(locale, "created.heading")}</SectionLabel>
          <Card className="divide-y">
            {created.map((c) => (
              <Link
                key={c.id}
                href="/demands"
                className="block px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className="font-medium">{c.id}</span> · {c.title}
              </Link>
            ))}
          </Card>
        </section>
      )}

      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Phase tab
function PhaseTab({
  slug,
  phase,
  meta,
  profile,
  config,
  filledArtefacts,
  onChanged,
  locale,
}: {
  slug: string;
  phase: Phase;
  meta: Meta;
  profile: Profile;
  config: Config;
  filledArtefacts: string[];
  onChanged: () => Promise<void>;
  locale: Locale;
}) {
  const artefacts = config.artefacts.filter((a) => a.phase === phase.id);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{C.phaseText(locale, phase.id).purpose}</p>

      <GateControl slug={slug} phase={phase} verdict={meta.gates[phase.gate.id]} current={phase.id === meta.phase} onChanged={onChanged} locale={locale} />

      {artefacts.length > 0 && (
        <section>
          <SectionLabel as="h3">{C.pc(locale, "artefacts.heading")}</SectionLabel>
          <div className="space-y-2">
            {artefacts.map((a) => (
              <ArtefactCard
                key={a.id}
                slug={slug}
                artefact={a}
                filled={filledArtefacts.includes(a.id)}
                live={config.liveCoaching}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {phase.id === "P1" && <CatalogScoring slug={slug} dimensions={profile.dimensions} locale={locale} />}

      {phase.id === "P3" && (
        <section className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <BranchPicker slug={slug} branches={config.branches} chosen={meta.branch} onChanged={onChanged} locale={locale} />
            <RiskClassPicker slug={slug} classes={config.riskClasses} chosen={meta.riskClass} onChanged={onChanged} locale={locale} />
          </div>
          <RiskChecks slug={slug} locale={locale} />
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ gate control
function GateControl({
  slug,
  phase,
  verdict,
  current,
  onChanged,
  locale,
}: {
  slug: string;
  phase: Phase;
  verdict: GateVerdict | undefined;
  current: boolean;
  onChanged: () => Promise<void>;
  locale: Locale;
}) {
  const gt = C.phaseText(locale, phase.id).gate;
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setGate(passed: boolean, why: string) {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("POST", `/engagements/${slug}/gate`, { torId: phase.gate.id, passed, reason: why });
      await onChanged();
      setFailing(false);
      setReason("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setCurrent() {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("PATCH", `/engagements/${slug}/meta`, { phase: phase.id });
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const verdictMark = verdict ? (verdict.passed ? C.pc(locale, "gate.pass") : C.pc(locale, "gate.fail")) : C.pc(locale, "gate.open");
  const verdictCls = verdict ? (verdict.passed ? "text-[hsl(var(--ok))]" : "text-destructive") : "text-muted-foreground";

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{C.pc(locale, "gate.label")} · {phase.gate.id} — {gt.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{gt.condition}</p>
        </div>
        <span className={`text-sm font-semibold ${verdictCls}`}>{verdictMark}</span>
      </div>

      {verdict && !verdict.passed && verdict.reason && (
        <p className="mt-2 text-xs text-destructive">{C.pc(locale, "gate.reason")}: {verdict.reason}</p>
      )}

      {!failing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setGate(true, "")}>{C.pc(locale, "btn.gatePass")}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setFailing(true)}>{C.pc(locale, "btn.gateFail")}</Button>
          {!current && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={setCurrent}>{C.pc(locale, "btn.setCurrent")}</Button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <label className={LABEL}>{C.pc(locale, "gate.failReason")}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={C.pc(locale, "gate.failPlaceholder")}
            className={TEXTAREA}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy || !reason.trim()} onClick={() => setGate(false, reason.trim())}>{C.pc(locale, "btn.confirmFail")}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFailing(false); setReason(""); }}>{C.pc(locale, "btn.cancel")}</Button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ catalog scoring (P1)
function CatalogScoring({ slug, dimensions, locale }: { slug: string; dimensions: DimensionResult[]; locale: Locale }) {
  return (
    <section>
      <SectionLabel as="h3">{C.pc(locale, "catalog.heading")}</SectionLabel>
      <Card className="divide-y">
        {dimensions.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-medium">{d.id} · {C.dimText(locale, d.id).label}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-muted-foreground">{d.score.toFixed(1)}</span>
              <Link href={`/process/${slug}/assess/${d.id}`} className="text-xs font-medium text-primary hover:underline">
                {C.pc(locale, "btn.assess")}
              </Link>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

// ------------------------------------------------------------------ branch picker
function BranchPicker({
  slug,
  branches,
  chosen,
  onChanged,
  locale,
}: {
  slug: string;
  branches: Branch[];
  chosen: string | undefined;
  onChanged: () => Promise<void>;
  locale: Locale;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const active = branches.find((b) => b.id === chosen);
  const activeText = active ? C.branchText(locale, active.id) : null;

  async function pick(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("PATCH", `/engagements/${slug}/meta`, { branch: chosen === id ? null : id });
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-3">
      <h3 className="text-sm font-semibold">{C.pc(locale, "branch.heading")}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => pick(b.id)}
            className={`rounded-md border px-2.5 py-1 text-xs ${b.id === chosen ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
          >
            {b.id} · {C.branchText(locale, b.id).label}
          </button>
        ))}
      </div>
      {activeText && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="italic">{activeText.when}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {activeText.conditions.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ risk class picker
function RiskClassPicker({
  slug,
  classes,
  chosen,
  onChanged,
  locale,
}: {
  slug: string;
  classes: RiskClass[];
  chosen: string | undefined;
  onChanged: () => Promise<void>;
  locale: Locale;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await apiSend("PATCH", `/engagements/${slug}/meta`, { riskClass: chosen === id ? null : id });
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-3">
      <h3 className="text-sm font-semibold">{C.pc(locale, "risk.heading")}</h3>
      <div className="mt-2 space-y-1.5">
        {classes.map((c) => {
          const rt = C.riskClassText(locale, c.id);
          return (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={() => pick(c.id)}
            className={`block w-full rounded-md border px-2.5 py-1.5 text-left text-xs ${c.id === chosen ? "border-primary bg-primary/10" : "bg-background hover:bg-accent"}`}
          >
            <span className="font-medium">{c.id} · {rt.label}</span>
            <span className="mt-0.5 block text-muted-foreground">{rt.tactic}</span>
          </button>
          );
        })}
      </div>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ risk checks
function RiskChecks({ slug, locale }: { slug: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [checks, setChecks] = useState<RiskCheck[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, { answer: string; evidence: string }>>({});
  const [savingN, setSavingN] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ensureLoaded() {
    if (checks) return;
    try {
      const r = await apiGet<{ checks: RiskCheck[]; answers: Record<string, { answer: string; evidence: string }> }>(
        `/engagements/${slug}/risk`,
      );
      setChecks(r.checks);
      setAnswers(r.answers || {});
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void ensureLoaded();
  }

  function setField(n: number, field: "answer" | "evidence", value: string) {
    setAnswers((prev) => {
      const cur = prev[String(n)] ?? { answer: "", evidence: "" };
      return { ...prev, [String(n)]: { ...cur, [field]: value } };
    });
  }

  async function save(n: number) {
    const cur = answers[String(n)] ?? { answer: "", evidence: "" };
    setSavingN(n);
    setErr(null);
    try {
      const r = await apiSend<{ answers: Record<string, { answer: string; evidence: string }> }>(
        "POST",
        `/engagements/${slug}/risk`,
        { n, answer: cur.answer, evidence: cur.evidence },
      );
      setAnswers(r.answers || {});
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingN(null);
    }
  }

  return (
    <Card className="p-3">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between text-left">
        <h3 className="text-sm font-semibold">{C.pc(locale, "riskchecks.heading")}</h3>
        <span className="text-xs text-muted-foreground">{open ? C.pc(locale, "collapse") : C.pc(locale, "expand")}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {checks === null && !err && <p className="text-sm text-muted-foreground">{C.pc(locale, "loading")}</p>}
          {checks?.map((c) => {
            const cur = answers[String(c.n)] ?? { answer: "", evidence: "" };
            const rt = C.riskCheckText(locale, c.n);
            return (
              <div key={c.n} className="rounded-md border p-2">
                <div className="text-sm font-medium">{c.n}. {rt.label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{rt.how}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>{C.pc(locale, "field.answer")}</label>
                    <input value={cur.answer} onChange={(e) => setField(c.n, "answer", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>{C.pc(locale, "field.evidence")}</label>
                    <input value={cur.evidence} onChange={(e) => setField(c.n, "evidence", e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" disabled={savingN === c.n} onClick={() => save(c.n)}>
                    {savingN === c.n ? C.pc(locale, "btn.saving") : C.pc(locale, "btn.save")}
                  </Button>
                </div>
              </div>
            );
          })}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
    </Card>
  );
}
