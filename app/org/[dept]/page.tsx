import Link from "next/link";
import { notFound } from "next/navigation";
import { readDepartment } from "@/lib/org/store";
import { listLanes } from "@/lib/org/lane-store";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { getT } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownPage } from "@/components/portal/markdown-page";
import { ScoreBar, ScorePill } from "@/components/portal/org-score";
import { SectionEditor } from "@/components/org/section-editor";
import { NewLane } from "@/components/org/new-lane";
import { AutonomyLegend } from "@/components/org/autonomy-legend";
import { authorityPolicy, isAuthorityLevel, RUNG_TONE } from "@/lib/org/autonomy";
import type { DepartmentSection } from "@/lib/org/store";

export const dynamic = "force-dynamic";

/**
 * One department in full: every core section scored against the grammar, with the
 * missing criteria as a coaching backlog, freshness/validity flags for the critical
 * sections, and the written markdown itself. This is the context a tool loads to know
 * the org behind a demand — and the page a department improves against.
 */
export default async function DepartmentDetail({ params }: { params: { dept: string } }) {
  const { t } = getT();
  const [dept, session, lanes] = await Promise.all([readDepartment(params.dept), getSession(), listLanes(params.dept)]);
  if (!dept) notFound();
  const canEdit = can(session, "draft");

  const { score } = dept;
  const staleKeys = new Set(score.criticalStale);

  return (
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/org" className="hover:text-foreground">{t("org.title")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{dept.name}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{dept.name}</h1>
          {dept.purpose && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{dept.purpose}</p>}
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t("org.contextCompleteness")}</div>
          <div className="text-2xl font-semibold"><ScorePill score={score.score} /></div>
          <div className="text-xs text-muted-foreground">{score.corePresent}/{score.coreTotal} {t("org.coreSections")}</div>
        </div>
      </div>
      <ScoreBar score={score.score} className="mt-3" />

      {score.criticalStale.length > 0 && (
        <Card className="mt-4 border-rose-300 bg-rose-50/50 p-3 text-sm dark:bg-rose-950/20">
          <span className="font-medium text-rose-700 dark:text-rose-400">
            {score.criticalStale.length} {t("org.criticalSectionsStale")}
          </span>{" "}
          <span className="text-rose-700/90 dark:text-rose-400/90">{score.criticalStale.join(", ")}</span>. {t("org.reVerify")}
        </Card>
      )}

      {/* At-a-glance section index. */}
      <Card className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 p-4 sm:grid-cols-3">
        {dept.sections.map((s) => (
          <a key={s.key} href={`#${s.key}`} className="flex items-center justify-between gap-2 text-xs hover:text-foreground">
            <span className="truncate text-muted-foreground">{s.key}</span>
            <ScorePill score={s.score.score} />
          </a>
        ))}
      </Card>

      <div className="mt-6 space-y-5">
        {dept.sections.map((s) => (
          <Section key={s.key} section={s} stale={staleKeys.has(s.key)} slug={dept.slug} deptName={dept.name} canEdit={canEdit} />
        ))}
      </div>

      {/* Lanes — the third ring: per-lane packs where autonomy actually lives. */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t("org.lanes")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("org.lanesIntro")}
            </p>
          </div>
          {canEdit && <NewLane deptSlug={dept.slug} />}
        </div>
        {lanes.length === 0 ? (
          <Card className="mt-3 p-6 text-center text-xs text-muted-foreground">
            {t("org.lanesEmpty")}
          </Card>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lanes.map((l) => {
                const pol = l.authority && isAuthorityLevel(l.authority) ? authorityPolicy(l.authority) : null;
                return (
                  <Link key={l.slug} href={`/org/${dept.slug}/${l.slug}`} className="group">
                    <Card className="h-full p-4 transition-colors group-hover:border-primary/50">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-tight">{l.name}</h3>
                        <ScorePill score={l.score.score} />
                      </div>
                      <ScoreBar score={l.score.score} className="mt-2" />
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{l.score.corePresent}/{l.score.coreTotal} {t("org.files")}</span>
                        {pol ? (
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${RUNG_TONE[pol.tone].badge}`} title={pol.summary}>
                            <span className={`inline-block size-1.5 rounded-full ${RUNG_TONE[pol.tone].dot}`} aria-hidden />
                            {t(`autonomy.${pol.level}.label`, pol.label)}
                          </span>
                        ) : (
                          <span className="text-amber-600">{t("org.noAutonomy")}</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4">
              <AutonomyLegend compact />
            </div>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">{t("org.modules")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("org.modulesIntro")}
        </p>
        <div className="mt-3 space-y-5">
          {[...dept.modules]
            .sort((a, b) => Number(b.present) - Number(a.present) || a.title.localeCompare(b.title))
            .map((m) => (
              <Section
                key={m.key}
                section={m}
                stale={m.present && (m.score.freshness.stale || m.score.validity?.expired === true)}
                slug={dept.slug}
                deptName={dept.name}
                canEdit={canEdit}
                hint={m.trigger}
              />
            ))}
        </div>
      </section>
    </main>
  );
}

function Section({
  section,
  stale,
  slug,
  deptName,
  canEdit,
  hint,
}: {
  section: DepartmentSection;
  stale: boolean;
  slug: string;
  deptName: string;
  canEdit: boolean;
  /** Optional sub-line (e.g. a module's trigger). */
  hint?: string;
}) {
  const { t } = getT();
  const { score } = section;
  const fresh = score.freshness;
  return (
    <Card id={section.key} className="scroll-mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{score.title}</h2>
            {score.critical && <Badge variant="outline" className="border-rose-300 text-rose-600">{t("org.critical")}</Badge>}
            {section.score.present && stale && <Badge variant="destructive">{t("org.stale")}</Badge>}
          </div>
          <span className="font-mono text-xs text-muted-foreground">{section.key}.md</span>
          {hint && <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ScorePill score={score.score} />
          {score.excellenceResults.length > 0 && (
            <span className="text-xs text-muted-foreground">· {t("org.excellence")} {score.excellence}%</span>
          )}
          {canEdit && (
            <SectionEditor slug={slug} sectionKey={section.key} deptName={deptName} initialSource={section.source} present={section.score.present} />
          )}
        </div>
      </div>
      <ScoreBar score={score.score} className="mt-2" />

      {/* Freshness / validity line. */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{fresh.detail}</span>
        {score.validity && <span className={score.validity.expired ? "text-rose-600" : ""}>{t("org.validity")} {score.validity.detail}</span>}
      </div>

      {!section.score.present ? (
        <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {t("org.notWritten")} {score.coaching}
        </p>
      ) : (
        <>
          {score.missing.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">
              <div className="font-medium text-amber-800 dark:text-amber-300">{t("org.toReachFull")}</div>
              <ul className="mt-1 list-disc pl-5 text-amber-800/90 dark:text-amber-300/90">
                {score.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
              {score.coaching && <p className="mt-2 italic text-amber-800/80 dark:text-amber-300/80">{score.coaching}</p>}
            </div>
          )}
          <div className="mt-4 border-t pt-4">
            <MarkdownPage body={section.body} />
          </div>
        </>
      )}
    </Card>
  );
}
