"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend } from "@/components/process/ui";
import { ArtefactCard } from "@/components/process/artefact-card";

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
  score: number | null;
  rated: number;
  total: number;
  covered: boolean;
  worstComponent?: string;
}
interface KnockOutResult {
  id: string;
  label: string;
  koClass: "intake" | "optimisation";
  level: number | null;
  state: KoState;
}
interface Profile {
  dimensions: DimensionResult[];
  knockOuts: KnockOutResult[];
  status: Status;
  reason: string;
  portfolioValue: number | null;
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

const ANFLUG_LABEL: Record<Anflug, string> = { process: "Prozess-Pull", technology: "Technologie-Push" };

const STATUS_PILL: Record<Status, { cls: string; label: string }> = {
  gruen: { cls: "bg-[hsl(var(--ok))] text-white", label: "Grün" },
  gelb: { cls: "bg-amber-500 text-white", label: "Gelb" },
  rot: { cls: "bg-[hsl(var(--destructive))] text-white", label: "Rot" },
  grau: { cls: "bg-secondary text-secondary-foreground", label: "Grau" },
};

function StatusPill({ status }: { status: Status }) {
  const s = STATUS_PILL[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <span className="size-2 rounded-full bg-current opacity-90" aria-hidden />
      {s.label}
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
    return <main className="mx-auto max-w-[1100px] px-4 py-6 text-sm text-muted-foreground">Lädt…</main>;
  }

  const { meta, profile } = eng;
  const filledArtefacts = meta.filledArtefacts ?? eng.filledArtefacts ?? [];
  const reportUrl = `/api/process/engagements/${slug}/report?format=md`;

  const activePhase = config.phases.find((p) => p.id === tab);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/process" className="hover:text-foreground">Process Funnel</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{meta.title}</span>
      </nav>

      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{meta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta.owner || "kein Owner"}
              {meta.champion ? ` · Champion ${meta.champion}` : ""}
              {meta.unit ? ` · ${meta.unit}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Anflug: {ANFLUG_LABEL[meta.anflug]}</p>
          </div>
          <div className="text-right">
            <StatusPill status={profile.status} />
            <p className="mt-1 max-w-md text-xs text-muted-foreground">{profile.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">Abdeckung {Math.round(profile.coverage * 100)} %</p>
            <a href={reportUrl} className="mt-1 inline-block text-xs font-medium text-primary hover:underline" download>
              Bericht (Markdown)
            </a>
          </div>
        </div>
      </Card>

      {/* Tab strip */}
      <div className="mt-4 flex flex-nowrap gap-1 overflow-x-auto border-b">
        <TabButton label="Profil" active={tab === PROFIL} onClick={() => setTab(PROFIL)} />
        <TabButton label="Analyse & Bedarfe" active={tab === ANALYSE} onClick={() => setTab(ANALYSE)} />
        {config.phases.map((p) => {
          const inPhase = config.artefacts.filter((a) => a.phase === p.id);
          const done = inPhase.filter((a) => filledArtefacts.includes(a.id)).length;
          return (
            <TabButton
              key={p.id}
              label={`${p.n} · ${p.label}`}
              active={tab === p.id}
              current={p.id === meta.phase}
              count={inPhase.length ? `${done}/${inPhase.length}` : undefined}
              onClick={() => setTab(p.id)}
            />
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === PROFIL && <ProfilTab slug={slug} profile={profile} />}
        {tab === ANALYSE && <AnalyseTab slug={slug} demands={meta.demands ?? []} onChanged={reload} />}
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
          />
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ tab button
function TabButton({
  label,
  active,
  current,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  current?: boolean;
  count?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
        active ? "border-b-2 border-foreground font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {current && <span className="size-1.5 rounded-full bg-primary" aria-label="aktuelle Phase" />}
      {label}
      {count && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span>}
    </button>
  );
}

// ------------------------------------------------------------------ Profil tab
function ProfilTab({ slug, profile }: { slug: string; profile: Profile }) {
  return (
    <div className="space-y-4">
      {/* Knock-outs */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Knock-outs</h2>
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
            const stateLabel = k.state === "pass" ? "bestanden" : k.state === "fail" ? "gescheitert" : "offen";
            return (
              <div key={k.id} className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${markCls}`} aria-hidden>{mark}</span>
                  <span className="font-medium">{k.id}</span>
                  <span className="text-muted-foreground">{k.label}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {k.level ? `S${k.level}` : "—"} · {stateLabel} · {k.koClass === "intake" ? "Aufnahme-K.o." : "Optimierungs-K.o."}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dimensionsprofil */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dimensionsprofil</h2>
        <Card className="divide-y">
          {profile.dimensions.map((d) => (
            <Link
              key={d.id}
              href={`/process/${slug}/assess/${d.id}`}
              className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent"
            >
              <div className="w-40 shrink-0">
                <div className="text-sm font-medium">{d.id} · {d.label}</div>
                <div className="text-xs text-muted-foreground">Gewicht {d.weight}%</div>
              </div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  {d.score !== null && (
                    <div className={`h-full ${barColor(d.score)}`} style={{ width: `${(d.score / 5) * 100}%` }} />
                  )}
                </div>
                {d.worstComponent && (
                  <div className="mt-0.5 text-xs text-muted-foreground">schwächste Komponente: {d.worstComponent}</div>
                )}
              </div>
              <div className="w-28 shrink-0 text-right text-xs">
                <div className="font-medium text-foreground">{d.score !== null ? d.score.toFixed(1) : "nicht bewertet"}</div>
                <div className="text-muted-foreground">{d.rated}/{d.total} bewertet</div>
              </div>
            </Link>
          ))}
        </Card>
      </section>

      {/* Richtungsvektor */}
      {profile.directions.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Richtungsvektor (Vorindikation)</h2>
          <Card className="p-3">
            <ul className="space-y-1 text-sm">
              {profile.directions.map((x, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground" aria-hidden>→</span>
                  <span>{x}</span>
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
}: {
  slug: string;
  demands: DemandRef[];
  onChanged: () => Promise<void>;
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
        Der Analyse-Agent zerlegt die Diagnose in einzelne Bedarfe und legt sie im Bedarfs-Funnel an.
      </p>

      {/* Bereits angelegte Bedarfe */}
      {demands.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bereits angelegte Bedarfe</h3>
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
          {running ? "Analysiert…" : "Analysieren"}
        </Button>
        {running && <span className="text-xs text-muted-foreground">Der Agent zerlegt die Diagnose…</span>}
        {live === false && (
          <span className="text-xs text-muted-foreground">ohne Modell-Key: regelbasierter Vorschlag</span>
        )}
      </div>

      {/* Vorschläge */}
      {proposals && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vorgeschlagene Bedarfe</h3>
          {proposals.length === 0 && <p className="text-sm text-muted-foreground">Keine Bedarfe vorgeschlagen.</p>}
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
                  anlegen
                </label>

                <div className="mt-2">
                  <label className={LABEL}>Titel</label>
                  <input
                    value={p.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className={INPUT}
                  />
                </div>

                <div className="mt-2">
                  <label className={LABEL}>Problem</label>
                  <textarea
                    value={p.problem}
                    onChange={(e) => update(i, { problem: e.target.value })}
                    className={TEXTAREA}
                  />
                </div>

                <div className="mt-2">
                  <label className={LABEL}>Lane</label>
                  <select
                    value={p.lane ?? ""}
                    onChange={(e) => update(i, { lane: e.target.value || undefined })}
                    className={INPUT}
                  >
                    {LANE_OPTIONS.map((o) => (
                      <option key={o.id || "_auto"} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {p.basis && <p className="mt-2 text-xs text-muted-foreground">Basis: {p.basis}</p>}
              </Card>
            ))}
          </div>

          {proposals.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" disabled={creating || selectedCount === 0} onClick={createSelected}>
                {creating ? "Legt an…" : `Ausgewählte Bedarfe anlegen${selectedCount ? ` (${selectedCount})` : ""}`}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Angelegte Bedarfe (Ergebnis) */}
      {created && created.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Angelegt</h3>
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
}: {
  slug: string;
  phase: Phase;
  meta: Meta;
  profile: Profile;
  config: Config;
  filledArtefacts: string[];
  onChanged: () => Promise<void>;
}) {
  const artefacts = config.artefacts.filter((a) => a.phase === phase.id);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{phase.purpose}</p>

      <GateControl slug={slug} phase={phase} verdict={meta.gates[phase.gate.id]} current={phase.id === meta.phase} onChanged={onChanged} />

      {artefacts.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artefakte</h3>
          <div className="space-y-2">
            {artefacts.map((a) => (
              <ArtefactCard
                key={a.id}
                slug={slug}
                artefact={a}
                filled={filledArtefacts.includes(a.id)}
                live={config.liveCoaching}
              />
            ))}
          </div>
        </section>
      )}

      {phase.id === "P1" && <CatalogScoring slug={slug} dimensions={profile.dimensions} />}

      {phase.id === "P3" && (
        <section className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <BranchPicker slug={slug} branches={config.branches} chosen={meta.branch} onChanged={onChanged} />
            <RiskClassPicker slug={slug} classes={config.riskClasses} chosen={meta.riskClass} onChanged={onChanged} />
          </div>
          <RiskChecks slug={slug} />
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
}: {
  slug: string;
  phase: Phase;
  verdict: GateVerdict | undefined;
  current: boolean;
  onChanged: () => Promise<void>;
}) {
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

  const verdictMark = verdict ? (verdict.passed ? "✓ Bestanden" : "✕ Verfehlt") : "○ offen";
  const verdictCls = verdict ? (verdict.passed ? "text-[hsl(var(--ok))]" : "text-destructive") : "text-muted-foreground";

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Tor · {phase.gate.id} — {phase.gate.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{phase.gate.condition}</p>
        </div>
        <span className={`text-sm font-semibold ${verdictCls}`}>{verdictMark}</span>
      </div>

      {verdict && !verdict.passed && verdict.reason && (
        <p className="mt-2 text-xs text-destructive">Grund: {verdict.reason}</p>
      )}

      {!failing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setGate(true, "")}>Tor bestehen</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setFailing(true)}>Tor verfehlen</Button>
          {!current && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={setCurrent}>Als aktuelle Phase setzen</Button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <label className={LABEL}>Grund (Pflicht bei Verfehlen)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Warum wurde das Tor verfehlt?"
            className={TEXTAREA}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy || !reason.trim()} onClick={() => setGate(false, reason.trim())}>Verfehlen bestätigen</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFailing(false); setReason(""); }}>Abbrechen</Button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ catalog scoring (P1)
function CatalogScoring({ slug, dimensions }: { slug: string; dimensions: DimensionResult[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Katalog-Scoring (D1–D8)</h3>
      <Card className="divide-y">
        {dimensions.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-medium">{d.id} · {d.label}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-muted-foreground">{d.score !== null ? d.score.toFixed(1) : "nicht bewertet"}</span>
              <Link href={`/process/${slug}/assess/${d.id}`} className="text-xs font-medium text-primary hover:underline">
                bewerten
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
}: {
  slug: string;
  branches: Branch[];
  chosen: string | undefined;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const active = branches.find((b) => b.id === chosen);

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
      <h3 className="text-sm font-semibold">Zweig</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            onClick={() => pick(b.id)}
            className={`rounded-md border px-2.5 py-1 text-xs ${b.id === chosen ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
          >
            {b.id} · {b.label}
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="italic">{active.when}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {active.conditions.map((c, i) => <li key={i}>{c}</li>)}
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
}: {
  slug: string;
  classes: RiskClass[];
  chosen: string | undefined;
  onChanged: () => Promise<void>;
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
      <h3 className="text-sm font-semibold">Risikoklasse</h3>
      <div className="mt-2 space-y-1.5">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={() => pick(c.id)}
            className={`block w-full rounded-md border px-2.5 py-1.5 text-left text-xs ${c.id === chosen ? "border-primary bg-primary/10" : "bg-background hover:bg-accent"}`}
          >
            <span className="font-medium">{c.id} · {c.label}</span>
            <span className="mt-0.5 block text-muted-foreground">{c.tactic}</span>
          </button>
        ))}
      </div>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ risk checks
function RiskChecks({ slug }: { slug: string }) {
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
        <h3 className="text-sm font-semibold">Änderungsrisiko — 7 Prüfpunkte</h3>
        <span className="text-xs text-muted-foreground">{open ? "einklappen ▲" : "ausklappen ▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {checks === null && !err && <p className="text-sm text-muted-foreground">Lädt…</p>}
          {checks?.map((c) => {
            const cur = answers[String(c.n)] ?? { answer: "", evidence: "" };
            return (
              <div key={c.n} className="rounded-md border p-2">
                <div className="text-sm font-medium">{c.n}. {c.label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.how}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Antwort</label>
                    <input value={cur.answer} onChange={(e) => setField(c.n, "answer", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Evidenz</label>
                    <input value={cur.evidence} onChange={(e) => setField(c.n, "evidence", e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" disabled={savingN === c.n} onClick={() => save(c.n)}>
                    {savingN === c.n ? "Speichert…" : "Speichern"}
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
