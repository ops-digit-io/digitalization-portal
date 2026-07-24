import Link from "next/link";
import { listDemandRows } from "@/lib/demands-store";
import { exitGate } from "@/lib/stages";
import { Card } from "@/components/ui/card";
import { LaneBadge } from "@/components/portal/badges";
import { StageBadge } from "@/components/portal/stage-badge";
import { Badge } from "@/components/ui/badge";
import { TriageActions } from "./actions";
import type { Lane, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const GATE_LABELS: Record<string, string> = {
  G1: "Intake accepted", G2: "Prioritized",
};

/** Triage — the intake acceptance / lane-confirm queue (docs/05, docs/16 §16.5). */
export default async function Triage() {
  // Read the LIVE funnel (du-demands, or the local working tree) so a demand
  // captured through intake actually reaches the acceptance queue — not static seed.
  const rows = await listDemandRows();
  const queue = rows
    .filter((r) => r.stage === "S1" || r.stage === "S2")
    .sort((a, b) => (a.since ?? "").localeCompare(b.since ?? ""));

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Triage</span>
      </nav>
      <h1 className="text-lg font-semibold">Triage</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accept intake (G1) and confirm the lane, sponsor, and priority (G2). Accepting
        records the gate passage in <span className="font-mono">du-demands</span> and moves
        the demand to the next stage. Rejections carry a reason and a reroute — never silent closure.
      </p>

      <div className="mt-5 space-y-2">
        {queue.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            The triage queue is empty. <Link href="/intake" className="underline">Capture a demand</Link> and it lands here.
          </Card>
        )}
        {queue.map((r) => {
          const gate = r.stage ? exitGate(r.stage as Stage) : undefined;
          return (
            <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{r.id} · {r.plant ?? "—"}</div>
                <Link href={`/uc/${r.id}`} className="truncate font-medium hover:underline">{r.title}</Link>
              </div>
              {r.stage && <StageBadge stage={r.stage as Stage} />}
              {r.lane ? <LaneBadge lane={r.lane as Lane} /> : <Badge variant="outline" className="font-normal text-muted-foreground">unassigned</Badge>}
              <TriageActions id={r.id} gate={gate} gateLabel={gate ? GATE_LABELS[gate] : undefined} />
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Keyboard-first triage (j/k, 1–7 to assign a lane, Enter to accept) and lane/reject write paths land with M3.
      </p>
    </main>
  );
}
