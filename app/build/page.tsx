import Link from "next/link";
import { listDemandRows } from "@/lib/demands-store";
import { hasGitHubCredentials } from "@/lib/git";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/portal/stage-badge";
import { LaneBadge } from "@/components/portal/badges";
import type { Lane } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Agentic PoC Builder index — now wired to the real funnel. Lists active demands
 * (du-demands live, else the local workspace) and links each to its per-case PoC
 * flow (`/uc/[id]/poc`), which scaffolds a repo, drafts a spec for approval, then
 * opens a pull request. It never merges.
 */
export default async function BuildIndex() {
  const live = hasGitHubCredentials();
  const rows = (await listDemandRows()).filter((r) => (r.status ?? "active") === "active");

  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Agentic PoC Builder</span>
      </nav>
      <h1 className="text-lg font-semibold">Agentic PoC Builder</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a demand and the assistant creates a repository, drafts a spec for your
        approval, then builds the artifact and opens a pull request — it never merges.
      </p>

      {rows.length === 0 ? (
        <Card className="mt-5 p-8 text-center">
          <div className="text-2xl" aria-hidden>🛠</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            No active demands to build from yet. Capture one in{" "}
            <Link href="/intake" className="underline">Intake</Link> and advance it through{" "}
            <Link href="/triage" className="underline">Triage</Link>.
          </p>
        </Card>
      ) : (
        <Card className="mt-5 divide-y p-0">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/uc/${r.id}/poc`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                  {r.stage && <StageBadge stage={r.stage} />}
                  {r.lane && <LaneBadge lane={r.lane as Lane} />}
                  {r.plant && <span className="text-xs text-muted-foreground">{r.plant}</span>}
                </div>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">Build PoC →</span>
            </Link>
          ))}
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {live ? "Reading live from du-demands." : "Reading from the local workspace — configure the GitHub App for the live funnel."}
      </p>
    </main>
  );
}
