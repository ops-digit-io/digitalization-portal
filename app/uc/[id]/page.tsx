import { notFound } from "next/navigation";
import Link from "next/link";
import { parseUseCase, parsePeople } from "@/lib/parse";
import { canOpenGate } from "@/lib/gates";
import { exitGate } from "@/lib/stages";
import { StageBadge } from "@/components/portal/stage-badge";
import { GateTimeline, type GateNode } from "@/components/portal/gate-timeline";
import { MarkdownDoc } from "@/components/portal/markdown-doc";
import { GateAction } from "@/components/portal/gate-action";
import { HeatDot, LaneBadge, LevelBadge } from "@/components/portal/badges";
import { SEED_README, SEED_ROWS, SEED_BUSINESS_CASE, buildStubReadme, DEMO_SESSION } from "@/lib/seed";
import type { Gate, Stage } from "@/lib/types";

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

export default function UseCasePage({ params }: { params: { id: string } }) {
  const row = SEED_ROWS.find((r) => r.id === params.id);
  if (!row) notFound();

  const markdown = SEED_README[params.id] ?? buildStubReadme(row);
  const uc = parseUseCase(markdown);
  const people = parsePeople(markdown);

  const gateNodes: GateNode[] = ALL_GATES.map((id) => {
    const g = uc.gates.find((x) => x.id === id);
    const state = (g?.status ?? "pending") as GateNode["state"];
    const node: GateNode = { id, label: GATE_LABELS[id] ?? id, state };
    if (g?.date) node.on = g.date;
    if (g?.by) node.by = g.by;
    return node;
  });

  const openGate = ALL_GATES.find((id) => uc.gates.find((x) => x.id === id)?.status === "open");
  const targetGate = openGate ?? (uc.state.stage ? exitGate(uc.state.stage as Stage) : undefined);
  const decision = targetGate
    ? canOpenGate(targetGate, { readme: uc, people, actor: DEMO_SESSION.user })
    : { permitted: false as const, reason: "No open gate." };

  const sections = proseSections(markdown);
  const days = row.since
    ? Math.floor((Date.parse("2026-05-19T09:00:00Z") - Date.parse(row.since)) / 86400000)
    : undefined;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/board" className="hover:text-foreground">Portfolio</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{uc.title?.split(" · ")[0] ?? row.id}</span>
      </nav>

      <h1 className="text-xl font-semibold">{uc.title?.split(" · ").slice(1).join(" · ") ?? row.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {uc.state.stage && <StageBadge stage={uc.state.stage as Stage} />}
        {uc.state.lane && <LaneBadge lane={uc.state.lane} />}
        {row.plant && <span>{row.plant}</span>}
        {row.domain && <><span aria-hidden>·</span><span>{row.domain}</span></>}
        {uc.state.level && <LevelBadge level={uc.state.level} />}
        {uc.state.heat && <HeatDot heat={uc.state.heat} />}
        {days !== undefined && <><span aria-hidden>·</span><span>{days} days</span></>}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-4 rounded-lg border p-4">
            <GateTimeline gates={gateNodes} />
          </div>
          <div>
            {sections.map((s, i) => (
              <MarkdownDoc
                key={s.title}
                title={s.title}
                body={s.body}
                defaultOpen={i < 2}
                editHref={`https://github.com/org/${row.id.toLowerCase()}/edit/main/README.md`}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
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

          {targetGate && (
            <GateAction gate={targetGate} decision={decision} approvers="Portfolio forum" />
          )}

          {SEED_BUSINESS_CASE[params.id] && (
            <Link
              href={`/uc/${params.id}/simulate`}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium hover:border-foreground/40"
            >
              ⚡ Simulate business case
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
