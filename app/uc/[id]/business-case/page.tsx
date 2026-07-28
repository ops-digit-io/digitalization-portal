import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { parseBusinessCase } from "@/lib/businesscase";
import { Card } from "@/components/ui/card";
import { Md, DraftButton } from "./view";

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
              Value: <span className="font-medium">{facts?.annualGross !== undefined ? `EUR ${facts.annualGross.toLocaleString("en-US")}` : "to be quantified"}</span>
            </span>
            <Link href={`/uc/${id}/simulate`} className="rounded-full border px-2.5 py-1 hover:border-foreground/40">
              ⚡ Simulate value (P10 / P50 / P90) →
            </Link>
          </div>

          {facts?.annualGross === undefined && (
            <p className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-muted-foreground">
              This draft states no value figure on purpose — the intake carries no verified baseline. Quantify the baseline
              (edit <span className="font-mono">business-case.md</span>) and the portfolio value + simulation light up. The draft never invents a number.
            </p>
          )}

          <Card className="p-6">
            <Md body={businessCase} />
          </Card>
        </div>
      )}
    </main>
  );
}
