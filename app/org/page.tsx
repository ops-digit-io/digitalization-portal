import Link from "next/link";
import { listDepartments, readFramework } from "@/lib/org/store";
import { organizationRepo } from "@/lib/content-repo";
import { CORE_SECTIONS } from "@/lib/org/model";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { getT } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBar, ScorePill } from "@/components/portal/org-score";
import { NewDepartment } from "@/components/org/new-department";

export const dynamic = "force-dynamic";

/**
 * Department OS — the org map. Every department the portal knows, scored on how
 * completely it has written down the context its agents need (the grammar in
 * `lib/org/model.ts`). This is the layer BEHIND the demands and processes: the tools
 * read it to answer "what is the org behind this work?".
 *
 * Departments live in the external `du-organization-context` repo, read through the
 * content-repo seam (live GitHub → local mirror → the bundled worked example), so the
 * map is never blank before the org populates its own repo.
 */
export default async function OrgOverview() {
  const { t } = getT();
  const repo = organizationRepo().repoName;
  const [departments, framework, session] = await Promise.all([listDepartments(), readFramework(), getSession()]);
  const canEdit = can(session, "draft");

  const avg = departments.length
    ? Math.round(departments.reduce((s, d) => s + d.score.score, 0) / departments.length)
    : 0;
  const staleCount = departments.reduce((s, d) => s + d.score.criticalStale.length, 0);

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("org.title")}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("org.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("org.overviewIntro")} {t("org.readFrom")} <span className="font-mono">{repo}</span>.
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-xs text-muted-foreground">{t("org.kpiDepartments")}</div>
            <div className="text-lg font-semibold">{departments.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("org.kpiAvgCompleteness")}</div>
            <div className="text-lg font-semibold"><ScorePill score={avg} /></div>
          </div>
          {staleCount > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">{t("org.kpiCriticalStale")}</div>
              <div className="text-lg font-semibold text-rose-600">{staleCount}</div>
            </div>
          )}
          {canEdit && <NewDepartment />}
        </div>
      </div>

      {departments.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          {t("org.emptyReachablePre")} <span className="font-mono">{repo}</span> {t("org.emptyReachableMid")}{" "}
          <span className="font-mono">npm run content:pull</span> {t("org.emptyReachablePost")}
        </Card>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Link key={d.slug} href={`/org/${d.slug}`} className="group">
              <Card className="h-full p-4 transition-colors group-hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-tight">{d.name}</h2>
                  <ScorePill score={d.score.score} />
                </div>
                {d.purpose && <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{d.purpose}</p>}
                <ScoreBar score={d.score.score} className="mt-3" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{d.score.corePresent}/{d.score.coreTotal} {t("org.coreSections")}</span>
                  {d.score.criticalStale.length > 0 ? (
                    <Badge variant="destructive">{d.score.criticalStale.length} {t("org.stale")}</Badge>
                  ) : (
                    <span className="text-emerald-600">{t("org.current")}</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold">{t("org.coreSectionsTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("org.coreSectionsIntro")}
        </p>
        <Card className="mt-3 divide-y p-0">
          {CORE_SECTIONS.map((s) => (
            <div key={s.key} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 min-w-[9.5rem] font-mono text-xs text-muted-foreground">{s.key}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  {s.critical && <Badge variant="outline" className="border-rose-300 text-rose-600">{t("org.critical")}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{s.machineNeed}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {framework && (
        <p className="mt-6 text-xs text-muted-foreground">
          <Link href="/org/framework" className="underline hover:text-foreground">{t("org.readFramework")}</Link>
        </p>
      )}
    </main>
  );
}
