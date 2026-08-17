import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import {
  parseAiPortfolio,
  evaluate,
  refusals,
  controlLoops,
  byStage,
  summariseAi,
  MODEL_STAGES,
  type ModelStage,
} from "@/lib/otx/ai-portfolio";
import { CONTROL_SURFACES, surfacePolicy, authorityPolicy, RUNG_TONE, toneFor, isAuthorityLevel } from "@/lib/org/autonomy";

export const dynamic = "force-dynamic";

/**
 * The AI framework for production operations — the portfolio on the ladder.
 *
 * This page exists to make one distinction visible that every AI roadmap hides:
 * a model that suggests something to an operator and a model that moves a zone
 * temperature are the same "AI use case" on a slide and are not the same risk.
 * The ladder says how far the agent may go; the control surface says how far the
 * consequence travels.
 *
 * So the page leads with the REFUSALS, in the portal's refusal voice. A row that
 * claims to move a machine without saying what stops it does not get a warning
 * triangle — it is told no, and told why. `canActOn` in lib/org/autonomy.ts is
 * the one that says it; this page only renders what it decided.
 */

const STAGE_LABEL: Record<ModelStage, string> = {
  concept: "Concept",
  data: "Data",
  trained: "Trained",
  shadow: "Shadow",
  assisted: "Assisted",
  live: "Live",
  retired: "Retired",
};

const STAGE_HINT: Record<ModelStage, string> = {
  concept: "an idea with an owner",
  data: "the data exists and is reachable",
  trained: "a model exists and was measured",
  shadow: "runs beside the process, output discarded",
  assisted: "a human uses the output",
  live: "in operation",
  retired: "switched off",
};

