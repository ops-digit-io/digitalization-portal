import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { parseBusinessCase, simulateBusinessCase } from "@/lib/businesscase";
import { Card } from "@/components/ui/card";
import { Md, DraftButton, ValueEditor } from "./view";

const fmtEur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

export const dynamic = "force-dynamic";

/**
 * Business case (S3). Draft from the demand + its requirements, review, and simulate.
 * The draft is a starting point for the portfolio forum to quantify and decide at G3;
 * it never states a value it can't support.
 */
export default async function BusinessCasePage({ params }: { params: { id: string } }) {
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
  const facts = businessCase ? parseBusinessCase(businessCase) : undefined;
  const sim = businessCase ? simulateBusinessCase(businessCase).simulation : undefined;
  const hasValue = facts?.annualGross !== undefined && facts.annualGross > 0;

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/uc/${id}`} className="hover:text-foreground">{id}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Business case</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{id}</span> · business case (S3) · <Link href={`/uc/${id}`} className="underline">the demand</Link>
          </p>
        </div>
        {mayDraft && <DraftButton id={id} label={businessCase ? "Re-draft" : "Draft business case"} />}
      </div>

      {!businessCase ? (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          No business case yet.{" "}
          {mayDraft
            ? `Draft one from the demand${requirements ? " and its requirements" : ""} — the baseline, value hypothesis, assumptions to test, and cost. You then quantify the value and decide.`
            : "Ask someone with drafting rights to draft one."}
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {/* At-a-glance facts the parser extracts. */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2.5 py-1">
              Confidence: <span className="font-medium">{facts?.confidence ?? "—"}</span>
            </span>
            <span className="rounded-full border px-2.5 py-1">
              Baseline verified: <span className="font-medium">{facts?.baselineVerified ? "yes" : "no"}</span>
            </span>
            <span className="rounded-full border px-2.5 py-1">
              Value: <span className="font-medium">{hasValue ? fmtEur(facts!.annualGross!) : "to be quantified"}</span>
            </span>
          </div>

          {/* Quantify — the human enters the value; the simulation lights up below. */}
          {mayDraft && (
            <ValueEditor
              id={id}
              annualGross={facts?.annualGross}
              baselineVerified={facts?.baselineVerified ?? false}
            />
          )}

          {/* The value analysis: P10 / P50 / P90 bands + assumption tornado. */}
          {sim && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold">Value analysis <span className="ml-1 font-normal text-muted-foreground">· {sim.confidence}</span></h2>
              {!hasValue ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter an annual gross above to see the P10 / P50 / P90 bands. Until then the analysis is zero — the draft never invents a figure.
                </p>
              ) : (
                <>
                  <div className="mt-4 space-y-2">
                    {([["P90 (base)", sim.p90], ["P50", sim.p50], ["P10 (downside)", sim.p10]] as const).map(([label, v]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{fmtEur(v)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${sim.p90 > 0 ? Math.round((v / sim.p90) * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {sim.drivers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground">Assumption sensitivity (untested first)</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {sim.drivers.map((d, i) => (
                          <li key={i} className="flex items-start justify-between gap-3">
                            <span className={d.tested ? "text-foreground/80" : "text-foreground"}>{d.tested ? "" : "⚠ "}{d.name}</span>
                            <span className="shrink-0 text-muted-foreground">±{fmtEur(d.impact)}{d.tested ? "" : " · untested"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="transition-transform group-open:rotate-90 inline-block">▸</span> Full business case document
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
