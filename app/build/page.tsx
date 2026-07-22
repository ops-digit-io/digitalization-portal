import Link from "next/link";
import { SEED_ROWS } from "@/lib/seed";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/portal/stage-badge";
import type { Stage } from "@/lib/types";

export default function BuildIndex() {
  const rows = SEED_ROWS.filter((r) => r.status !== "parked");
  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <h1 className="text-lg font-semibold">Agentic PoC Builder</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a use case. The assistant creates a repository, drafts a spec for your
        approval, then builds the artifact and opens a pull request — it never merges.
      </p>

      <div className="mt-5 space-y-2">
        {rows.map((r) => (
          <Link key={r.id} href={`/uc/${r.id}/poc`}>
            <Card className="flex items-center gap-4 p-4 transition-colors hover:border-foreground/20">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{r.id}</div>
                <div className="truncate font-medium">{r.title}</div>
              </div>
              {r.stage && <StageBadge stage={r.stage as Stage} />}
              <span className="text-sm text-muted-foreground">Build →</span>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