function Stat({ label, value, hint, alarm }: { label: string; value: string; hint?: string; alarm?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${alarm ? "text-rose-700 dark:text-rose-400" : ""}`}>{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function AiFrameworkPage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">AI framework</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const rows = parseAiPortfolio(await readRegistry("ai-portfolio"));
  const verdicts = evaluate(rows);
  const refused = refusals(verdicts);
  const loops = controlLoops(verdicts);
  const stages = byStage(rows);
  const summary = summariseAi(rows);

  if (rows.length === 0) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">AI framework</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          No production models recorded yet. The portfolio lives in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/ai-portfolio.md</code>, edited by hand in git.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">AI framework</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">AI framework for production operations</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every model that touches the plants, from concept to go-live — on the autonomy ladder, and on a
          second axis the ladder does not answer: <strong>where the consequence lands</strong>. An agent
          that files a ticket and one that moves a zone temperature sit on the same rung and are not the
          same risk.
        </p>
      </header>

      {/* The refusal leads. It is the page's reason to exist. */}
      {refused.length > 0 ? (
        <Card className="mb-4 border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <h2 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
            {refused.length} model(s) may not act as declared
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-rose-800/80 dark:text-rose-300/80">
            A complete agent brief earns autonomy. It does not by itself earn a machine.
          </p>
          <ul className="mt-3 space-y-2.5">
            {refused.map((v) => (
              <li key={v.row.id} className="border-l-2 border-rose-400 pl-3 dark:border-rose-700">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-rose-900 dark:text-rose-200">{v.row.useCase}</span>
                  <span className="text-xs text-rose-800/70 dark:text-rose-300/70">
                    {v.row.id} · {v.row.plant}
                  </span>
                  {v.kind ? (
                    <Badge variant="secondary" className="font-normal">{v.kind}</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-rose-900/90 dark:text-rose-200/90">{v.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-4 p-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Models" value={String(summary.models)} hint={`${summary.live} live`} />
          <Stat label="Touch a machine" value={String(summary.physical)} hint="control surface = setpoint" />
          <Stat
            label="Control loops"
            value={String(summary.actingOnMachines)}
            hint="acting rung on a setpoint"
          />
          <Stat label="Refused" value={String(summary.refused)} hint="may not act as declared" alarm={summary.refused > 0} />
          <Stat label="Needs attention" value={String(summary.needsAttention)} hint="rows not fully readable" />
        </dl>
      </Card>

      {/* The model's own life — concept to go-live. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Concept → go-live</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          The model&apos;s own lifecycle. This is <em>not</em> a second demand lifecycle — the eight stages
          and seven gates are untouched, and each row points at the demand it came from.
        </p>
        <Card className="p-3">
          <ol className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <li key={s.stage} className="flex-1 min-w-[7.5rem] rounded border px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold">{STAGE_LABEL[s.stage]}</span>
                  <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{STAGE_HINT[s.stage]}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* The two axes, side by side — this is the conceptual payload. */}
      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 text-sm font-semibold">How far the agent may go</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The five-rung ladder. Unchanged — autonomy is earned per lane, only after that lane&apos;s
            context is written.
          </p>
          <Card className="p-3">
            <ol className="space-y-2">
              {["read-only", "draft", "recommend", "execute-with-approval", "execute-autonomously"].map((lvl) => {
                if (!isAuthorityLevel(lvl)) return null;
                const p = authorityPolicy(lvl);
                return (
                  <li key={lvl} className="flex gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${RUNG_TONE[toneFor(lvl)].dot}`} />
                    <div>
                      <span className="text-sm font-medium">{p.label}</span>
                      <p className="text-xs text-muted-foreground">{p.summary}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold">How far the consequence travels</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The second axis. Deliberately not a sixth rung — a closed loop is not &ldquo;more autonomous
            than autonomous&rdquo;, it is the same autonomy pointed at something physical.
          </p>
          <Card className="p-3">
            <ol className="space-y-2">
              {CONTROL_SURFACES.map((s) => {
                const p = surfacePolicy(s);
                return (
                  <li key={s} className="flex gap-2.5">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${p.physical ? "bg-rose-500" : "bg-slate-400"}`}
                    />
                    <div>
                      <span className="text-sm font-medium">{p.label}</span>
                      {p.physical ? (
                        <span className="ml-1.5 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          physical
                        </span>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{p.lands}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
              Crossing the two names the thing: <strong>recommend × setpoint</strong> is an operator
              assistance system, <strong>execute-with-approval × setpoint</strong> is a semi-autonomous
              control loop, <strong>execute-autonomously × setpoint</strong> is an autonomous one.
            </p>
          </Card>
        </div>
      </section>

      {/* Control loops get their own table — the safety case is the content. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Control loops — the models that touch a machine</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Most authoritative first. The three safety columns are not paperwork: each answers a question
          the plant asks on the first bad shift, and &ldquo;we&apos;ll work it out then&rdquo; is not an
          answer at 3am.
        </p>
        {loops.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No model currently acts on a machine.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Use case</th>
                  <th className="px-3 py-2 font-medium">Plant</th>
                  <th className="px-3 py-2 font-medium">Is a</th>
                  <th className="px-3 py-2 font-medium">Envelope</th>
                  <th className="px-3 py-2 font-medium">Fallback</th>
                  <th className="px-3 py-2 font-medium">Abort</th>
                  <th className="px-3 py-2 font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {loops.map((v) => (
                  <tr key={v.row.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2">
                      <span className="font-medium">{v.row.useCase}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{v.row.id}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{v.row.plant}</td>
                    <td className="px-3 py-2 text-xs">{v.kind ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{v.row.envelope || <Missing />}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{v.row.fallback || <Missing />}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{v.row.abortCondition || <Missing />}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {v.ok ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          may act
                        </span>
                      ) : (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          refused
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* The whole portfolio, last. */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">The portfolio</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Use case</th>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Authority</th>
                <th className="px-3 py-2 font-medium">Surface</th>
                <th className="px-3 py-2 font-medium">Human owner</th>
                <th className="px-3 py-2 font-medium">Demand</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {r.useCase}
                    {r.needsAttention ? (
                      <span
                        className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        title={r.issues.join("; ")}
                      >
                        needs attention
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.plant}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.modelClass || "?"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="font-normal">
                      {r.stage ? STAGE_LABEL[r.stage] : "?"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {isAuthorityLevel(r.authority) ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${RUNG_TONE[toneFor(r.authority)].badge}`}>
                        {authorityPolicy(r.authority).label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">?</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        r.surface === "setpoint"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.surface || "?"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.humanOwner}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.demand || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Source of record: <code className="rounded bg-muted px-1 py-0.5">registry/ai-portfolio.md</code> — markdown
        in git. The verdicts are computed by <code className="rounded bg-muted px-1 py-0.5">canActOn</code> in{" "}
        <code className="rounded bg-muted px-1 py-0.5">lib/org/autonomy.ts</code>, the same guardrail the{" "}
        <Link href="/org" className="underline hover:text-foreground">Department OS</Link> uses for its lanes —
        not a copy of it living here.
      </p>
    </main>
  );
}

function Missing() {
  return <span className="text-rose-600 dark:text-rose-400">not written</span>;
}
