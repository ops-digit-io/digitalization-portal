import Link from "next/link";
import { notFound } from "next/navigation";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { parseUseCase } from "@/lib/parse";
import { parseRequirementsMarkdown } from "@/lib/requirements";
import { parseVerification } from "@/lib/verification";
import { parseOverrides, applyOverrides, emptyOverlay } from "@/lib/requirements-overrides";
import { canEditDemand } from "@/lib/demand-edit";
import { getSession } from "@/lib/auth/current";
import { Card } from "@/components/ui/card";
import { Md, AnalyseButton } from "../render";
import { RequirementsBoard } from "./board";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function CaseRequirements({ params }: { params: { id: string } }) {
  const t = getT();
  const id = params.id;
  const demand = await readDemand(id);
  if (demand === undefined) notFound();

  const session = await getSession();
  const title = parseUseCase(demand).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id;
  const [requirements, analysis, research] = await Promise.all([
    readArtifact(id, "requirements"),
    readArtifact(id, "analysis"),
    readArtifact(id, "research"),
  ]);
  const analysed = requirements !== undefined || analysis !== undefined || research !== undefined;

  // Parse the standardized requirements back into structure, then apply the human
  // overlay (add/edit/remove) from the demand README — both the overlay and the
  // verification state live there so they survive re-analysis of requirements.md.
  const parsed = requirements ? parseRequirementsMarkdown(requirements) : undefined;
  const overlay = parseOverrides(demand);
  const merged = parsed ? applyOverrides(parsed, overlay) : undefined;
  const doc = merged?.doc;
  const verified = [...parseVerification(demand)];
  const canVerify = canEditDemand(session, demand);

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/requirements" className="hover:text-foreground">{t("requirements.title", "Requirements")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="font-mono text-foreground">{id}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{id}</span> · {t("requirements.subtitle", "epics & features to verify during PoC / pilot")} · <Link href={`/uc/${id}`} className="underline">{t("requirements.theDemand", "the demand")}</Link>
          </p>
        </div>
        <AnalyseButton id={id} label={analysed ? t("requirements.reanalyse", "Re-analyse") : t("requirements.analyse", "Analyse")} />
      </div>

      {!analysed ? (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          {t("requirements.notAnalysedYet", "This demand hasn't been analysed yet. Run the requirements-analysis agent to generate epics, features, and acceptance criteria from it.")}
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {doc && merged && (
            <RequirementsBoard
              id={id}
              doc={doc}
              verified={verified}
              canVerify={canVerify}
              canEdit={canVerify}
              provenance={merged.provenance}
              removed={merged.removed}
            />
          )}

          {analysis && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="transition-transform group-open:rotate-90">▸</span> {t("requirements.domainAnalysis", "Domain analysis & enhancement")}
              </summary>
              <Card className="mt-2 p-6">
                <Md body={analysis} />
              </Card>
            </details>
          )}
          {research && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="transition-transform group-open:rotate-90">▸</span> {t("requirements.domainResearch", "Domain research (reference cases & testimonials)")}
              </summary>
              <Card className="mt-2 p-6">
                <Md body={research} />
              </Card>
            </details>
          )}

          {requirements && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="transition-transform group-open:rotate-90">▸</span> {t("requirements.fullDoc", "Full requirements document (markdown)")}
              </summary>
              <Card className="mt-2 p-6">
                <Md body={requirements} />
              </Card>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
