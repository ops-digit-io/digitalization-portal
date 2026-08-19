import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import { loadRegister } from "@/lib/otx/register";
import {
  parsePlants,
  parseUns,
  maturityByPlant,
  blockers,
  summarise,
  unsConventionProgress,
  ISA_LEVELS,
  MAX_INTEGRATION_RANK,
  type PlantRow,
} from "@/lib/otx/landscape";
import { redundancies, unowned, lifecycleDebt, byCapability, toolIntegrationRank } from "@/lib/otx/toolscape";
import {
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
import { RiskDecision, UndoRiskDecision } from "@/components/landscape/risk-decision";
import { ToolRisk } from "@/components/landscape/tool-risk";
import { RemoveTool } from "@/components/landscape/remove-tool";
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
 * This page used to be two (an application register and a plant system landscape)
 * with a third answer, the tool a use case names, living nowhere. Consolidated
 * here: the register, the plant systems beneath it, the tools recorded by hand and
 * the tools use cases declare. Risk and budget lead, because every tool is both,
 * and both are derived from the register's own facts rather than stored.
 *
 * Written to be READ AT A GLANCE: a heading, one line of context, the table. The
 * reasoning behind the model lives in `lib/otx/consolidate.ts` and the registry
 * masters — a page that has to be read before it can be used is a page nobody
 * uses. Everything here derives; only the "Add a tool" form writes.
 */

/** A tool's node in the mesh — the same one the graph and the demand pages use. */
function meshHref(t: ToolEntry): string {
  return `/mesh?focus=${encodeURIComponent(`application:${t.node}`)}`;
}

/** The tool's current values, as the edit form's fields. */
function editValues(t: ToolEntry) {
  return {
    tool: t.tool,
    vendor: t.vendor,
    capability: t.capability,
    domain: t.domain,
    scope: t.scope,
    hosting: t.hosting,
    lifecycle: t.lifecycle,
    integration: t.integration,
    businessOwner: t.businessOwner,
    itOwner: t.itOwner,
    users: t.users === null ? "" : String(t.users),
    criticality: t.criticality,
    annualCost: t.annualCost === null ? "" : String(t.annualCost),
    notes: t.notes,
  };
}

function ToolChip({ t }: { t: ToolEntry }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded border px-1.5 py-0.5">
      <span className="text-xs font-medium">{t.tool}</span>
      {t.lifecycle ? <Chip tone={LIFECYCLE_TONE[t.lifecycle]}>{t.lifecycle}</Chip> : null}
      {t.annualCost !== null ? (
        <span className="text-[10px] tabular-nums text-muted-foreground">{eur(t.annualCost)}</span>
      ) : null}
    </span>
  );
}

/** A level cell in the plant × ISA-95 matrix: mean maturity, shaded, blocked count. */
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

