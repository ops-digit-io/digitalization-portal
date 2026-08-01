import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { analyseBusinessCase } from "@/lib/businesscase";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n-server";
import { Md, DraftButton, ValueEditor, AssumptionEditor } from "./view";

const money = (n: number) => `${n < 0 ? "−" : ""}€${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export const dynamic = "force-dynamic";

/** Pull the `## Change log` bullets out of the document for display, newest last. */
function changeLog(markdown: string): string[] {
  const m = /\n##\s+Change log\s*\n([\s\S]*?)(?=\n##\s|$)/i.exec(markdown);
  if (!m || !m[1]) return [];
  return m[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim()).filter((l) => l.length > 0);
}

/**
 * Business case (S3), decision-grade. Draft from the demand + requirements, quantify
 * the value and cost, test the assumptions, and read the economics the portfolio
 * forum decides on: net value, payback, ROI, multi-year NPV. Nothing here passes a
 * gate, and no figure is stated the case can't support.
 */
export default async function BusinessCasePage({ params }: { params: { id: string } }) {
  const t = getT();
  const id = params.id;
  const demand = await readDemand(id);
  if (demand === undefined) notFound();

  const session = await getSession();
  const mayDraft = can(session, "draft");
  const title = parseUseCase(demand).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id;
  const [businessCase, requirements] = await Promise.all([
    readArtifact(id, "business-case"),
    readArtifact(id, "requirements"),
  ]);

  const analysis = businessCase ? analyseBusinessCase(businessCase) : undefined;
  const facts = analysis?.facts;
  const sim = analysis?.simulation;
  const econ = analysis?.economics;
  const hasValue = econ?.hasValue ?? false;

  // Assumptions in TABLE order (so a toggle's index matches the stored row), each
  // with its euro impact at the base figure.
  const assumptionRows = (facts?.assumptions ?? []).map((a) => ({
    name: a.name,
    tested: a.tested,
    impact: Math.round((facts?.annualGross ?? 0) * a.sensitivity),
  }));
  const testedCount = assumptionRows.filter((a) => a.tested).length;

  // Readiness to reach a committed figure — an honest checklist, not a switch.
  const readiness = [
    { ok: hasValue, label: t("bc.rdValueLabel", "Value quantified"), need: t("bc.rdValueNeed", "Enter the annual gross above.") },
    { ok: facts?.baselineVerified ?? false, label: t("bc.rdBaselineLabel", "Baseline verified"), need: t("bc.rdBaselineNeed", "Measure the baseline (not an estimate).") },
    { ok: econ?.hasCostModel ?? false, label: t("bc.rdCostLabel", "Cost estimated"), need: t("bc.rdCostNeed", "Add a build and run estimate.") },
    { ok: assumptionRows.length > 0 && testedCount === assumptionRows.length, label: t("bc.rdAllLabel", "All assumptions tested"), need: `${t("bc.rdAllNeed1", "Test the remaining")} ${assumptionRows.length - testedCount} ${t("bc.rdAllNeed2", "assumption(s).")}` },
  ];
  const log = businessCase ? changeLog(businessCase) : [];

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/uc/${id}`} className="hover:text-foreground">{id}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("uc.businessCase", "Business case")}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{id}</span> · {t("bc.label", "business case (S3)")} · <Link href={`/uc/${id}`} className="underline">{t("bc.theDemand", "the demand")}</Link>
          </p>
        </div>
        {mayDraft && <DraftButton id={id} label={businessCase ? t("bc.redraft", "Re-draft") : t("bc.draftBusinessCase", "Draft business case")} />}
      </div>

      {!businessCase ? (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          {t("bc.noBusinessCase", "No business case yet.")}{" "}
          {mayDraft
            ? `${t("bc.draftOneFrom", "Draft one from the demand")}${requirements ? t("bc.andRequirements", " and its requirements") : ""}${t("bc.draftOneRest", " — the baseline, value hypothesis, assumptions to test, and cost. You then quantify the value and decide.")}`
            : t("bc.askDrafting", "Ask someone with drafting rights to draft one.")}
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {/* At-a-glance facts. */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">{t("bc.confidence", "Confidence:")} <span className="font-medium">{facts?.confidence ?? "—"}</span></span>
            <span className="rounded-full border px-2.5 py-1">{t("bc.baselineVerifiedChip", "Baseline verified:")} <span className="font-medium">{facts?.baselineVerified ? t("common.yes", "yes") : t("common.no", "no")}</span></span>
            <span className="rounded-full border px-2.5 py-1">{t("bc.annualGross", "Annual gross:")} <span className="font-medium">{hasValue ? money(facts!.annualGross!) : t("bc.toBeQuantified", "to be quantified")}</span></span>
            <span className="rounded-full border px-2.5 py-1">{t("bc.assumptionsTested", "Assumptions tested:")} <span className="font-medium">{testedCount}/{assumptionRows.length}</span></span>
          </div>

          {/* Quantify — the human enters value + cost; the economics light up below. */}
          {mayDraft && (
            <ValueEditor
              id={id}
              annualGross={facts?.annualGross}
              baselineVerified={facts?.baselineVerified ?? false}
            />
          )}

          {/* Economics — the decision numbers. */}
          {econ && (
            <Card className="p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">{t("bc.economics", "Economics")} <span className="ml-1 font-normal text-muted-foreground">· {sim?.confidence} · {econ.horizonYears}-yr @ {(econ.discountRate * 100).toFixed(0)}%</span></h2>
                {econ.viable && <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-medium text-ok">{t("bc.valuePositive", "value-positive")}</span>}
              </div>

              {!hasValue ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("bc.enterAnnualGross", "Enter an annual gross above to see net value, payback, ROI and NPV. Until then every figure is zero — the draft never invents a number.")}
                </p>
              ) : (
                <>
                  {/* Headline metrics. */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: t("bc.netAnnualValue", "Net annual value"), value: money(econ.p50.netAnnual), sub: t("bc.expectedAfterRun", "expected (P50), after run cost") },
                      { label: t("bc.payback", "Payback"), value: econ.paybackYears !== undefined ? `${econ.paybackYears.toFixed(2)} yr` : "—", sub: econ.hasCostModel ? t("bc.toRecoverBuild", "to recover build") : t("bc.addBuildCost", "add a build cost") },
                      { label: `ROI (${econ.horizonYears} yr)`, value: econ.roiPercent !== undefined ? `${econ.roiPercent}%` : "—", sub: econ.hasCostModel ? t("bc.onBuildCost", "on build cost") : t("bc.addBuildCost", "add a build cost") },
                      { label: `NPV (${econ.horizonYears} yr)`, value: money(econ.npv), sub: `${t("bc.discountedAt", "discounted @")} ${(econ.discountRate * 100).toFixed(0)}%` },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg border p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums">{m.value}</div>
                        <div className="text-[11px] text-muted-foreground">{m.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Net value band (downside → base). */}
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t("bc.netValueBand", "Net annual value band")}</p>
                    {([[t("bc.bandP90", "P90 (base)"), econ.p90.netAnnual], [t("bc.bandP50", "P50 (expected)"), econ.p50.netAnnual], [t("bc.bandP10", "P10 (downside)"), econ.p10.netAnnual]] as const).map(([label, v]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium tabular-nums">{money(v)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${econ.p90.netAnnual > 0 ? Math.max(0, Math.round((v / econ.p90.netAnnual) * 100)) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Multi-year cumulative net (undiscounted), starting at −build. */}
                  <div className="mt-5">
                    <p className="text-xs font-medium text-muted-foreground">{t("bc.cumulativeNet", "Cumulative net by year (undiscounted)")}</p>
                    <div className="mt-2 flex items-end gap-1.5" style={{ height: 88 }}>
                      {econ.cumulativeByYear.map((v, i) => {
                        const peak = Math.max(1, ...econ.cumulativeByYear.map((x) => Math.abs(x)));
                        const h = Math.round((Math.abs(v) / peak) * 76) + 2;
                        return (
                          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${t("bc.year", "Year")} ${i}: ${money(v)}`}>
                            <div className={`w-full rounded-sm ${v < 0 ? "bg-destructive/60" : "bg-ok/60"}`} style={{ height: h }} />
                            <span className="text-[10px] text-muted-foreground">Y{i}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("bc.build", "Build")} {money(-econ.buildCost)} {t("bc.inY0", "in Y0;")} {t("bc.breakEven", "break-even")} {econ.cumulativeByYear.findIndex((v) => v >= 0) > 0 ? `≈ ${t("bc.yearLower", "year")} ${econ.cumulativeByYear.findIndex((v) => v >= 0)}` : t("bc.beyondHorizon", "beyond horizon")}.
                    </p>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Assumptions — editable; testing one de-risks the downside. */}
          {assumptionRows.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold">{t("bc.assumptions", "Assumptions")} <span className="ml-1 font-normal text-muted-foreground">· {testedCount}/{assumptionRows.length} {t("bc.tested", "tested")}</span></h2>
              <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
                {t("bc.assumptionsHelp", "Untested assumptions compound the downside (P10). Mark one tested once it's proven — the band tightens.")}
              </p>
              {mayDraft ? (
                <AssumptionEditor id={id} assumptions={assumptionRows} fmtEur="en-US" />
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {assumptionRows.map((a, i) => (
                    <li key={i} className="flex items-start justify-between gap-3">
                      <span className={a.tested ? "text-foreground/70" : "text-foreground"}>{a.tested ? "✓ " : "⚠ "}{a.name}</span>
                      <span className="shrink-0 text-muted-foreground">±{money(a.impact)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Readiness to commit — honest gate on the confidence figure. */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold">{t("bc.readinessTitle", "Readiness to commit")}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {readiness.map((r) => (
                <li key={r.label} className="flex items-start gap-2">
                  <span className={r.ok ? "text-ok" : "text-muted-foreground"} aria-hidden>{r.ok ? "✓" : "○"}</span>
                  <span className={r.ok ? "text-foreground" : "text-muted-foreground"}>
                    {r.label}{!r.ok && <span className="text-muted-foreground"> — {r.need}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("bc.committedFootA", "A")} <span className="font-medium">{t("bc.committedWord", "committed")}</span> {t("bc.committedFootB", "figure also requires a proven pilot (S5) — it can't be set before then.")}
            </p>
          </Card>

          {log.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="transition-transform group-open:rotate-90 inline-block">▸</span> {t("bc.changeLog", "Change log")} ({log.length})
              </summary>
              <Card className="mt-2 p-4">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {log.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </Card>
            </details>
          )}

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="transition-transform group-open:rotate-90 inline-block">▸</span> {t("bc.fullDocument", "Full business case document")}
            </summary>
            <Card className="mt-2 p-6">
              <Md body={businessCase} />
            </Card>
          </details>
        </div>
      )}
    </main>
  );
}
