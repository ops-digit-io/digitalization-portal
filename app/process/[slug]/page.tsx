"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, SectionLabel } from "@/components/process/ui";
import { SectionCard, type SectionMeta } from "@/components/process/section-card";
import { DigestPanel, type Digest } from "@/components/process/digest-panel";
import { AdvisoryPanel, type AdvisoryMeta } from "@/components/process/advisory-panel";
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
  filledSections?: string[];
  demands?: DemandRef[];
}
interface DemandRef {
  id: string;
  title: string;
  at: string;
}
interface StageGroup {
  id: string;
  label: string;
  subtitle: string;
  order: number;
}
interface Config {
  groups: StageGroup[];
  sections: SectionMeta[];
  advisory: AdvisoryMeta[];
  liveCoaching: boolean;
}
interface ScoreDimension {
  key: string; label: string; weight: number;
  score: number | null; assessed: boolean; coverage: number;
}
/** The engine writes English prose plus a code for the same sentence, so the
 *  display layer can say it in another language without parsing it back. */
interface TextCode { code: string; params?: Record<string, string | number> }
interface ScoreKnockOut {
  key: string; label: string; state: "pass" | "fail" | "unknown";
  note: string; noteCode?: TextCode;
}
interface ScoreResult {
  dimensions: Record<string, ScoreDimension>;
  knockOuts: ScoreKnockOut[];
  overall: number | null;
  coverage: number;
  sectionsAssessed: number;
  sectionsTotal: number;
}
interface LightResult {
  light: "red" | "amber" | "green" | "grey";
  reason: string;
  /** What actually drove the colour — the reason, itemised. */
  drivers: string[];
  reasonCode?: TextCode;
  driverCodes?: TextCode[];
}
interface Engagement {
  meta: Meta;
  profile: Profile;      // the D1–D8 catalogue
  score: ScoreResult;    // the score model
  light: LightResult;
  digest: Digest | null;
  filledSections?: string[];
}

// ------------------------------------------------------------------ Analyse & Bedarfe types
type Lane = "run" | "regulatory" | "continuous_improvement" | "transform" | "innovation" | "data_ai" | "local";