/** Heading, one line of context, content. The page's only layout rule. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const TH = "px-3 py-2 font-medium";
const THEAD = "border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground";

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

  const [{ entries, systems }, plantsMd, unsMd] = await Promise.all([
    loadRegister(),
    readRegistry("plants"),
    readRegistry("uns"),
  ]);

  const plants: PlantRow[] = parsePlants(plantsMd);
  const uns = parseUns(unsMd);

  const summary = summariseConsolidated(entries);
  const money = budget(entries);
  const risks = topRisks(entries, 12);
  const gaps = registerGaps(entries);
  const exposure = useCaseExposure(entries);
  const health = integrationHealth(entries);

  // The enterprise findings, over the CONSOLIDATED list — an off-register plant
  // system takes part in the overlap analysis like anything else.
  const overlaps = redundancies(entries);
  const shadow = unowned(entries);
  const debt = lifecycleDebt(entries);
  const caps = byCapability(entries);

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
          Nothing recorded yet. Applications live in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/tools.md</code>, plant systems in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/landscape.md</code> — or record one here.
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

      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Tool &amp; system landscape</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every tool in one register — applications, plant systems, and what use cases build on. Risk and cost per row.
          </p>
        </div>
        {canAdd ? <AddTool capabilities={capabilityNames} domains={domainNames} /> : null}
      </header>

      <Card className="mb-5 p-4">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Tools" value={String(summary.entries)} hint={`${summary.registered} registered`} />
          <Stat label="Annual cost" value={eur(money.total)} hint={money.coverage === null ? "none costed" : `${money.coverage}% costed`} />
          <Stat label="At risk" value={String(summary.atRisk)} hint={`${eur(money.atRisk)} behind them`} alarm={summary.atRisk > 0} />
          <Stat
            label="Off the register"
            value={String(summary.offRegister + summary.fromUseCases)}
            hint="in plants or use cases"
            alarm={summary.offRegister + summary.fromUseCases > 0}
          />
          <Stat label="Used by cases" value={String(summary.inUse)} hint={`${exposure.length} use cases`} />
          <Stat label="Integration" value={health === null ? "—" : `${health}%`} hint={`${ot.blocked} unreadable`} />
        </dl>
      </Card>

      <Section title="Risk" hint="Derived from the register's facts. Worst 12; every score is in the table at the end.">
        {risks.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nothing scores above zero.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Tool</th>
                  <th className={`${TH} text-right`}>Risk</th>
                  <th className={`${TH} text-right`}>Cost/yr</th>
                  <th className={TH}>Why</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((t) => (
                  <tr key={`${t.id}-${t.tool}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <Link href={meshHref(t)} className="font-medium hover:underline">{t.tool}</Link>
                        <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                        {t.criticality ? <Chip tone={CRIT_TONE[t.criticality]}>{t.criticality}</Chip> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.capability || "no capability"}
                        {t.plants.length > 0 ? ` · ${t.plants.join(", ")}` : ""}
                        {t.useCases.length > 0 ? ` · ${t.useCases.length} use case${t.useCases.length === 1 ? "" : "s"}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Chip tone={RISK_TONE[t.risk.band]}>{t.risk.band}</Chip>
                      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{t.risk.score}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{eur(t.annualCost)}</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {t.risk.factors.map((f) => (
                          <li key={f.key}>
                            <span className="tabular-nums text-foreground/70">+{f.weight}</span> {f.label}
                            {f.manual ? <span className="ml-1 text-[10px] uppercase tracking-wide">added</span> : null}
                            {f.manual ? <> <UndoRiskDecision node={t.node} factor={f.key.replace(/^manual:/, "")} /></> : null}
                          </li>
                        ))}
                        {t.risk.accepted.map((f) => (
                          <li key={f.key} className="text-muted-foreground/70">
                            <span className="tabular-nums line-through">+{f.weight}</span>{" "}
                            <span className="line-through">{f.label}</span>{" "}
                            <span className="text-[10px] uppercase tracking-wide">accepted</span> — {f.reason}
                            {f.by ? ` (${f.by}${f.date ? `, ${f.date}` : ""})` : ""} <UndoRiskDecision node={t.node} factor={f.key} />
                          </li>
                        ))}
                      </ul>
                      {canAdd ? (
                        <RiskDecision node={t.node} label={t.tool} factors={t.risk.factors.filter((f) => !f.manual).map((f) => ({ key: f.key, label: f.label }))} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      <Section title="Budget" hint="Money already being spent, by finding — not projected savings.">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Card className="p-4">
            <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <Stat label="Annual run cost" value={eur(money.total)} />
              <Stat label="Behind at-risk tools" value={eur(money.atRisk)} alarm={money.atRisk > 0} />
              <Stat label="Uncosted" value={String(money.unbudgeted)} hint="tools nobody has priced" alarm={money.unbudgeted > 0} />
            </dl>
          </Card>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Spend</th>
                  <th className={`${TH} text-right`}>€/yr</th>
                  <th className={`${TH} text-right`}>Tools</th>
                  <th className={TH}>Why</th>
                </tr>
              </thead>
              <tbody>
                {money.lines.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={4}>No costed tool falls into a finding.</td>
                  </tr>
                ) : (
                  money.lines.map((l) => (
                    <tr key={l.label} className="border-b align-top last:border-0">
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
      </Section>

      <Section title="Off the register" hint="Found in a plant or a use case, in no register. Register it or retire it.">
        {gaps.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Everything found is on a register.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Tool / system</th>
                  <th className={TH}>Found in</th>
                  <th className={TH}>Where</th>
                  <th className={`${TH} text-right`}>Risk</th>
                  <th className={TH}>Owner</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((t) => (
                  <tr key={`${t.origin}-${t.tool}`} className="border-b align-top last:border-0">
                    <td className="px-3 py-2">
                      <Link href={meshHref(t)} className="font-medium hover:underline">{t.tool}</Link>
                      {canAdd ? (
                        <span className="ml-1.5">
                          <AddTool
                            capabilities={capabilityNames}
                            domains={domainNames}
                            edit={{ node: t.node, label: t.tool, values: editValues(t) }}
                          />
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.plants.length > 0 ? t.plants.join(", ") : t.useCases.map((u) => u.id).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ToolRisk
                        node={t.node}
                        label={t.tool}
                        score={t.risk.score}
                        tone={RISK_TONE[t.risk.band]}
                        factors={t.risk.factors}
                        accepted={t.risk.accepted}
                        canDecide={canAdd}
                      />
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
      </Section>

      <Section title="Use cases and what they stand on" hint="Declared at intake; a prose match shows as mentioned.">
        {exposure.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No demand names a tool yet.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Use case</th>
                  <th className={TH}>Worst</th>
                  <th className={TH}>Tools</th>
                </tr>
              </thead>
              <tbody>
                {exposure.map((x) => (
                  <tr key={x.id} className="border-b align-top last:border-0">
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
                            {t.kind === "mentioned" ? <span className="text-[10px] text-muted-foreground">mentioned</span> : null}
                            {!t.registered ? <span className="text-[10px] text-rose-600 dark:text-rose-400">unregistered</span> : null}
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
      </Section>

      <Section title="Overlaps" hint="One capability, more than one tool in service.">
        {overlaps.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">No capability is served twice.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Capability</th>
                  <th className={`${TH} text-right`}>Users</th>
                  <th className={`${TH} text-right`}>€/yr</th>
                  <th className={TH}>Tools</th>
                  <th className={TH}>Consolidate onto</th>
                </tr>
              </thead>
              <tbody>
                {overlaps.map((r) => {
                  const cost = r.tools.reduce((a, t) => a + (t.annualCost ?? 0), 0);
                  return (
                    <tr key={r.capability} className="border-b align-top last:border-0">
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
                          <span className="text-rose-700 dark:text-rose-400">no <code>invest</code> tool — undecided</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">two claim <code>invest</code></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Unowned" hint="In service, no owning team.">
          {shadow.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Every tool has both owners.</Card>
          ) : (
            <Card className="p-3">
              <ul className="space-y-2">
                {shadow.map((u) => (
                  <li key={`${u.tool.id}-${u.tool.tool}`} className="border-l-2 border-rose-400 pl-2.5 dark:border-rose-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{u.tool.tool}</span>
                      {u.tool.criticality ? <Chip tone={CRIT_TONE[u.tool.criticality]}>{u.tool.criticality}</Chip> : null}
                      {u.tool.annualCost !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">{eur(u.tool.annualCost)}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">No {u.missing.join(" and no ")} owner.</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Section>

        <Section title="Lifecycle debt" hint="Decided to go, still load-bearing.">
          {debt.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Nothing marked for replacement carries load.</Card>
          ) : (
            <Card className="p-3">
              <ul className="space-y-2">
                {debt.map((d) => (
                  <li key={`${d.tool.id}-${d.tool.tool}`} className="border-l-2 border-amber-400 pl-2.5 dark:border-amber-700">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium">{d.tool.tool}</span>
                      {d.tool.lifecycle ? <Chip tone={LIFECYCLE_TONE[d.tool.lifecycle]}>{d.tool.lifecycle}</Chip> : null}
                      {d.tool.annualCost !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">{eur(d.tool.annualCost)}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Section>
      </div>

      <Section title="Capabilities" hint="The vocabulary every finding above compares on.">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Capability</th>
                <th className={`${TH} text-right`}>Tools</th>
                <th className={`${TH} text-right`}>Users</th>
                <th className={`${TH} text-right`}>€/yr</th>
                <th className={TH}>Scopes</th>
                <th className={TH}>Strategic tool</th>
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
      </Section>

      <Section
        title="In the plants"
        hint={`${ot.systems} systems · ${ot.blocked} unreadable (the funnel's K2.2 knockout) · ${ot.withNamespace}/${ot.plants} on the namespace`}
      >
        {backlog.length > 0 ? (
          <Card className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>#</th>
                  <th className={TH}>Plant</th>
                  <th className={TH}>Level</th>
                  <th className={TH}>System</th>
                  <th className={TH}>Vendor</th>
                  <th className={TH}>Barrier</th>
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
          <Card className="mb-4 p-4 text-sm text-muted-foreground">Every system has a readable interface.</Card>
        )}

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Plant</th>
                <th className={TH}>Region</th>
                <th className={TH}>Role</th>
                {ISA_LEVELS.slice().reverse().map((l) => (
                  <th key={l} className="px-2 py-2 text-center font-medium">{l}</th>
                ))}
                <th className={`${TH} text-right`}>Overall</th>
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
      </Section>

      <Section
        title="Namespace convention"
        hint={`${convention.percent === null ? "—" : `${convention.percent}% published`} · ${convention.agreed} agreed · ${convention.proposed} proposed`}
      >
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Level</th>
                <th className={TH}>Example topic</th>
                <th className={TH}>Owner</th>
                <th className={TH}>Standard</th>
                <th className={TH}>Status</th>
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
      </Section>

      <Section
        title="The register"
        hint={`${summary.entries} tools · ${summary.installations} plant installations · ${summary.manual} added here · ${summary.fromUseCases} from use cases. Edit any row; open a score to decide about its risk.`}
      >
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Tool</th>
                <th className={TH}>Capability</th>
                <th className={TH}>Source</th>
                <th className={TH}>Lifecycle</th>
                <th className={TH}>Integration</th>
                <th className={TH}>Owners</th>
                <th className={TH}>Plants</th>
                <th className={`${TH} text-right`}>Users</th>
                <th className={`${TH} text-right`}>€/yr</th>
                <th className={`${TH} text-right`}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => (b.annualCost ?? 0) - (a.annualCost ?? 0) || (b.users ?? 0) - (a.users ?? 0) || a.tool.localeCompare(b.tool))
                .map((t) => (
                  <tr key={`${t.origin}-${t.id}-${t.tool}`} id={t.node} className="border-b scroll-mt-20 last:border-0">
                    <td className="px-3 py-2">
                      <Link href={meshHref(t)} className="font-medium hover:underline" title="Show this tool in the context mesh">
                        {t.tool}
                      </Link>
                      {t.vendor ? <span className="ml-1.5 text-xs text-muted-foreground">{t.vendor}</span> : null}
                      {t.needsAttention ? (
                        <span
                          className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          title={t.issues.join("; ")}
                        >
                          !
                        </span>
                      ) : null}
                      {t.edited.length > 0 ? (
                        <span
                          className="ml-1.5 text-[10px] text-muted-foreground"
                          title={`Edited here: ${t.edited.join(", ")}${t.editedBy ? ` — ${t.editedBy}${t.editedOn ? `, ${t.editedOn}` : ""}` : ""}`}
                        >
                          edited
                        </span>
                      ) : null}
                      {canAdd ? (
                        <span className="ml-1.5">
                          <AddTool
                            capabilities={capabilityNames}
                            domains={domainNames}
                            edit={{ node: t.node, label: t.tool, values: editValues(t) }}
                          />
                        </span>
                      ) : null}
                      {canAdd && t.origin === "manual" ? (
                        <span className="ml-1.5">
                          <RemoveTool node={t.node} label={t.tool} />
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{t.capability || "—"}</td>
                    <td className="px-3 py-2">
                      <Chip tone={ORIGIN_TONE[t.origin]} title={ORIGIN_MEANING[t.origin]}>{ORIGIN_LABEL[t.origin]}</Chip>
                    </td>
                    <td className="px-3 py-2">
                      {t.lifecycle ? <Chip tone={LIFECYCLE_TONE[t.lifecycle]}>{t.lifecycle}</Chip> : <span className="text-xs text-muted-foreground">?</span>}
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
                      <ToolRisk
                        node={t.node}
                        label={t.tool}
                        score={t.risk.score}
                        tone={RISK_TONE[t.risk.band]}
                        factors={t.risk.factors}
                        accepted={t.risk.accepted}
                        canDecide={canAdd}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <p className="text-xs text-muted-foreground">
        Sources, all markdown in git: <code className="rounded bg-muted px-1 py-0.5">registry/tools.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/landscape.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/uns.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/plants.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">landscape/tools.md</code>, each demand&apos;s{" "}
        <code className="rounded bg-muted px-1 py-0.5">README.md</code>. Every tool is a node in the{" "}
        <Link href="/mesh?kind=application" className="underline hover:text-foreground">context mesh</Link>.
      </p>
    </main>
  );
}
