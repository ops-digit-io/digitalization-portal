import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import {
  loadRequestorRecords, buildCohortPatterns, listRequestorDirectory, normalizeRequester,
} from "@/lib/persona";
import { ShareBars, Chips, EthicsNote } from "./shared";

export const dynamic = "force-dynamic";

/**
 * Persona Analyst — requestor-centric screening. Aggregate cohort patterns are shown
 * to anyone who may view the board; the individual requestor directory is restricted
 * to `view_all` holders (a profile aggregates a named individual's demands). A
 * requestor without `view_all` is offered only their own profile.
 */
const COHORT_DIMENSIONS = [
  { key: "domain", label: "Domain" },
  { key: "lane", label: "Lane" },
  { key: "plant", label: "Plant" },
] as const;
type CohortDimension = (typeof COHORT_DIMENSIONS)[number]["key"];

export default async function PersonasPage({ searchParams }: { searchParams: { by?: string } }) {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Persona Analyst</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const by: CohortDimension = COHORT_DIMENSIONS.some((d) => d.key === searchParams.by)
    ? (searchParams.by as CohortDimension)
    : "domain";
  const viewAll = can(session, "view_all");
  const records = await loadRequestorRecords();
  const cohorts = buildCohortPatterns(records, by);
  const directory = viewAll ? listRequestorDirectory(records) : [];
  const mine = normalizeRequester(session.user);
  const iHaveDemands = records.some((r) => normalizeRequester(r.requester) === mine);

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Persona Analyst</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Persona Analyst</h1>
          <p className="text-sm text-muted-foreground">
            Understand requestors — their role, jobs, daily workflows, and the digitalization they need — to serve them better.
          </p>
        </div>
      </div>
      <div className="mt-3"><EthicsNote /></div>

      {iHaveDemands && (
        <Card className="mt-6 flex items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-sm font-semibold">Your profile</h2>
            <p className="text-xs text-muted-foreground">See how your own demands read — the work and support they point to.</p>
          </div>
          <Link href={`/personas/${encodeURIComponent(mine)}`} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:border-foreground/40">
            View →
          </Link>
        </Card>
      )}

      {/* Cohort patterns — aggregate, never a person. */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Cohort patterns by {by}</h2>
          <div className="inline-flex rounded-md border p-0.5 text-xs" role="tablist" aria-label="Group cohorts by">
            {COHORT_DIMENSIONS.map((d) => (
              <Link
                key={d.key}
                href={d.key === "domain" ? "/personas" : `/personas?by=${d.key}`}
                role="tab"
                aria-selected={by === d.key}
                className={`rounded px-2.5 py-1 font-medium ${by === d.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {d.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          Aggregate across requestor groups (≥2 requestors each) — what each {by}&apos;s requestors tend to need.
        </p>
        {cohorts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough demand yet to show cohort patterns.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cohorts.map((c) => (
              <Card key={c.key} className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize">{c.key}</h3>
                  <span className="text-xs text-muted-foreground">{c.requestorCount} requestors · {c.demandCount} demands</span>
                </div>
                <p className="mt-3 text-xs font-medium text-muted-foreground">Solution shapes they need</p>
                <div className="mt-1"><ShareBars items={c.topArchetypes} /></div>
                {c.topThemes.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-medium text-muted-foreground">Recurring themes</p>
                    <div className="mt-1"><Chips items={c.topThemes} /></div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Requestor directory — alphabetical, restricted to view_all. */}
      {viewAll && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Requestors</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            A directory, sorted by name — deliberately not a leaderboard.
          </p>
          {directory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requestors on record yet.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {directory.map((d) => (
                <Link
                  key={d.requester}
                  href={`/personas/${encodeURIComponent(normalizeRequester(d.requester))}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40"
                >
                  <span className="truncate text-sm font-medium">{d.requester}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {d.topDomain && <span className="capitalize">{d.topDomain}</span>}
                    {d.topArchetype && <span className="hidden sm:inline">· {d.topArchetype}</span>}
                    <span>· {d.demandCount} demand{d.demandCount === 1 ? "" : "s"}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
