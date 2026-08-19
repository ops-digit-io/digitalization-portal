import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import { listManualTools } from "@/lib/otx/tool-store";
import { listDemandDocs } from "@/lib/demands-store";
import {
  parseLandscape,
  parsePlants,
  parseUns,
  maturityByPlant,
  blockers,
  summarise,
  unsConventionProgress,
  ISA_LEVELS,
  INTEGRATION_STATES,
  MAX_INTEGRATION_RANK,
  type PlantRow,
} from "@/lib/otx/landscape";
import {
  parseTools,
  redundancies,
  unowned,
  lifecycleDebt,
  byCapability,
  toolIntegrationRank,
  LIFECYCLES,
  LIFECYCLE_MEANING,
  TOOL_INTEGRATIONS,
} from "@/lib/otx/toolscape";
import {
  consolidate,
  budget,
  summariseConsolidated,
  registerGaps,
  useCaseExposure,
  topRisks,
  integrationHealth,
  ORIGIN_MEANING,
  type ToolEntry,
} from "@/lib/otx/consolidate";
import { AddTool } from "@/components/landscape/add-tool";
import {
  Chip,
  Stat,
  eur,
  CRIT_TONE,
  INTEGRATION_TONE,
  LIFECYCLE_TONE,
  ORIGIN_LABEL,
  ORIGIN_TONE,
  RISK_TONE,
} from "@/components/landscape/ui";

export const dynamic = "force-dynamic";

/**
 * The landscape — ONE register of everything that behaves like a tool.
 *
 * This page used to be two: an enterprise application register (`/tool-landscape`)
 * and a plant system landscape (`/landscape`), with a third answer — the tool a
 * use case names — living nowhere at all. That split is exactly how a tool ends up
 * load-bearing in three places and governed in none, so they are consolidated
 * here: the register, the plant systems beneath it, the tools recorded by hand in
 * the portal, and the tools use cases declare, in one list.
 *
 * The consolidation is what makes the two questions that matter answerable at all,
 * and they lead the page, because **every tool is a risk and a cost**:
 *
 *   RISK    derived from the register's own facts — unowned, isolated, decided
 *           against and still running, off-register, unreadable in the plants —
 *           never a stored rating that can be quietly downgraded.
 *   BUDGET  what the portfolio costs, and what each finding costs. An overlap is
 *           an argument; an overlap with €4.6m against it is a decision.
 *
 * Everything below those two is the evidence: the gaps, the use cases standing on
 * them, the capability spine, the OT depth, and the inventory last, where
 * reference material belongs. The page derives; only the "Add a tool" form writes,
 * and it writes markdown to git like every other artifact here.
 */

function ToolChip({ t }: { t: ToolEntry }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded border px-1.5 py-0.5">
      <span className="text-xs font-medium">{t.tool}</span>
      {t.lifecycle ? <Chip tone={LIFECYCLE_TONE[t.lifecycle]}>{t.lifecycle}</Chip> : null}
      {t.annualCost !== null ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{eur(t.annualCost)}/yr</span>
      ) : null}
    </span>
  );
}

