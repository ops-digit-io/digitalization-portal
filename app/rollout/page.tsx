import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import {
  parseTechnology,
  parseRollout,
  unadoptedWaves,
  declined,
  byRing,
  waveProgress,
  adoptionByPlant,
  summariseRollout,
  type TechStatus,
} from "@/lib/otx/rollout";
import { parsePlants } from "@/lib/otx/landscape";

export const dynamic = "force-dynamic";

/**
 * Technology decisions & scaling waves.
 *
 * The two registers are on one page on purpose: an evaluation whose verdict is
 * not attached to a consequence is a blog post. The invariant that joins them —
 * only an `adopt` technology may enter a wave — is rendered as a finding at the
 * top when it is broken, because a violated governance rule is not a warning.
 *
 * The declined column is not an afterthought either. "Decides what really goes
 * into the rollout" is a claim about declining as much as adopting, and a page
 * that only showed adoptions could not evidence half of it.
 */

const RING_TONE: Record<TechStatus, string> = {
  assess: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  trial: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  adopt: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  hold: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  retire: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const RING_MEANING: Record<TechStatus, string> = {
  assess: "On the radar. Nobody has run it here.",
  trial: "Being tried at a named plant, with evidence.",
  adopt: "Decided — the group default. Only these may enter a wave.",
  hold: "Deliberately not pursued now, with a reason.",
  retire: "Was standard, being removed.",
};

const STATE_TONE: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "in-progress": "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  scheduled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "not-started": "bg-muted text-muted-foreground",
  "on-hold": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function RolloutPage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Rollout</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const [techMd, rolloutMd, plantsMd] = await Promise.all([
    readRegistry("technology"),
    readRegistry("rollout"),
    readRegistry("plants"),
  ]);

  const tech = parseTechnology(techMd);
  const waves = parseRollout(rolloutMd);
  const plants = parsePlants(plantsMd);
  const plantMeta = new Map(plants.map((p) => [p.code, p]));
  const summary = summariseRollout(tech, waves);
  const violations = unadoptedWaves(waves, tech);
  const rings = byRing(tech);
  const progress = waveProgress(waves);
  const adoption = adoptionByPlant(waves);
  const declinedRows = declined(tech);
  const techById = new Map(tech.map((t) => [t.id, t]));

  if (tech.length === 0 && waves.length === 0) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Rollout</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Nothing evaluated or scheduled yet. The registers live in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/technology.md</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/rollout.md</code>, edited by hand in git.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Rollout</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">Technology decisions &amp; scaling waves</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          What was evaluated, what was decided, and what is being scaled where. The two are on one page
          because a verdict with no consequence is a blog post — and a wave may only scale a technology
          that reached <strong>adopt</strong>.
        </p>
      </header>

      {/* A broken invariant is a finding, not a warning — so it leads. */}
      {violations.length > 0 ? (
        <Card className="mb-4 border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
            {violations.length} wave row(s) scale a technology that was never adopted
          </h2>
          <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-300/80">
            Nothing scales before it is decided. Either move the technology to <code>adopt</code> in the
            register with a decision and a decider, or take the row out of the wave.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-rose-900 dark:text-rose-200">
            {violations.map((v, i) => (
              <li key={i}>
                <strong>{v.wave.wave} · {v.wave.plant}</strong> — {v.reason}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-4 p-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Evaluated" value={String(summary.technologies)} hint={`${summary.adopted} adopted`} />
          <Stat label="Declined" value={String(summary.declinedCount)} hint="hold or retire — decisions, not gaps" />
          <Stat label="Waves" value={String(summary.waves)} hint={`${summary.waveRows} plant rollouts`} />
          <Stat
            label="Live"
            value={summary.waveRows === 0 ? "—" : `${Math.round((summary.live / summary.waveRows) * 100)}%`}
            hint={`${summary.live} of ${summary.waveRows} rows`}
          />
          <Stat label="Blocked" value={String(summary.blocked)} hint="rows carrying a named blocker" />
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Left: the decision. */}
        <section>
          <h2 className="mb-1 text-sm font-semibold">The register</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Rings outermost first. A row in <code>adopt</code>, <code>hold</code> or <code>retire</code> must
            name a decision and a decider — a decision with nobody behind it is a rumour.
          </p>
          <div className="space-y-3">
            {rings.map((ring) => (
              <Card key={ring.status} className="p-3">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${RING_TONE[ring.status]}`}>
                    {ring.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{RING_MEANING[ring.status]}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{ring.items.length}</span>
                </div>
                {ring.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">None.</p>
                ) : (
                  <ul className="space-y-2">
                    {ring.items.map((t) => (
                      <li key={t.id} className="border-l-2 border-muted pl-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{t.technology}</span>
                          <Badge variant="secondary" className="font-normal">{t.layer}</Badge>
                          {t.needsAttention ? (
                            <span
                              className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              title={t.issues.join("; ")}
                            >
                              needs attention
                            </span>
                          ) : null}
                        </div>
                        {t.decision ? <p className="mt-0.5 text-xs text-muted-foreground">{t.decision}</p> : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {t.id}
                          {t.trialledAt ? ` · trialled at ${t.trialledAt}` : ""}
                          {t.evidence ? ` · evidence ${t.evidence}` : ""}
                          {t.decidedBy ? ` · decided ${t.decidedOn} by ${t.decidedBy}` : ""}
                          {t.supersedes ? ` · supersedes ${t.supersedes}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Right: the consequence. */}
        <section>
          <h2 className="mb-1 text-sm font-semibold">The waves</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Proven at a lead plant, then sequenced. Least-adopted plants first — the roadmap&apos;s debt,
            not its wins.
          </p>

          <Card className="mb-3 p-3">
            <ul className="space-y-2">
              {progress.map((p) => (
                <li key={p.wave}>
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{p.wave}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.live}/{p.rows} live
                      {p.inProgress > 0 ? ` · ${p.inProgress} in progress` : ""}
                      {p.onHold > 0 ? ` · ${p.onHold} on hold` : ""}
                      {p.blocked > 0 ? ` · ${p.blocked} blocked` : ""}
                    </span>
                    <span className="ml-auto text-xs font-semibold tabular-nums">{p.percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                    <div className="h-full bg-emerald-500 dark:bg-emerald-600" style={{ width: `${p.percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Plant</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 text-right font-medium">Adopted</th>
                  <th className="px-3 py-2 font-medium">Blockers</th>
                </tr>
              </thead>
              <tbody>
                {adoption.map((a) => (
                  <tr key={a.plant} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">{a.plant}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{plantMeta.get(a.plant)?.name ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{plantMeta.get(a.plant)?.region ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {a.live}/{a.rows}
                      <span className="ml-1.5 text-xs text-muted-foreground">{a.percent}%</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {a.blockers.length === 0 ? "—" : a.blockers.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      </div>

      {/* What was declined — half the responsibility, and the half a radar usually hides. */}
      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Declined, and why</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Deciding what goes into the rollout is also deciding what does not. These are the technologies
          that were looked at and turned down, or that were standard and are being removed.
        </p>
        {declinedRows.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Nothing declined yet — which usually means the register is young, not that everything worked.
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Technology</th>
                  <th className="px-3 py-2 font-medium">Ring</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Decided</th>
                </tr>
              </thead>
              <tbody>
                {declinedRows.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{t.technology}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${RING_TONE[t.status as TechStatus] ?? ""}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.decision}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {t.decidedOn} · {t.decidedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* The full plan, last. */}
      <section className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Every wave row</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Wave</th>
                <th className="px-3 py-2 font-medium">Capability</th>
                <th className="px-3 py-2 font-medium">Technology</th>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">State</th>
                <th className="px-3 py-2 font-medium">Gate</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {waves.map((w, i) => (
                <tr key={`${w.wave}-${w.plant}-${w.technology}-${i}`} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{w.wave}</td>
                  <td className="px-3 py-2">{w.capability}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {techById.get(w.technology)?.technology ?? w.technology}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{w.plant}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${STATE_TONE[w.state] ?? "bg-muted text-muted-foreground"}`}>
                      {w.state || "unreadable"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{w.gate}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{w.owner}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{w.blocker || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Source of record: <code className="rounded bg-muted px-1 py-0.5">registry/technology.md</code> and{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/rollout.md</code> — markdown in git. Blockers
        naming a system are the same systems the{" "}
        <Link href="/landscape" className="underline hover:text-foreground">system landscape</Link> lists in
        the UNS backlog. This page derives; it never writes.
      </p>
    </main>
  );
}
