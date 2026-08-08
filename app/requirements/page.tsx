import Link from "next/link";
import { listDemands, readArtifact } from "@/lib/demands-store";
import { parseRequirementsMarkdown, scoreRequirements, type RequirementsScore } from "@/lib/requirements";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyseButton, AnalyseAll } from "./render";

export const dynamic = "force-dynamic";

const scoreTone = (n: number) => (n >= 80 ? "--ok" : n >= 50 ? "--warn" : "--destructive");

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default async function Requirements() {
  const demands = await listDemands();
  const unanalysed = demands.filter((d) => !d.artifacts.includes("requirements")).map((d) => d.id);

  // Completeness score per analysed case (reuses the existing parser).
  const scores: Record<string, RequirementsScore> = {};
  await Promise.all(
    demands
      .filter((d) => d.artifacts.includes("requirements"))
      .map(async (d) => {
        const md = await readArtifact(d.id, "requirements").catch(() => undefined);
        if (md) scores[d.id] = scoreRequirements(parseRequirementsMarkdown(md));
      }),
  );

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Requirements</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Requirements analysis</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Analyse and enhance each funnel demand with domain knowledge, and derive standardized
            requirements — epics, user stories, NFRs — stored as markdown per case. Draft; a human refines.
          </p>
        </div>
        <AnalyseAll ids={unanalysed} />
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Demand</th>
              <th className="px-4 py-2.5 font-medium">Domain</th>
              <th className="px-4 py-2.5 font-medium">Lane</th>
              <th className="px-4 py-2.5 font-medium">Requirements</th>
              <th className="px-4 py-2.5 font-medium">Completeness</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {demands.map((d) => {
              const analysed = d.artifacts.includes("requirements");
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <Link href={`/requirements/${d.id}`} className="font-medium hover:underline">{d.title}</Link>
                    <div className="font-mono text-xs text-muted-foreground">{d.id}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.domain ?? "—"}</td>
                  <td className="px-4 py-2.5">{d.lane ? <Badge variant="secondary" className="font-normal text-muted-foreground">{LANE_LABEL[d.lane] ?? d.lane}</Badge> : "—"}</td>
                  <td className="px-4 py-2.5">
                    {analysed
                      ? <Badge variant="outline" className="border-ok/50 font-normal text-ok">generated</Badge>
                      : <Badge variant="outline" className="font-normal text-muted-foreground">not analysed</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    {scores[d.id]
                      ? <span
                          className="inline-flex items-center gap-1.5 tabular-nums"
                          title={scores[d.id]!.missing.length ? `Gaps: ${scores[d.id]!.missing.join("; ")}` : "Complete"}
                        >
                          <span className="font-medium" style={{ color: `hsl(var(${scoreTone(scores[d.id]!.score)}))` }}>{scores[d.id]!.score}%</span>
                          {scores[d.id]!.missing.length > 0 && <span className="text-xs text-muted-foreground">{scores[d.id]!.missing.length} gap{scores[d.id]!.missing.length > 1 ? "s" : ""}</span>}
                        </span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {analysed
                      ? <Link href={`/requirements/${d.id}`} className="text-sm font-medium hover:underline">View →</Link>
                      : <AnalyseButton id={d.id} small />}
                  </td>
                </tr>
              );
            })}
            {demands.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No demands in the funnel yet. <Link href="/intake" className="underline">Capture one.</Link></td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
