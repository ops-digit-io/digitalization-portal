import Link from "next/link";
import { notFound } from "next/navigation";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { Card } from "@/components/ui/card";
import { Md, AnalyseButton } from "../render";

export const dynamic = "force-dynamic";

export default async function CaseRequirements({ params }: { params: { id: string } }) {
  const id = params.id;
  const demand = await readDemand(id);
  if (demand === undefined) notFound();

  const title = parseUseCase(demand).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id;
  const [requirements, analysis] = await Promise.all([
    readArtifact(id, "requirements"),
    readArtifact(id, "analysis"),
  ]);
  const analysed = requirements !== undefined || analysis !== undefined;

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/requirements" className="hover:text-foreground">Requirements</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="font-mono text-foreground">{id}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{id}</span> · standardized requirements from the intake funnel · <Link href="/demands" className="underline">the demand</Link>
          </p>
        </div>
        <AnalyseButton id={id} label={analysed ? "Re-analyse" : "Analyse"} />
      </div>

      {!analysed ? (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          This demand hasn't been analysed yet. Run the requirements-analysis agent to generate epics, user stories, and NFRs from it.
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {requirements && (
            <Card className="p-6">
              <Md body={requirements} />
            </Card>
          )}
          {analysis && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="transition-transform group-open:rotate-90">▸</span> Domain analysis & enhancement
              </summary>
              <Card className="mt-2 p-6">
                <Md body={analysis} />
              </Card>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