/** A level cell in the plant × ISA-95 matrix: mean maturity, shaded, with the blocked count. */
function LevelCell({ rank, blocked }: { rank: number | null; blocked: number }) {
  if (rank === null) return <td className="px-2 py-2 text-center text-xs text-muted-foreground/40">—</td>;
  const pct = Math.round((rank / MAX_INTEGRATION_RANK) * 100);
  const band = pct >= 75 ? INTEGRATION_TONE["uns-modelled"] : pct >= 50 ? INTEGRATION_TONE["point-to-point"] : INTEGRATION_TONE.none;
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-flex min-w-[3rem] items-center justify-center gap-1 rounded px-1.5 py-1 text-xs font-medium tabular-nums ${band}`}>
        {pct}%
        {blocked > 0 ? <span title={`${blocked} system(s) with no readable interface`}>·{blocked}</span> : null}
      </span>
    </td>
  );
}

export default async function LandscapePage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Landscape</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  // Four sources, read concurrently, each degrading on its own: a funnel that
  // cannot be read costs the use-case links, not the register.
  const [toolsMd, landscapeMd, plantsMd, unsMd, manual, demands] = await Promise.all([
    readRegistry("tools"),
    readRegistry("landscape"),
    readRegistry("plants"),
    readRegistry("uns"),
    listManualTools().catch(() => []),
    listDemandDocs().catch(() => []),
  ]);

  const register = parseTools(toolsMd);
  const systems = parseLandscape(landscapeMd);
  const plants: PlantRow[] = parsePlants(plantsMd);
  const uns = parseUns(unsMd);

  const entries = consolidate({ register, manual, systems, demands });
  const summary = summariseConsolidated(entries);
  const money = budget(entries);
  const risks = topRisks(entries, 12);
  const gaps = registerGaps(entries);
  const exposure = useCaseExposure(entries);
  const health = integrationHealth(entries);

  // The enterprise findings, computed over the CONSOLIDATED list — an off-register
  // plant system now takes part in the overlap analysis like anything else.
  const overlaps = redundancies(entries);
  const shadow = unowned(entries);
  const debt = lifecycleDebt(entries);
  const caps = byCapability(entries);

  // The OT half.
  const ot = summarise(systems);
  const perPlant = maturityByPlant(systems);
  const backlog = blockers(systems);
  const convention = unsConventionProgress(uns);
  const plantMeta = new Map(plants.map((p) => [p.code, p]));

  const capabilityNames = [...new Set(entries.map((e) => e.capability).filter((c) => c !== ""))].sort();
  const domainNames = [...new Set(entries.map((e) => e.domain).filter((d) => d !== ""))].sort();
  const canAdd = can(session, "draft");

  if (entries.length === 0) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Landscape</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Nothing recorded yet. The register lives in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/tools.md</code> (applications) and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/landscape.md</code> (plant systems) — one
          row each, edited by hand in git. You can also record a tool here and it lands in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">landscape/tools.md</code>.
        </p>
        {canAdd ? (
          <div className="mt-4">
            <AddTool capabilities={[]} domains={[]} />
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Landscape</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Tool &amp; system landscape</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            One register of everything that behaves like a tool: the applications the company runs, the systems in the
            plants beneath them, the tools recorded here by hand, and the tools use cases declare. Every one of them
            is a risk and a cost, so both are derived on every row — from the register&apos;s own facts, never stored,
            so neither can drift from what a human wrote down.
          </p>
        </div>
        {canAdd ? <AddTool capabilities={capabilityNames} domains={domainNames} /> : null}
      </header>

      <Card className="mb-5 p-4">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Tools"
            value={String(summary.entries)}
            hint={`${summary.registered} registered · ${summary.offRegister + summary.fromUseCases + summary.manual} not`}
          />
          <Stat
            label="Annual cost"
            value={eur(money.total)}
            hint={money.coverage === null ? "nothing costed" : `${money.coverage}% of tools costed`}
          />
          <Stat
            label="At risk"
            value={String(summary.atRisk)}
            hint={`${eur(money.atRisk)}/yr behind them`}
            alarm={summary.atRisk > 0}
          />
          <Stat
            label="Off the register"
            value={String(summary.offRegister + summary.fromUseCases)}
            hint="in the plants or in a use case, in no register"
            alarm={summary.offRegister + summary.fromUseCases > 0}
          />
          <Stat label="Used by cases" value={String(summary.inUse)} hint={`${exposure.length} use case(s) depend on a tool`} />
          <Stat
            label="Integration"
            value={health === null ? "—" : `${health}%`}
            hint={`${ot.blocked} plant systems unreadable`}
          />
        </dl>
      </Card>

      {/* ── 1. Risk ─────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Risk register — why each tool is exposed</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Derived, never rated: the score is the sum of the findings this register already makes — no owner, isolated,
          decided against and still running, off the register, unreadable in the plants, unbudgeted — each weighted by
          how much stops when the tool does. Nothing can be quietly downgraded, because there is nothing to downgrade;
          the way to lower a score is to fix the fact underneath it. The twelve worst are here; every row carries
          its score in the register at the bottom.
        </p>
        {risks.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nothing in the register scores above zero.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Tool</th>
                  <th className="px-3 py-2 text-right font-medium">Risk</th>
                  <th className="px-3 py-2 text-right font-medium">Cost/yr</th>
                  <th className="px-3 py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((t) => (
                  <tr key={`${t.id}-${t.tool}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-medium">{t.tool}</span>
                        <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                        {t.criticality ? <Chip tone={CRIT_TONE[t.criticality]}>{t.criticality}</Chip> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.capability || "no capability"}
                        {t.plants.length > 0 ? ` · ${t.plants.join(", ")}` : ""}
                        {t.useCases.length > 0 ? ` · ${t.useCases.length} use case(s)` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Chip tone={RISK_TONE[t.risk.band]}>{t.risk.band}</Chip>
                      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{t.risk.score}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t.annualCost === null ? <span className="text-muted-foreground">—</span> : eur(t.annualCost)}
                    </td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {t.risk.factors.map((f) => (
                          <li key={f.key}>
                            <span className="tabular-nums text-foreground/70">+{f.weight}</span> {f.label}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── 2. Budget ───────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Budget — what the findings cost</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Money already leaving the company, sorted by how much. None of it is a projected saving: an overlap does not
          become a saving until somebody switches a tool off, and this is a register, not an argument. A tool with no
          figure is not free — it is uncosted, and there are {money.unbudgeted} of those.
        </p>
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card className="p-4">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Stat label="Annual run cost" value={eur(money.total)} hint="everything with a figure on it" />
              <Stat
                label="Behind at-risk tools"
                value={eur(money.atRisk)}
                hint="carried by high or critical rows"
                alarm={money.atRisk > 0}
              />
              <Stat
                label="Uncosted"
                value={String(money.unbudgeted)}
                hint="tools in service nobody has priced"
                alarm={money.unbudgeted > 0}
              />
            </dl>
          </Card>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Spend</th>
                  <th className="px-3 py-2 text-right font-medium">€/yr</th>
                  <th className="px-3 py-2 text-right font-medium">Tools</th>
                  <th className="px-3 py-2 font-medium">Why it is on this list</th>
                </tr>
              </thead>
              <tbody>
                {money.lines.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={4}>
                      No costed tool falls into any finding.
                    </td>
                  </tr>
                ) : (
                  money.lines.map((l) => (
                    <tr key={l.label} className="border-b last:border-0 align-top">
                      <td className="px-3 py-2 font-medium">{l.label}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{eur(l.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{l.tools}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      {/* ── 3. The consolidation's own finding: what is on no register ──── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Off the register — found in the plants or in a use case</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          This list only exists because the sources were consolidated: a system running in a plant, or a tool a use
          case is built on, that no application register has heard of. Each row is one of two decisions —{" "}
          <strong>register it</strong> (name an owner, a lifecycle, a cost) or <strong>retire it</strong>. Control-level
          equipment is expected here and is weighted down accordingly; an L3 system or a use-case dependency is not.
        </p>
        {gaps.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Everything found is on a register.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Tool / system</th>
                  <th className="px-3 py-2 font-medium">Found in</th>
                  <th className="px-3 py-2 font-medium">Where</th>
                  <th className="px-3 py-2 text-right font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Owner on record</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((t) => (
                  <tr key={`${t.origin}-${t.tool}`} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{t.tool}</td>
                    <td className="px-3 py-2">
                      <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.plants.length > 0 ? t.plants.join(", ") : t.useCases.map((u) => u.id).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Chip tone={RISK_TONE[t.risk.band]}>{t.risk.score}</Chip>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.itOwner || t.businessOwner || <span className="text-rose-600 dark:text-rose-400">nobody</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── 4. What the demand funnel is standing on ────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Use cases and the tools they stand on</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          A demand declares its tools in <code className="rounded bg-muted px-1 py-0.5">## State</code> (
          <code className="rounded bg-muted px-1 py-0.5">- **Tools:** …</code>, captured at intake); a name that only
          appears in its prose is shown as <em>mentioned</em> and is a hint, never a claim. This is where a business
          case meets its dependency: building on a tool marked <code>eliminate</code> is a cost the case has not
          counted yet.
        </p>
        {exposure.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            No demand names a tool yet. The intake asks for them — &ldquo;Tools &amp; systems&rdquo; — and every name
            given there lands on this register.
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Use case</th>
                  <th className="px-3 py-2 font-medium">Worst dependency</th>
                  <th className="px-3 py-2 font-medium">Tools it stands on</th>
                </tr>
              </thead>
              <tbody>
                {exposure.map((x) => (
                  <tr key={x.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link href={`/uc/${x.id}`} className="font-medium hover:underline">{x.id}</Link>
                      <p className="text-xs text-muted-foreground">{x.title}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Chip tone={RISK_TONE[x.worst]}>{x.worst}</Chip>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1.5">
                        {x.tools.map((t) => (
                          <span key={t.tool} className="inline-flex items-baseline gap-1 rounded border px-1.5 py-0.5">
                            <span className="text-xs">{t.tool}</span>
                            <Chip tone={RISK_TONE[t.risk]}>{t.risk}</Chip>
                            {t.kind === "mentioned" ? (
                              <span className="text-[10px] text-muted-foreground">mentioned</span>
                            ) : null}
                            {!t.registered ? (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400">unregistered</span>
                            ) : null}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── 5. Overlaps ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Overlaps — one capability, more than one tool</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          The consolidation case, ordered by the people affected and priced by what the group is actually paying. A
          tool under <strong>evaluate</strong> is excluded — that is the process working. A tool under{" "}
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
                  <th className="px-3 py-2 text-right font-medium">€/yr</th>
                  <th className="px-3 py-2 font-medium">Tools</th>
                  <th className="px-3 py-2 font-medium">Consolidate onto</th>
                </tr>
              </thead>
              <tbody>
                {overlaps.map((r) => {
                  const cost = r.tools.reduce((a, t) => a + (t.annualCost ?? 0), 0);
                  return (
                    <tr key={r.capability} className="border-b last:border-0 align-top">
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{r.capability}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.users.toLocaleString("en")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{cost === 0 ? "—" : eur(cost)}</td>
                      <td className="px-3 py-2">
                        <span className="flex flex-wrap gap-1.5">
                          {r.tools.map((t) => <ToolChip key={`${t.id}-${t.tool}`} t={t as ToolEntry} />)}
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
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* ── 6. Shadow IT & lifecycle debt ───────────────────────────────── */}
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
                  <li key={`${u.tool.id}-${u.tool.tool}`} className="border-l-2 border-rose-400 pl-2.5 dark:border-rose-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{u.tool.tool}</span>
                      {u.tool.criticality ? <Chip tone={CRIT_TONE[u.tool.criticality]}>{u.tool.criticality}</Chip> : null}
                      {u.tool.annualCost !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">{eur(u.tool.annualCost)}/yr</span>
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
          <h2 className="mb-1 text-sm font-semibold">Lifecycle debt — decided to go, still load-bearing</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The gap between a decision and reality — usually still there because the successor never covered the case
            keeping it alive. The cost column is what that gap is billed at each year.
          </p>
          {debt.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Nothing marked for replacement is still carrying load.</Card>
          ) : (
            <Card className="p-3">
              <ul className="space-y-2">
                {debt.map((d) => (
                  <li key={`${d.tool.id}-${d.tool.tool}`} className="border-l-2 border-amber-400 pl-2.5 dark:border-amber-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{d.tool.tool}</span>
                      {d.tool.lifecycle ? <Chip tone={LIFECYCLE_TONE[d.tool.lifecycle]}>{d.tool.lifecycle}</Chip> : null}
                      {d.tool.annualCost !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">{eur(d.tool.annualCost)}/yr</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      {/* ── 7. The capability spine ─────────────────────────────────────── */}
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
                <th className="px-3 py-2 text-right font-medium">€/yr</th>
                <th className="px-3 py-2 font-medium">Scopes</th>
                <th className="px-3 py-2 font-medium">Strategic tool</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c) => {
                const cost = entries.filter((e) => e.capability === c.capability).reduce((a, e) => a + (e.annualCost ?? 0), 0);
                return (
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
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{cost === 0 ? "—" : eur(cost)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.scopes.join(", ") || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{c.target ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── 8. The OT depth ─────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">In the plants — ISA-95 and the UNS backlog</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          The depth beneath the register: what runs at each site, at which ISA-95 level, and how far its data has
          travelled towards the namespace. These are the funnel&apos;s{" "}
          <strong>K2.2 Interface-Zugänglichkeit</strong> failures as data — an engagement touching one of them cannot
          pass the diagnostics gate, and per branch <strong>Z1b</strong> an inaccessible interface &ldquo;zahlt per
          Compounding auf jeden weiteren Prozess am selben System ein&rdquo;. Higher levels first: a blocked L3
          historian denies data to the whole plant, a blocked L1 controller to one line.
        </p>

        <Card className="mb-4 p-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Plants" value={String(ot.plants)} hint={`${ot.systems} systems inventoried`} />
            <Stat label="Mean maturity" value={ot.meanMaturity === null ? "—" : `${ot.meanMaturity}%`} hint="across plants with systems" />
            <Stat label="Unreadable" value={String(ot.blocked)} hint="systems blocking K2.2" alarm={ot.blocked > 0} />
            <Stat label="On the namespace" value={`${ot.withNamespace}/${ot.plants}`} hint="plants with a modelled topic tree" />
            <Stat
              label="Convention"
              value={convention.percent === null ? "—" : `${convention.percent}%`}
              hint={`${convention.published} published · ${convention.agreed} agreed · ${convention.proposed} proposed`}
            />
          </dl>
        </Card>

        {backlog.length > 0 ? (
          <Card className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Plant</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">System</th>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Barrier</th>
                </tr>
              </thead>
              <tbody>
                {backlog.map((b, i) => (
                  <tr key={`${b.plant}-${b.system}-${i}`} className="border-b last:border-0">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{b.rank}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">{b.plant}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{plantMeta.get(b.plant)?.region ?? ""}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="font-normal">{b.level || "—"}</Badge>
                    </td>
                    <td className="px-3 py-2">{b.system || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.vendor}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{b.barrier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="mb-4 p-4 text-sm text-muted-foreground">
            Every inventoried system has a readable interface. Nothing is blocking K2.2.
          </Card>
        )}

        <p className="mb-2 text-xs text-muted-foreground">
          Maturity by plant and level — the mean integration state ({INTEGRATION_STATES.join(" → ")}); the suffix after
          the dot is how many systems there have no readable interface. Most-blocked first.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium">Role</th>
                {ISA_LEVELS.slice().reverse().map((l) => (
                  <th key={l} className="px-2 py-2 text-center font-medium">{l}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Overall</th>
              </tr>
            </thead>
            <tbody>
              {perPlant.map((p) => {
                const meta = plantMeta.get(p.plant);
                const byLevel = new Map(p.byLevel.map((l) => [l.level, l]));
                return (
                  <tr key={p.plant} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">{p.plant}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{meta?.name ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{meta?.region ?? "—"}</td>
                    <td className="px-3 py-2">
                      {meta?.siteRole ? (
                        <Badge variant="secondary" className="font-normal">{meta.siteRole}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {ISA_LEVELS.slice().reverse().map((l) => {
                      const lm = byLevel.get(l);
                      return <LevelCell key={l} rank={lm?.rank ?? null} blocked={lm?.blocked ?? 0} />;
                    })}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {p.maturity === null ? "—" : `${p.maturity}%`}
                      {p.hasNamespace ? (
                        <span className="ml-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400" title="Has a modelled namespace">◆</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── 9. The namespace convention ─────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">The namespace convention</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          A Unified Namespace is an agreed grammar, not a broker. This is the grammar and how far it has got —{" "}
          <code className="rounded bg-muted px-1 py-0.5">registry/uns.md</code>.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Example topic</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Standard</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {uns.map((u, i) => (
                <tr key={`${u.level}-${u.segment}-${i}`} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{u.level}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.example}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.owner}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.standardRef}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        u.status === "published"
                          ? INTEGRATION_TONE["uns-modelled"]
                          : u.status === "agreed"
                            ? INTEGRATION_TONE["point-to-point"]
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.status || "unreadable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── 10. The register, last ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold">The register</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          {summary.entries} tools from {summary.registered > 0 ? "the application register" : "no register"},{" "}
          {summary.installations} plant installations folded into them, {summary.manual} added here by hand and{" "}
          {summary.fromUseCases} named by a use case alone. Lifecycle:{" "}
          {LIFECYCLES.map((l) => `${l} — ${LIFECYCLE_MEANING[l].toLowerCase()}`).join(" · ")}
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Tool</th>
                <th className="px-3 py-2 font-medium">Capability</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Lifecycle</th>
                <th className="px-3 py-2 font-medium">Integration</th>
                <th className="px-3 py-2 font-medium">Owners</th>
                <th className="px-3 py-2 font-medium">Plants</th>
                <th className="px-3 py-2 text-right font-medium">Users</th>
                <th className="px-3 py-2 text-right font-medium">€/yr</th>
                <th className="px-3 py-2 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => (b.annualCost ?? 0) - (a.annualCost ?? 0) || (b.users ?? 0) - (a.users ?? 0) || a.tool.localeCompare(b.tool))
                .map((t) => (
                  <tr key={`${t.origin}-${t.id}-${t.tool}`} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium">{t.tool}</span>
                      {t.vendor ? <span className="ml-1.5 text-xs text-muted-foreground">{t.vendor}</span> : null}
                      {t.needsAttention ? (
                        <span
                          className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          title={t.issues.join("; ")}
                        >
                          needs attention
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{t.capability || "—"}</td>
                    <td className="px-3 py-2">
                      <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                    </td>
                    <td className="px-3 py-2">
                      {t.lifecycle ? (
                        <Chip tone={LIFECYCLE_TONE[t.lifecycle]}>{t.lifecycle}</Chip>
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
                      {" / "}
                      {t.itOwner || <span className="text-rose-600 dark:text-rose-400">none</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.plants.length === 0 ? "—" : t.plants.length <= 3 ? t.plants.join(", ") : `${t.plants.length} sites`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{t.users ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{eur(t.annualCost)}</td>
                    <td className="px-3 py-2 text-right">
                      <Chip tone={RISK_TONE[t.risk.band]} title={t.risk.factors.map((f) => f.label).join(" ")}>
                        {t.risk.score}
                      </Chip>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Sources of record, all markdown in git:{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/tools.md</code> (applications),{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/landscape.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/uns.md</code> and{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/plants.md</code> (the plants),{" "}
        <code className="rounded bg-muted px-1 py-0.5">landscape/tools.md</code> (added here) and each demand&apos;s{" "}
        <code className="rounded bg-muted px-1 py-0.5">README.md</code>. An overlap here is a candidate for a{" "}
        <Link href="/rollout" className="underline hover:text-foreground">rollout decision</Link>. Everything on this
        page except the add form is derived; it never writes.
      </p>
    </main>
  );
}
