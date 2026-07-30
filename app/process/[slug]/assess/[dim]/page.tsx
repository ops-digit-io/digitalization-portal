"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, apiSend, Md } from "@/components/process/ui";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const TEXTAREA = "mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

type Confidence = "S" | "P" | "I";
type Level = 1 | 2 | 3 | 4 | 5;

interface Rating {
  level: Level;
  confidence?: Confidence;
  evidence?: string;
}
interface Criterion {
  id: string;
  dimension: string;
  label: string;
  question: string;
  evidence: string;
  knockout?: "intake" | "optimisation";
  perComponent?: boolean;
  scale: [string, string, string, string, string];
}
interface Ratings {
  criteria: Record<string, Rating>;
  components: Record<string, Record<string, Rating>>;
}
interface Component {
  id: string;
  label: string;
}
interface Dimension {
  id: string;
  label: string;
  question: string;
  weight: number;
}
interface DimData {
  dimension: Dimension;
  criteria: Criterion[];
  evidence: string;
  ratings: Ratings;
  components: Component[];
}
interface ProfileDim {
  id: string;
  score: number | null;
  rated: number;
  total: number;
}
interface Profile {
  dimensions: ProfileDim[];
}
interface Config {
  liveCoaching: boolean;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const CONFIDENCES: Confidence[] = ["S", "P", "I"];

/** Read the current rating for a criterion (+ optional component) from ratings. */
function currentRating(ratings: Ratings, critId: string, componentId?: string): Rating | undefined {
  if (componentId) return ratings.components[componentId]?.[critId];
  return ratings.criteria[critId];
}

export default function AssessDimension() {
  const params = useParams<{ slug: string; dim: string }>();
  const slug = params.slug;
  const dim = params.dim;

  const [data, setData] = useState<DimData | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [profileDim, setProfileDim] = useState<ProfileDim | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, c, eng] = await Promise.all([
      apiGet<DimData>(`/engagements/${slug}/dimension/${dim}`),
      apiGet<Config>("/config"),
      apiGet<{ profile: Profile }>(`/engagements/${slug}`),
    ]);
    setData(d);
    setConfig(c);
    setProfileDim(eng.profile.dimensions.find((x) => x.id === dim) ?? null);
  }, [slug, dim]);

  useEffect(() => {
    let cancelled = false;
    load().catch((err: Error) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const applyRateResult = useCallback((r: { profile: Profile; ratings: Ratings }) => {
    setData((prev) => (prev ? { ...prev, ratings: r.ratings } : prev));
    setProfileDim(r.profile.dimensions.find((x) => x.id === dim) ?? null);
  }, [dim]);

  if (error) {
    return (
      <main className="mx-auto max-w-[1100px] px-4 py-6">
        <Link href={`/process/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">← zurück</Link>
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      </main>
    );
  }
  if (!data || !config) {
    return <main className="mx-auto max-w-[1100px] px-4 py-6 text-sm text-muted-foreground">Lädt…</main>;
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/process" className="hover:text-foreground">Process Funnel</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/process/${slug}`} className="hover:text-foreground">{slug}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{data.dimension.id}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{data.dimension.id} · {data.dimension.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.dimension.question}</p>
        </div>
        <div className="text-right text-sm">
          <div className="text-xs text-muted-foreground">Dimensionswert</div>
          <div className="font-semibold">
            {profileDim && profileDim.score !== null ? profileDim.score.toFixed(1) : "—"}
            {profileDim ? <span className="ml-1 text-xs font-normal text-muted-foreground">({profileDim.rated}/{profileDim.total})</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Left: Bewertung */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bewertung</h2>
          <div className="space-y-3">
            {data.criteria.map((c) => (
              <CriterionCard
                key={c.id}
                slug={slug}
                criterion={c}
                components={data.components}
                ratings={data.ratings}
                onResult={applyRateResult}
              />
            ))}
          </div>
        </section>

        {/* Right: Coaching */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coaching</h2>
          <CoachingPanel slug={slug} dim={dim} liveCoaching={config.liveCoaching} initialEvidence={data.evidence} />
        </section>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ criterion card
function CriterionCard({
  slug,
  criterion,
  components,
  ratings,
  onResult,
}: {
  slug: string;
  criterion: Criterion;
  components: Component[];
  ratings: Ratings;
  onResult: (r: { profile: Profile; ratings: Ratings }) => void;
}) {
  const perComp = !!criterion.perComponent;
  // For a per-component criterion, render one rating set per component (fallback to a single "process" set if none).
  const targets: (Component | null)[] = perComp
    ? components.length
      ? components
      : []
    : [null];

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{criterion.id}</span>
        <span className="text-sm">{criterion.label}</span>
        {criterion.knockout && (
          <span className="rounded-full bg-[hsl(var(--destructive))] px-2 py-0.5 text-[10px] font-semibold text-white">K.o.</span>
        )}
        {perComp && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">je Kernkomponente</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{criterion.question}</p>
      <p className="mt-1 text-[11px] text-muted-foreground"><span className="font-medium">Evidenz:</span> {criterion.evidence}</p>

      {perComp && components.length === 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
          Keine Kernkomponenten hinterlegt — im Cockpit ergänzen, dann hier bewerten.
        </p>
      )}

      <div className="mt-2 space-y-3">
        {targets.map((t) => (
          <RatingSet
            key={t ? t.id : "_process"}
            slug={slug}
            criterion={criterion}
            component={t}
            rating={currentRating(ratings, criterion.id, t?.id)}
            onResult={onResult}
          />
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ rating set (one criterion, optionally one component)
function RatingSet({
  slug,
  criterion,
  component,
  rating,
  onResult,
}: {
  slug: string;
  criterion: Criterion;
  component: Component | null;
  rating: Rating | undefined;
  onResult: (r: { profile: Profile; ratings: Ratings }) => void;
}) {
  // Local state is the source of truth for the UI so every interaction feels instant;
  // the POST fires in the background and the stored rating reconciles afterwards.
  const [level, setLevel] = useState<Level | null>(rating?.level ?? null);
  const [evidence, setEvidence] = useState(rating?.evidence ?? "");
  const [confidence, setConfidence] = useState<Confidence | "">(rating?.confidence ?? "");
  const [err, setErr] = useState<string | null>(null);
  // Number of in-flight POSTs; while > 0 we do not let a (possibly stale) stored
  // rating clobber newer local edits.
  const pending = useRef(0);

  // Reconcile drafts from the stored rating only when nothing is in flight.
  useEffect(() => {
    if (pending.current > 0) return;
    setLevel(rating?.level ?? null);
    setEvidence(rating?.evidence ?? "");
    setConfidence(rating?.confidence ?? "");
  }, [rating?.level, rating?.evidence, rating?.confidence]);

  const post = useCallback(
    async (nextLevel: Level | null, opts?: { evidence?: string; confidence?: Confidence | "" }) => {
      setErr(null);
      const ev = opts?.evidence ?? evidence;
      const cf = opts?.confidence ?? confidence;
      pending.current += 1;
      try {
        const body: Record<string, unknown> = { critId: criterion.id, level: nextLevel };
        if (component) body.componentId = component.id;
        if (nextLevel !== null) {
          if (cf) body.confidence = cf;
          if (ev.trim()) body.evidence = ev.trim();
        }
        const r = await apiSend<{ profile: Profile; ratings: Ratings }>("POST", `/engagements/${slug}/rate`, body);
        onResult(r);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        pending.current -= 1;
      }
    },
    [criterion.id, component, evidence, confidence, slug, onResult],
  );

  return (
    <div className={component ? "rounded-md border p-2" : ""}>
      {component && <div className="mb-1.5 text-xs font-medium text-muted-foreground">Komponente: {component.label}</div>}

      <div className="space-y-1" role="radiogroup" aria-label={`${criterion.id} Stufe`}>
        {criterion.scale.map((text, i) => {
          const n = (i + 1) as Level;
          const selected = level === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { setLevel(n); void post(n); }}
              className={`flex w-full gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${selected ? "border-primary bg-primary/10" : "bg-background hover:bg-accent"}`}
            >
              <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`} aria-hidden>
                {selected ? "✓" : ""}
              </span>
              <span><span className="font-semibold">S{n}:</span> {text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className={LABEL}>Evidenz</label>
          <input
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            onBlur={() => { if (level !== null && (evidence.trim() !== (rating?.evidence ?? "").trim())) void post(level); }}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Konfidenz</label>
          <div className="mt-1 inline-flex rounded-md border p-0.5 text-xs">
            {CONFIDENCES.map((cf) => (
              <button
                key={cf}
                type="button"
                onClick={() => {
                  const next = confidence === cf ? "" : cf;
                  setConfidence(next);
                  if (level !== null) void post(level, { confidence: next });
                }}
                className={`rounded px-2 py-1 ${confidence === cf ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {cf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={level === null}
          onClick={() => { setLevel(null); void post(null); }}
          className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-40"
        >
          Stufe löschen
        </button>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ coaching panel
function CoachingPanel({
  slug,
  dim,
  liveCoaching,
  initialEvidence,
}: {
  slug: string;
  dim: string;
  liveCoaching: boolean;
  initialEvidence: string;
}) {
  return (
    <div className="space-y-3">
      <Card className="p-3">
        {liveCoaching ? <Chat slug={slug} dim={dim} /> : (
          <p className="text-xs text-muted-foreground">Live-Coaching aus — manuelle Bewertung weiter möglich.</p>
        )}
      </Card>

      <EvidenceNote slug={slug} dim={dim} initial={initialEvidence} />
    </div>
  );
}

function Chat({ slug, dim }: { slug: string; dim: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setErr(null);
    try {
      const r = await apiSend<{ text: string }>("POST", `/engagements/${slug}/dimension/${dim}/coach`, { messages: next });
      setMessages([...next, { role: "assistant", content: r.text }]);
    } catch (e) {
      const ex = e as Error & { code?: string; status?: number };
      if (ex.code === "NO_KEY" || ex.status === 503) setOffline(true);
      else setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (offline) {
    return <p className="mt-2 text-xs text-muted-foreground">Live-Coaching aus — manuelle Bewertung weiter möglich.</p>;
  }

  return (
    <div className="mt-3">
      <div ref={scrollRef} className="max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-xs text-muted-foreground">Frag den Coach zur Erhebung dieser Dimension.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-md border p-2 text-sm ${m.role === "user" ? "bg-secondary/40" : "bg-background"}`}>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {m.role === "user" ? "Du" : "Coach"}
            </div>
            {m.role === "assistant" ? <Md>{m.content}</Md> : <p className="whitespace-pre-wrap">{m.content}</p>}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">Coach denkt…</p>}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Nachricht…"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" disabled={busy || !input.trim()} onClick={send}>Senden</Button>
      </div>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function EvidenceNote({ slug, dim, initial }: { slug: string; dim: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (value === saved || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiSend("PUT", `/engagements/${slug}/dimension/${dim}`, { content: value });
      setSaved(value);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [value, saved, busy, slug, dim]);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <label className={LABEL}>Notiz / Evidenz</label>
        <span className="text-[10px] text-muted-foreground">{value === saved ? "gespeichert" : "ungespeichert"}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Beobachtungen, Belege, Zitate…"
        className={TEXTAREA}
      />
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={busy || value === saved} onClick={save}>
          {busy ? "Speichert…" : "Speichern"}
        </Button>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </Card>
  );
}