// Lane wording follows the rest of the portal (see app/demands, app/board).
const LANE_OPTIONS: { id: Lane | ""; label: string }[] = [
  { id: "", label: "" }, // filled from the dictionary at render time
  { id: "run", label: "run" },
  { id: "regulatory", label: "regulatory" },
  { id: "continuous_improvement", label: "continuous improvement" },
  { id: "transform", label: "transform" },
  { id: "innovation", label: "innovation" },
  { id: "data_ai", label: "data & AI" },
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

/** The score model's light. Hue is never the interface — the word always rides along. */
const LIGHT_CLS: Record<LightResult["light"], string> = {
  green: "bg-[hsl(var(--ok))] text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-[hsl(var(--destructive))] text-white",
  grey: "bg-secondary text-secondary-foreground",
};

function LightPill({ light, locale }: { light: LightResult["light"]; locale: Locale }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${LIGHT_CLS[light]}`}>
      <span className="size-2 rounded-full bg-current opacity-90" aria-hidden />
      {C.lightLabel(locale, light)}
    </span>
  );
}

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

/** Same idea on the score model's 0–100 scale, at its own floors (40 / 70). */
function scoreBarColor(score: number): string {
  if (score < 40) return "bg-[hsl(var(--destructive))]";
  if (score < 70) return "bg-amber-500";
  return "bg-[hsl(var(--ok))]";
}

const OVERVIEW = "__overview__";
const CATALOGUE = "__catalogue__";
const ADVISORY = "__advisory__";
const ANALYSE = "__analyse__";

/**
 * Tab ↔ URL. The sentinels are internal; the URL carries a readable name
 * (?tab=advisory, ?tab=discovery), so a reload or a shared link lands on the
 * tab the sender was looking at instead of always on Overview.
 */
const TAB_SLUGS: Record<string, string> = {
  [OVERVIEW]: "overview", [ADVISORY]: "advisory", [CATALOGUE]: "catalogue", [ANALYSE]: "analysis",
};
const tabToSlug = (id: string): string => TAB_SLUGS[id] ?? id;
const slugToTab = (v: string | null): string | null => {
  if (!v) return null;
  const hit = Object.entries(TAB_SLUGS).find(([, slug]) => slug === v);
  return hit ? hit[0] : v; // stage ids ("discovery") pass through as-is
};

// ------------------------------------------------------------------ page
export default function EngagementCockpit() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { locale } = useI18n();

  const [eng, setEng] = useState<Engagement | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<string>(OVERVIEW);

  // Adopt the URL's tab once on mount; from then on the URL follows the state.
  // replaceState (not push): tab flips are one view, not browser-history steps.
  useEffect(() => {
    const wanted = slugToTab(new URLSearchParams(window.location.search).get("tab"));
    // Only known ids: the four fixed tabs plus a stage id (lowercase word). A
    // mistyped value must land on Overview, not on a blank panel.
    if (wanted && (TAB_SLUGS[wanted] !== undefined || /^[a-z][a-z-]*$/.test(wanted))) setTabState(wanted);
  }, []);
  const setTab = useCallback((id: string) => {
    setTabState(id);
    const url = new URL(window.location.href);
    if (id === OVERVIEW) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tabToSlug(id));
    window.history.replaceState(null, "", url);
  }, []);

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
        <Link href="/process" className="text-sm text-muted-foreground hover:text-foreground">← {C.pc(locale, "funnel.title")}</Link>
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      </main>
    );
  }
  if (!eng || !config) {
    return <main className="mx-auto max-w-[1100px] px-4 py-6 text-sm text-muted-foreground">{C.pc(locale, "loading")}</main>;
  }

  const { meta, profile, score, light } = eng;
  const filled = meta.filledSections ?? eng.filledSections ?? [];
  const reportUrl = `/api/process/engagements/${slug}/report?format=md`;

  // A ?tab value that matches nothing (a renamed stage, a typo) renders Overview
  // rather than an empty panel under an unselected strip.
  const knownTab =
    [OVERVIEW, CATALOGUE, ADVISORY, ANALYSE].includes(tab) || config.groups.some((g) => g.id === tab)
      ? tab
      : OVERVIEW;
  const activeStage = config.groups.find((g) => g.id === knownTab);
  const byKey = Object.fromEntries(config.sections.map((x) => [x.key, x]));
  const stagesInOrder = [...config.groups].sort((a, b) => a.order - b.order);
  // Engagements written under the earlier phase model carry a stale id ("P0"),
  // which is no longer a stage — fall back to the first stage rather than "—".
  const currentStage = config.groups.find((g) => g.id === meta.phase) ?? stagesInOrder[0]!;
  const koCleared = score.knockOuts.filter((k) => k.state === "pass").length;
  const sectionLabels = Object.fromEntries(config.sections.map((x) => [x.key, C.sectionText(locale, x).label]));

  // One model for the strip, so the keyboard handler and the markup agree.
  // Analysis sits LAST: it reads the finished anamnesis, so it is the closing step.
  const tabs: { id: string; label: string; current?: boolean; count?: string; gate?: "pass" | "fail" | null }[] = [
    { id: OVERVIEW, label: C.pc(locale, "tab.overview") },
    ...stagesInOrder.map((g) => {
      const secs = config.sections.filter((x) => x.group === g.id).sort((a, b) => a.order - b.order);
      const done = secs.filter((x) => filled.includes(x.key)).length;
      const verdicts = secs.map((x) => meta.gates[x.key]).filter(Boolean);
      return {
        id: g.id,
        label: `${g.order} · ${C.stageText(locale, g).label}`,
        current: g.id === currentStage.id,
        ...(secs.length ? { count: `${done}/${secs.length}` } : {}),
        gate: verdicts.length === 0 ? null : verdicts.some((v) => v && !v.passed) ? ("fail" as const) : ("pass" as const),
      };
    }),
    { id: ADVISORY, label: C.pc(locale, "tab.advisory") },
    { id: CATALOGUE, label: C.pc(locale, "tab.catalogue") },
    { id: ANALYSE, label: C.pc(locale, "tab.analyse") },
  ];

  /** Arrow keys move along the strip and wrap; Home/End jump to the ends. */
  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === knownTab);
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
        <span className={`block h-1 w-full ${LIGHT_CLS[light.light]}`} aria-hidden />
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
              <LightPill light={light.light} locale={locale} />
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{C.explainLight(locale, light)}</p>
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
                <span className="text-2xl font-semibold tabular-nums leading-none">{Math.round(score.coverage * 100)}</span>
                <span className="text-xs text-muted-foreground">% · {score.sectionsAssessed}/{score.sectionsTotal}</span>
              </dd>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-foreground/70" style={{ width: `${Math.round(score.coverage * 100)}%` }} />
              </div>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "score.overall")}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums leading-none">
                {score.overall ?? "—"}
              </dd>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {koCleared}/{score.knockOuts.length} {C.pc(locale, "score.knockOuts")} {C.pc(locale, "ko.cleared")}
              </p>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{C.pc(locale, "stat.phase")}</dt>
              <dd className="mt-1 text-sm font-medium leading-tight">
                {`${currentStage.order} · ${C.stageText(locale, currentStage).label}`}
              </dd>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {filled.length}/{config.sections.length} {C.pc(locale, "sections.heading")}
              </p>
            </div>
          </dl>
        </div>
      </Card>

      {/* Tab strip — a real tablist: one tab stop, arrow keys move between tabs.
          Nine tabs do not fit on a laptop, so the strip scrolls and a fade on the
          right edge says there is more — a strip that just ends looks complete. */}
      <div className="relative mt-4">
        <div
          role="tablist"
          aria-label={C.pc(locale, "tabs.label")}
          className="flex flex-nowrap gap-1 overflow-x-auto border-b"
          onKeyDown={onTabKeyDown}
        >
          {tabs.map((t) => (
            <TabButton
              key={t.id}
              id={t.id}
              label={t.label}
              active={knownTab === t.id}
              current={t.current}
              count={t.count}
              gate={t.gate}
              onClick={() => setTab(t.id)}
            />
          ))}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        />
      </div>

      {/* Tab content */}
      <div
        id={`panel-${knownTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${knownTab}`}
        tabIndex={0}
        className="mt-4 outline-none"
      >
        {knownTab === OVERVIEW && (
          <OverviewTab
            slug={slug}
            score={score}
            light={light}
            digest={eng.digest}
            live={config.liveCoaching}
            locale={locale}
            onChanged={reload}
          />
        )}
        {knownTab === CATALOGUE && <CatalogueTab slug={slug} profile={profile} locale={locale} />}
        {knownTab === ADVISORY && (
          <AdvisoryTab
            slug={slug}
            items={config.advisory}
            filled={filled}
            sectionLabels={sectionLabels}
            live={config.liveCoaching}
            locale={locale}
          />
        )}
        {activeStage && (
          <StageTab
            key={activeStage.id}
            slug={slug}
            stage={activeStage}
            sections={config.sections.filter((x) => x.group === activeStage.id).sort((a, b) => a.order - b.order)}
            byKey={byKey}
            filled={filled}
            gates={meta.gates}
            live={config.liveCoaching}
            locale={locale}
            onChanged={reload}
          />
        )}
        {knownTab === ANALYSE && (
          <AnalyseTab
            slug={slug}
            demands={meta.demands ?? []}
            onChanged={reload}
            locale={locale}
            profile={profile}
            onGoProfile={() => setTab(CATALOGUE)}
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

// ------------------------------------------------------------------ Overview tab
/**
 * What the light rests on, then the derived one-screen digest.
 *
 * The five dimensions of the score model come first because they are the light's
 * actual basis; the digest is marked as derived inside its own panel and never
 * mixed into the numbers above it.
 */
function OverviewTab({
  slug,
  score,
  light,
  digest,
  live,
  locale,
  onChanged,
}: {
  slug: string;
  score: ScoreResult;
  light: LightResult;
  digest: Digest | null;
  live: boolean;
  locale: Locale;
  onChanged: () => Promise<void>;
}) {
  const dims = Object.values(score.dimensions).sort((a, b) => b.weight - a.weight);
  const drivers = C.lightDrivers(locale, light);
  return (
    <div className="space-y-4">
      <section>
        <SectionLabel>{C.pc(locale, "score.heading")}</SectionLabel>
        <Card className="divide-y">
          {dims.map((d) => (
            <div key={d.key} className="flex items-center gap-3 px-3 py-2">
              <div className="w-56 shrink-0">
                <div className="text-sm font-medium leading-snug">{C.scoreDimLabel(locale, d.key, d.label)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{C.pc(locale, "dim.weight")} {d.weight}%</div>
              </div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  {/* Partial evidence is drawn faint: a bar at full opacity is a claim. */}
                  <div
                    className={`h-full ${d.score === null ? "bg-secondary" : scoreBarColor(d.score)} ${d.assessed ? "" : "opacity-50"}`}
                    style={{ width: `${d.score ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="w-36 shrink-0 text-right text-xs">
                <div className="font-medium tabular-nums text-foreground">{d.score ?? "—"}</div>
                {/* A score standing on half the evidence says so next to itself. */}
                <div className="text-muted-foreground">
                  {d.score === null
                    ? C.pc(locale, "score.notAssessed")
                    : `${Math.round(d.coverage * 100)}%${d.assessed ? "" : ` · ${C.pc(locale, "score.partial")}`}`}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* Knock-outs: never averaged into anything, so never drawn as a bar. */}
      <section>
        <SectionLabel>{C.pc(locale, "score.knockOuts")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {score.knockOuts.map((k) => {
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
              <div key={k.key} className={`max-w-sm rounded-md border px-3 py-2 text-sm ${tone}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${markCls}`} aria-hidden>{mark}</span>
                  <span className="font-medium">{C.koLabel(locale, k.key, k.label)}</span>
                </div>
                <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{C.koNote(locale, k)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {drivers.length > 0 && (
        <section>
          <SectionLabel>{C.pc(locale, "directions.heading")}</SectionLabel>
          <Card className="p-3">
            <ul className="space-y-1 text-sm">
              {drivers.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-muted-foreground" aria-hidden>→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <SectionLabel>{C.pc(locale, "digest.heading")}</SectionLabel>
        <DigestPanel slug={slug} digest={digest} live={live} locale={locale} onChanged={onChanged} />
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Advisory tab
function AdvisoryTab({
  slug,
  items,
  filled,
  sectionLabels,
  live,
  locale,
}: {
  slug: string;
  items: AdvisoryMeta[];
  filled: string[];
  sectionLabels: Record<string, string | undefined>;
  live: boolean;
  locale: Locale;
}) {
  const ordered = [...items].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{C.pc(locale, "advisory.intro")}</p>
      <div className="space-y-2">
        {ordered.map((a) => (
          <AdvisoryPanel key={a.key} slug={slug} item={a} live={live} locale={locale} sectionLabels={sectionLabels} />
        ))}
      </div>
      {filled.length === 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          {C.pc(locale, "advisory.standsOn")}: {ordered.flatMap((a) => a.needs).filter((k, i, all) => all.indexOf(k) === i)
            .map((k) => sectionLabels[k] ?? k).join(", ")}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Catalogue tab (D1–D8)
function CatalogueTab({ slug, profile, locale }: { slug: string; profile: Profile; locale: Locale }) {
  return (
    <div className="space-y-4">
      {/* The catalogue keeps its own verdict — it is a second reading, not the light. */}
      <Card className="flex flex-wrap items-start gap-3 p-3">
        <StatusPill status={profile.status} locale={locale} />
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">{C.explainStatus(locale, profile)}</p>
      </Card>

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
  profile,
  onGoProfile,
}: {
  slug: string;
  demands: DemandRef[];
  onChanged: () => Promise<void>;
  locale: Locale;
  profile: Profile;
  onGoProfile: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedDemand[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Analysing an unassessed diagnosis would derive demands from the §1.3
  // convention rather than from evidence, so the step is blocked outright.
  const nothingAssessed = profile.ratedCount === 0;
  const pct = Math.round(profile.coverage * 100);
  const thin = !nothingAssessed && profile.coverage < 0.5;

  async function analyse() {
    setRunning(true);
    setErr(null);
    setCreated(null);
    try {
      const r = await apiSend<AnalyseResult>("POST", `/engagements/${slug}/analyse?lang=${locale}`);
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
      const r = await apiSend<{ created: CreatedDemand[] }>("POST", `/engagements/${slug}/demands?lang=${locale}`, { demands: selected });
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
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{C.pc(locale, "analyse.intro")}</p>
        <p className="border-l-2 border-border pl-3 text-xs text-muted-foreground">{C.pc(locale, "analyse.order")}</p>
      </div>

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

      {/* Step 1 — analyse */}
      <section>
        <SectionLabel as="h3">{C.pc(locale, "analyse.step1")}</SectionLabel>
        {nothingAssessed ? (
          <Card className="flex flex-wrap items-center gap-3 border-amber-500/40 bg-amber-500/5 p-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">{C.pc(locale, "analyse.blocked")}</p>
            <Button size="sm" variant="outline" onClick={onGoProfile}>{C.pc(locale, "analyse.goAssess")}</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {thin && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                {C.pc(locale, "analyse.thin").replace("{pct}", String(pct))}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" disabled={running} onClick={analyse}>
                {running ? C.pc(locale, "btn.analysing") : C.pc(locale, "btn.analyse")}
              </Button>
              {running && <span className="text-xs text-muted-foreground">{C.pc(locale, "analyse.running")}</span>}
              {live === false && !running && (
                <span className="text-xs text-muted-foreground">{C.pc(locale, "analyse.offline")}</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Step 2 — review and create */}
      {proposals && (
        <section className="space-y-3">
          <SectionLabel as="h3">{C.pc(locale, "analyse.step2")}</SectionLabel>
          {proposals.length === 0 && (
            <p className="text-sm text-muted-foreground">{C.pc(locale, "analyse.empty")}</p>
          )}
          {proposals.length > 0 && (
            <p className="text-xs text-muted-foreground">{C.pc(locale, "analyse.destination")}</p>
          )}
          <div className="space-y-2">
            {proposals.map((p, i) => (
              <Card key={i} className={`p-3 ${p._create ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={p._create}
                      onChange={(e) => update(i, { _create: e.target.checked })}
                      className="size-4 accent-[hsl(var(--primary))]"
                    />
                    {C.pc(locale, "proposals.create")}
                  </label>
                  {/* Why this demand exists — the line that makes it checkable. */}
                  {p.basis && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {C.pc(locale, "analyse.basis")}: {p.basis}
                    </span>
                  )}
                </div>

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
                      <option key={o.id || "_auto"} value={o.id}>
                        {o.id === "" ? C.pc(locale, "lane.auto") : o.label}
                      </option>
                    ))}
                  </select>
                </div>

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
          <Link href="/demands" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
            {C.pc(locale, "analyse.openFunnel")} →
          </Link>
        </section>
      )}

      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Stage tab
/**
 * One stage of the anamnesis: its sections in sequence. A section is locked
 * until every key in its `blocking` list has content — the sequence is the point,
 * so a locked section is shown greyed with what it waits for, never hidden.
 */
function StageTab({
  slug,
  stage,
  sections,
  byKey,
  filled,
  gates,
  live,
  locale,
  onChanged,
}: {
  slug: string;
  stage: StageGroup;
  sections: SectionMeta[];
  byKey: Record<string, SectionMeta | undefined>;
  filled: string[];
  gates: Record<string, GateVerdict>;
  live: boolean;
  locale: Locale;
  onChanged: () => Promise<void>;
}) {
  const done = new Set(filled);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{C.stageText(locale, stage).subtitle}</p>
        <p className="mt-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">{C.pc(locale, "anamnesis.intro")}</p>
      </div>

      <section>
        <SectionLabel as="h3">{C.pc(locale, "sections.heading")}</SectionLabel>
        <div className="space-y-2">
          {sections.map((sec) => {
            const missing = sec.blocking.filter((b) => !done.has(b));
            return (
              <SectionCard
                key={sec.key}
                slug={slug}
                section={sec}
                filled={done.has(sec.key)}
                locked={missing.length > 0}
                blockedBy={missing.map((b) => byKey[b]?.label ?? b)}
                {...(gates[sec.key] ? { verdict: gates[sec.key]! } : {})}
                live={live}
                locale={locale}
                onChanged={onChanged}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
