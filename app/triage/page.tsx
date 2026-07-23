import Link from "next/link";
import { SEED_ROWS } from "@/lib/seed";
import { Card } from "@/components/ui/card";
import { LaneBadge } from "@/components/portal/badges";
import { StageBadge } from "@/components/portal/stage-badge";
import type { Stage } from "@/lib/types";

/** Triage — the intake acceptance / lane-confirm queue (docs/05, docs/16 §16.5). */
export default function Triage() {
  const queue = SEED_ROWS.filter((r) => r.stage === "S1" || r.stage === "S2");

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Triage</span>
      </nav>
      <h1 className="text-lg font-semibold">Triage</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accept intake (G1) and confirm the lane, sponsor, and priority (G2). Every
        rejection carries a reason and a reroute-to-backlog — never silent closure.
      </p>

      <div className="mt-5 space-y-2">
        {queue.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">The triage queue is empty.</Card>
        )}
        {queue.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">{r.id} · {r.plant ?? "—"}</div>
              <Link href={`/uc/${r.id}`} className="truncate font-medium hover:underline">{r.title}</Link>
            </div>
            {r.stage && <StageBadge stage={r.stage as Stage} />}
            {r.lane && <LaneBadge lane={r.lane} />}
            <div className="flex gap-1.5 text-xs">
              <span className="rounded-md border px-2 py-1 text-muted-foreground">Accept</span>
              <span className="rounded-md border px-2 py-1 text-muted-foreground">Assign lane</span>
              <span className="rounded-md border px-2 py-1 text-muted-foreground">Reject with reason</span>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Keyboard-first triage (j/k, 1–7 to assign a lane, Enter to accept) lands with M3 write paths.
      </p>
    </main>
  );
}
