import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import {
  parseTools,
  redundancies,
  unowned,
  lifecycleDebt,
  islands,
  byCapability,
  byDomain,
  summariseTools,
  toolIntegrationRank,
  MAX_TOOL_INTEGRATION_RANK,
  LIFECYCLE_MEANING,
  LIFECYCLES,
  TOOL_INTEGRATIONS,
  type Lifecycle,
  type Criticality,
  type ToolRow,
} from "@/lib/otx/toolscape";

export const dynamic = "force-dynamic";

/**
 * The tool landscape — every application the company runs.
 *
 * `/landscape` answers "can we read this machine?" for the plants. This answers
 * the question above it: what does the company run, who owns it, and where is it
 * going. The plant systems appear here too, as one slice of the portfolio.
 *
 * The page leads with FINDINGS, not the inventory, because the inventory changes
 * nothing — everyone can list their applications. What changes something is the
 * overlap, the unowned tool, the decision nobody executed and the island. The
 * table is at the bottom, where reference material belongs.
 */

const LIFECYCLE_TONE: Record<Lifecycle, string> = {
  evaluate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  invest: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  tolerate: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  migrate: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  eliminate: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const CRIT_TONE: Record<Criticality, string> = {
  critical: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  important: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  standard: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-muted text-muted-foreground",
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

function ToolChip({ t }: { t: ToolRow }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded border px-1.5 py-0.5">
      <span className="text-xs font-medium">{t.tool}</span>
      {t.lifecycle ? (
        <span className={`rounded px-1 text-[10px] font-medium ${LIFECYCLE_TONE[t.lifecycle]}`}>{t.lifecycle}</span>
      ) : null}
      {t.users !== null ? <span className="text-[10px] tabular-nums text-muted-foreground">{t.users}u</span> : null}
    </span>
  );
}

export default async function ToolLandscapePage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Tool landscape</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const tools = parseTools(await readRegistry("tools"));
  const summary = summariseTools(tools);
  const overlaps = redundancies(tools);
  const shadow = unowned(tools);
  const debt = lifecycleDebt(tools);
  const isolated = islands(tools);
  const caps = byCapability(tools);
  const domains = byDomain(tools);

  if (tools.length === 0) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Tool landscape</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          No applications recorded yet. The register lives in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/tools.md</code> — one row per tool, edited
          by hand in git.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Tool landscape</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">Tool landscape</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every application the company runs, across all functions — what serves which capability, who owns it, and
          where it is going. The plant systems are one slice of this;{" "}
          <Link href="/landscape" className="underline hover:text-foreground">the OT landscape</Link> is the deep dive
          beneath it.
        </p>
      </header>

      <Card className="mb-5 p-4">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Tools" value={String(summary.tools)} hint={`${summary.active} in service`} />
          <Stat label="Capabilities" value={String(summary.capabilities)} hint="distinct jobs served" />
          <Stat
            label="Overlaps"
            value={String(summary.redundant)}
            hint={`~${summary.redundantUsers.toLocaleString("en")} users affected`}
            alarm={summary.redundant > 0}
          />
          <Stat label="Unowned" value={String(summary.unowned)} hint="shadow IT" alarm={summary.unowned > 0} />
          <Stat label="Lifecycle debt" value={String(summary.debt)} hint="decided to go, still load-bearing" alarm={summary.debt > 0} />
          <Stat
            label="Integration"
            value={summary.integration === null ? "—" : `${summary.integration}%`}
            hint={`${summary.islands} isolated & critical`}
          />
        </dl>
      </Card>

      {/* ── Finding 1: overlap ─────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Overlaps — one capability, more than one tool</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          The consolidation case, ordered by the people actually affected. A tool under{" "}
          <strong>evaluate</strong> is excluded — that is the process working. A tool under{" "}
          <strong>migrate</strong> is <em>included</em>, because a replacement that never finished is exactly the
          overlap worth seeing.
        </p>
        {overlaps.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No capability is served by more than one tool.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Capability</th>
                  <th className="px-3 py-2 text-right font-medium">Users</th>
                  <th className="px-3 py-2 font-medium">Tools</th>
                  <th className="px-3 py-2 font-medium">Consolidate onto</th>
                </tr>
              </thead>
              <tbody>
                {overlaps.map((r) => (
                  <tr key={r.capability} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{r.capability}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.users.toLocaleString("en")}</td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1.5">
                        {r.tools.map((t) => <ToolChip key={t.id} t={t} />)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.target ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">{r.target.tool}</span>
                      ) : r.undecided ? (
                        <span className="text-rose-700 dark:text-rose-400">
                          nothing marked <code>invest</code> — nobody has picked a winner
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          two tools both claim <code>invest</code>
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

      {/* ── Findings 2 & 3 ─────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-1 text-sm font-semibold">Unowned — shadow IT</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            In service with no named owner. Owners here are <strong>teams</strong>, never people — this is a gap in
            accountability, never a finding about a person (constraint&nbsp;#6).
          </p>
          {shadow.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Every tool in service has both owners named.</Card>
          ) : (
            <Card className="p-3">
              <ul className="space-y-2">
                {shadow.map((u) => (
                  <li key={u.tool.id} className="border-l-2 border-rose-400 pl-2.5 dark:border-rose-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{u.tool.tool}</span>
                      {u.tool.criticality ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CRIT_TONE[u.tool.criticality]}`}>
                          {u.tool.criticality}
                        </span>
                      ) : null}
                      {u.tool.users !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">~{u.tool.users} users</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No {u.missing.join(" and no ")} owner. {u.tool.notes}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold">Islands — no integration under real load</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The enterprise counterpart of the OT landscape&apos;s K2.2 backlog: data can only leave by hand, so
            everything downstream is a person retyping.
          </p>
          {isolated.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Nothing critical is running isolated.</Card>
          ) : (
            <Card className="p-3">
              <ul className="space-y-2">
                {isolated.map((t) => (
                  <li key={t.id} className="border-l-2 border-amber-400 pl-2.5 dark:border-amber-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{t.tool}</span>
                      {t.criticality ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CRIT_TONE[t.criticality]}`}>
                          {t.criticality}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{t.capability}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.notes || "Isolated — no automated path in or out."}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      {/* ── Finding 4: lifecycle debt ──────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Lifecycle debt — decided to go, still load-bearing</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          The gap between a decision and reality. An <code>eliminate</code> row with two users is housekeeping; one
          that is critical, or that hundreds depend on, is a decision nobody executed — usually because the successor
          never covered the case keeping it alive.
        </p>
        {debt.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nothing marked for replacement is still carrying load.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Tool</th>
                  <th className="px-3 py-2 font-medium">Capability</th>
                  <th className="px-3 py-2 font-medium">Lifecycle</th>
                  <th className="px-3 py-2 font-medium">Why it is debt</th>
                </tr>
              </thead>
              <tbody>
                {debt.map((d) => (
                  <tr key={d.tool.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{d.tool.tool}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.tool.capability}</td>
                    <td className="px-3 py-2">
                      {d.tool.lifecycle ? (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LIFECYCLE_TONE[d.tool.lifecycle]}`}>
                          {d.tool.lifecycle}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── The capability spine ───────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">The capability spine</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Capability is the controlled vocabulary that makes every finding above possible — a capability invented per
          tool makes each tool unique, every overlap invisible and the register decorative. Integration is the mean
          across the capability&apos;s tools in service ({TOOL_INTEGRATIONS.join(" → ")}).
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Capability</th>
                <th className="px-3 py-2 text-right font-medium">Tools</th>
                <th className="px-3 py-2 text-right font-medium">Users</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 text-right font-medium">Integration</th>
                <th className="px-3 py-2 font-medium">Strategic tool</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c) => (
                <tr key={c.capability} className={`border-b last:border-0 ${c.redundant ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                  <td className="px-3 py-2 font-medium">
                    {c.capability}
                    {c.redundant ? (
                      <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        overlap
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.tools}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{c.users.toLocaleString("en")}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.scopes.join(", ") || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {c.integration === null ? "—" : `${Math.round((c.integration / MAX_TOOL_INTEGRATION_RANK) * 100)}%`}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.target ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── By domain ──────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">By business domain</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Reusing the taxonomy in <code className="rounded bg-muted px-1 py-0.5">registry/domains.md</code>, so a
          demand and a tool describe the business the same way. Most-overlapping first.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 text-right font-medium">Tools</th>
                <th className="px-3 py-2 text-right font-medium">Capabilities</th>
                <th className="px-3 py-2 text-right font-medium">Overlaps</th>
                <th className="px-3 py-2 text-right font-medium">Users</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.domain} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{d.domain}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.tools}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{d.capabilities}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${d.redundancies > 0 ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {d.redundancies}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{d.users.toLocaleString("en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── The register, last ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold">The register</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {summary.tools} tools.{" "}
          {summary.needsAttention > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              {summary.needsAttention} row(s) could not be fully read — kept and marked, never dropped.
            </span>
          ) : null}{" "}
          Lifecycle: {LIFECYCLES.map((l) => `${l} — ${LIFECYCLE_MEANING[l].toLowerCase()}`).join(" · ")}
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Tool</th>
                <th className="px-3 py-2 font-medium">Capability</th>
                <th className="px-3 py-2 font-medium">Scope</th>
                <th className="px-3 py-2 font-medium">Lifecycle</th>
                <th className="px-3 py-2 font-medium">Integration</th>
                <th className="px-3 py-2 font-medium">Business owner</th>
                <th className="px-3 py-2 font-medium">IT owner</th>
                <th className="px-3 py-2 text-right font-medium">Users</th>
                <th className="px-3 py-2 font-medium">Crit.</th>
              </tr>
            </thead>
            <tbody>
              {[...tools]
                .sort((a, b) => (b.users ?? 0) - (a.users ?? 0))
                .map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium">{t.tool}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{t.vendor}</span>
                      {t.needsAttention ? (
                        <span
                          className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          title={t.issues.join("; ")}
                        >
                          needs attention
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{t.capability}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.scope || "?"}</td>
                    <td className="px-3 py-2">
                      {t.lifecycle ? (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${LIFECYCLE_TONE[t.lifecycle]}`}>
                          {t.lifecycle}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">?</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                          toolIntegrationRank(t.integration) >= 3
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : toolIntegrationRank(t.integration) >= 2
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {t.integration || "?"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.businessOwner || <span className="text-rose-600 dark:text-rose-400">none</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.itOwner || <span className="text-rose-600 dark:text-rose-400">none</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{t.users ?? "—"}</td>
                    <td className="px-3 py-2">
                      {t.criticality ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CRIT_TONE[t.criticality]}`}>
                          {t.criticality}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Source of record: <code className="rounded bg-muted px-1 py-0.5">registry/tools.md</code> — markdown in git,
        edited by hand. An overlap here is a candidate for a{" "}
        <Link href="/rollout" className="underline hover:text-foreground">rollout decision</Link>; a plant system here
        is detailed in the{" "}
        <Link href="/landscape" className="underline hover:text-foreground">OT landscape</Link>. This page derives; it
        never writes.
      </p>
    </main>
  );
}
