import Link from "next/link";
import { notFound } from "next/navigation";
import { readDepartment } from "@/lib/org/store";
import { readLane, type LaneFile } from "@/lib/org/lane-store";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownPage } from "@/components/portal/markdown-page";
import { ScoreBar, ScorePill } from "@/components/portal/org-score";
import { SectionEditor } from "@/components/org/section-editor";

export const dynamic = "force-dynamic";

/**
 * One lane pack in full — the third ring. Each pack file scored against the lane grammar
 * (`lib/org/lane.ts`), the agent-brief's authority level surfaced as the lane's autonomy,
 * and every file editable with the same live-coaching editor as the department sections.
 */
export default async function LaneDetail({ params }: { params: { dept: string; lane: string } }) {
  const [dept, lane, session] = await Promise.all([
    readDepartment(params.dept),
    readLane(params.dept, params.lane),
    getSession(),
  ]);
  if (!dept || !lane) notFound();
  const canEdit = can(session, "draft");

  return (
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/org" className="hover:text-foreground">Department OS</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/org/${dept.slug}`} className="hover:text-foreground">{dept.name}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{lane.name}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{lane.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A lane of <Link href={`/org/${dept.slug}`} className="underline hover:text-foreground">{dept.name}</Link> — its own playbook, skills, tasks, metrics and autonomy contract.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Pack completeness</div>
          <div className="text-2xl font-semibold"><ScorePill score={lane.score.score} /></div>
          <div className="mt-1">
            {lane.authority ? (
              <Badge variant="secondary" className="font-mono">{lane.authority}</Badge>
            ) : (
              <span className="text-xs text-amber-600">no authority level set</span>
            )}
          </div>
        </div>
      </div>
      <ScoreBar score={lane.score.score} className="mt-3" />

      {lane.dirs.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Also present: {lane.dirs.map((d) => <span key={d} className="font-mono">{d}/ </span>)}
        </p>
      )}

      <div className="mt-6 space-y-5">
        {lane.files.map((f) => (
          <LaneFileCard key={f.key} file={f} slug={dept.slug} laneSlug={lane.slug} laneName={lane.name} canEdit={canEdit} />
        ))}
      </div>
    </main>
  );
}

function LaneFileCard({
  file,
  slug,
  laneSlug,
  laneName,
  canEdit,
}: {
  file: LaneFile;
  slug: string;
  laneSlug: string;
  laneName: string;
  canEdit: boolean;
}) {
  const { score } = file;
  return (
    <Card id={file.key} className="scroll-mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{score.title}</h2>
          <span className="font-mono text-xs text-muted-foreground">{file.key}.md</span>
        </div>
        <div className="flex items-center gap-2">
          <ScorePill score={score.score} />
          {canEdit && (
            <SectionEditor slug={slug} lane={laneSlug} sectionKey={file.key} deptName={laneName} initialSource={file.source} present={score.present} />
          )}
        </div>
      </div>
      <ScoreBar score={score.score} className="mt-2" />

      {!score.present ? (
        <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">Not written yet. {score.coaching}</p>
      ) : (
        <>
          {score.missing.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">
              <div className="font-medium text-amber-800 dark:text-amber-300">To reach full completeness, add:</div>
              <ul className="mt-1 list-disc pl-5 text-amber-800/90 dark:text-amber-300/90">
                {score.missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
              {score.coaching && <p className="mt-2 italic text-amber-800/80 dark:text-amber-300/80">{score.coaching}</p>}
            </div>
          )}
          <div className="mt-4 border-t pt-4"><MarkdownPage body={file.body} /></div>
        </>
      )}
    </Card>
  );
}
