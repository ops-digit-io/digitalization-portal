import { notFound } from "next/navigation";
import Link from "next/link";
import { parseUseCase, parsePeople } from "@/lib/parse";
import { canOpenGate } from "@/lib/gates";
import { exitGate, nextStage } from "@/lib/stages";
import { hasGitHubCredentials } from "@/lib/git";
import { readDemand, readArtifact } from "@/lib/demands-store";
import { StageBadge } from "@/components/portal/stage-badge";
import { GateTimeline, type GateNode } from "@/components/portal/gate-timeline";
import { MarkdownDoc } from "@/components/portal/markdown-doc";
import { GateAction } from "@/components/portal/gate-action";
import { AdvanceStage } from "@/components/portal/advance-stage";
import { HeatDot, LaneBadge, LevelBadge } from "@/components/portal/badges";
import { getSession } from "@/lib/auth/current";
import type { Gate, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const GATE_LABELS: Record<string, string> = {
  G1: "Intake accepted", G2: "Prioritized", G3: "Business case", G4: "POC proven/stop",
  G5: "Pilot proven", G6: "Scale readiness", G7: "Rollout complete",
};
const ALL_GATES: Gate[] = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];

/** Split README into H2 sections, excluding the ones rendered elsewhere. */
function proseSections(markdown: string): { title: string; body: string }[] {
  const parts = markdown.split(/\n(?=## )/);
  const skip = new Set(["state", "gates", "people"]);
  const out: { title: string; body: string }[] = [];
  for (const part of parts) {
    const m = /^##\s+(.+)/.exec(part.trim());
    if (!m || !m[1]) continue;
    const title = m[1].trim();
    if (skip.has(title.toLowerCase())) continue;
    out.push({ title, body: part.replace(/^##\s+.+\n?/, "").trim() });
  }
  return out;
}

/**
 * Load a case's README from the real funnel store — `readDemand` reads du-demands
 * when the GitHub App is configured, else the local working tree. No seed fallback:
 * an id with no funnel record is a 404, never fabricated content.
 */
async function loadCase(id: string): Promise<{ markdown: string; live: boolean } | null> {
  const md = await readDemand(id);
  if (md !== undefined) return { markdown: md, live: hasGitHubCredentials() };
  return null;
}

export default async function UseCasePage({ params }: { params: { id: string } }) {
  const loaded = await loadCase(params.id);
  if (!loaded) notFound();
  const { markdown, live } = loaded;
  const session = await getSession();

  const uc = parseUseCase(markdown);
  const people = parsePeople(markdown);
  // Real business case for this demand (never seed) — gates the simulate link.
  const hasBusinessCase = (await readArtifact(params.id, "business-case")) !== undefined;

  const stage = uc.state.stage as Stage | undefined;
  const plant = uc.state.plant;
  const domain = uc.state.domain;
  const since = uc.state.raw["since"] ?? uc.state.created;
  const now = new Date().toISOString();
  const days = since ? Math.floor((Date.parse(now) - Date.parse(since)) / 86400000) : undefined;

  const gateNodes: GateNode[] = ALL_GATES.map((id) => {
    const g = uc.gates.find((x) => x.id === id);
    const state = (g?.status ?? "pending") as GateNode["state"];
    const node: GateNode = { id, label: GATE_LABELS[id] ?? id, state };
    if (g?.date) node.on = g.date;
    if (g?.by) node.by = g.by;
    return node;
  });

  const openGate = ALL_GATES.find((id) => uc.gates.find((x) => x.id === id)?.status === "open");
  const targetGate = openGate ?? (stage ? exitGate(stage) : undefined);
  const decision = targetGate
    ? canOpenGate(targetGate, { readme: uc, people, actor: session.user })
    : { permitted: false as const, reason: "No open gate." };
  const toStage = stage ? nextStage(stage) : undefined;

  const org = process.env.GITHUB_ORG ?? "org";
  const demandsRepo = process.env.DEMANDS_REPO ?? "du-demands";
  const editHref = live
    ? `https://github.com/${org}/${demandsRepo}/edit/main/demands/${params.id}/README.md`
    : `https://github.com/org/${params.id.toLowerCase()}/edit/main/README.md`;

  const sections = proseSections(markdown);
  const title = uc.title?.split(" · ").slice(1).join(" · ") || uc.title || params.id;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/board" className="hover:text-foreground">Portfolio</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{params.id}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-ok/10 text-ok" : "bg-secondary text-muted-foreground"}`}
          title={live ? `Read live from ${demandsRepo}` : "Read from the local workspace"}
        >
          {live ? `● live · ${demandsRepo}` : "○ local workspace"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {stage && <StageBadge stage={stage} />}
        {uc.state.lane && <LaneBadge lane={uc.state.lane} />}
        {plant && <span>{plant}</span>}
        {domain && <><span aria-hidden>·</span><span>{domain}</span></>}
        {uc.state.level && <LevelBadge level={uc.state.level} />}
        {uc.state.heat && <HeatDot heat={uc.state.heat} />}
        {days !== undefined && <><span aria-hidden>·</span><span>{days} days in stage</span></>}
      </div>

      {uc.needsAttention && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <span className="text-destructive" aria-hidden>⚠</span>
          <span>This case's state couldn't be fully read. Fix the <span className="font-mono">## State</span> section in GitHub.</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-4 rounded-lg border p-4">
            <GateTimeline gates={gateNodes} />
          </div>
          <div>
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground">No prose sections in this case yet.</p>
            )}
            {sections.map((s, i) => (
              <MarkdownDoc
                key={s.title}
                title={s.title}
                body={s.body}
                defaultOpen={i < 2}
                editHref={editHref}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          {/* Stage movement — interactive for live funnel demands, informational for the demo. */}
          {live ? (
            <AdvanceStage
              id={params.id}
              from={stage ?? "—"}
              to={toStage}
              gate={targetGate}
              gateLabel={targetGate ? GATE_LABELS[targetGate] : undefined}
              permitted={decision.permitted}
              reason={decision.permitted ? undefined : decision.reason}
            />
          ) : (
            targetGate && <GateAction gate={targetGate} decision={decision} approvers="Portfolio forum" />
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">People</h2>
            <dl className="space-y-1.5 text-sm">
              {[
                ["Sponsor", people.sponsor],
                ["Value owner", people.value_owner],
                ["Lead", people.lead],
                ["Requester", people.requester],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate">{val ?? <span className="text-muted-foreground">—</span>}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Documents</h2>
            <ul className="space-y-1 text-sm">
              <li>{uc.gates.find((g) => g.id === "G3")?.status === "passed" ? "✓" : "–"} Business case</li>
              <li>{uc.gates.find((g) => g.id === "G4")?.status === "passed" ? "✓" : "–"} POC evaluation</li>
              <li>– Pilot KPI</li>
            </ul>
          </div>

          {hasBusinessCase && (
            <Link
              href={`/uc/${params.id}/simulate`}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium hover:border-foreground/40"
            >
              ⚡ Simulate business case
            </Link>
          )}

          {/* The agentic PoC builder still runs on seed use cases, not the real
              funnel — surfaced as "soon" rather than a flow that can't act on this
              demand. */}
          <div
            className="relative flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium text-muted-foreground opacity-60"
            aria-disabled
            title="The agentic PoC builder is not yet wired to the real funnel"
          >
            🛠 Build PoC with agents
            <span className="absolute right-3 text-[10px] uppercase tracking-wide">soon</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
