import Link from "next/link";
import { listDemands } from "@/lib/demands-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyseButton, AnalyseAll } from "./render";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const LANE_LABEL: Record<string, string> = {
  run: "run", regulatory: "regulatory", continuous_improvement: "continuous improvement",
  transform: "transform", innovation: "innovation", data_ai: "data / AI", local: "local", unassigned: "unassigned",
};

export default async function Requirements() {
  const t = getT();
  const demands = await listDemands();
  const unanalysed = demands.filter((d) => !d.artifacts.includes("requirements")).map((d) => d.id);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("requirements.title", "Requirements")}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("requirements.analysisTitle", "Requirements analysis")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("requirements.intro", "Analyse and enhance each funnel demand with domain knowledge, and derive standardized requirements — epics, user stories, NFRs — stored as markdown per case. Draft; a human refines.")}
          </p>
        </div>
        <AnalyseAll ids={unanalysed} />
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">{t("field.demand", "Demand")}</th>
              <th className="px-4 py-2.5 font-medium">{t("field.domain", "Domain")}</th>
              <th className="px-4 py-2.5 font-medium">{t("field.lane", "Lane")}</th>
              <th className="px-4 py-2.5 font-medium">{t("requirements.title", "Requirements")}</th>
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
                      ? <Badge variant="outline" className="border-ok/50 font-normal text-ok">{t("requirements.generated", "generated")}</Badge>
                      : <Badge variant="outline" className="font-normal text-muted-foreground">{t("requirements.notAnalysed", "not analysed")}</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {analysed
                      ? <Link href={`/requirements/${d.id}`} className="text-sm font-medium hover:underline">{t("common.view", "View")} →</Link>
                      : <AnalyseButton id={d.id} small />}
                  </td>
                </tr>
              );
            })}
            {demands.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("requirements.emptyFunnel", "No demands in the funnel yet.")} <Link href="/intake" className="underline">{t("requirements.captureOne", "Capture one.")}</Link></td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
