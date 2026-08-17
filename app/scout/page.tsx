import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { readRegistry } from "@/lib/otx/source";
import { parseLandscape, blockers } from "@/lib/otx/landscape";
import { parseTechnology } from "@/lib/otx/rollout";
import { Sweep } from "./sweep";

export const dynamic = "force-dynamic";

/**
 * Technology scout — discovery. `/rollout` is decision.
 *
 * The page states its own gaps before a sweep runs, because the fit score is
 * computed from exactly those and a reader should be able to see what the number
 * will be measured against.
 *
 * On injection: this is the one surface in the portal that reads vendor
 * marketing, which makes it the live prompt-injection target rather than a
 * hypothetical one. With provider-side web search the portal never sees the
 * fetched pages, so `lib/agent/wrap.ts` cannot fence them and the model's
 * judgment has to be treated as corruptible. What contains it is structural, not
 * a filter: fit is computed from the registry and never reads model output, the
 * ranking sorts on fit, an accepted candidate lands as `assess` in a pull request
 * a human merges, and the rollout invariant refuses to scale anything short of
 * `adopt`. The worst a successful injection achieves is a plausible row a human
 * then declines.
 */
export default async function ScoutPage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Technology scout</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const [landscapeMd, techMd] = await Promise.all([readRegistry("landscape"), readRegistry("technology")]);
  const systems = parseLandscape(landscapeMd);
  const known = parseTechnology(techMd);
  const backlog = blockers(systems);
  const topLayers = [...new Set(backlog.map((b) => b.level).filter((l) => l !== ""))];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Technology scout</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">Technology scout</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Sweeps public sources for technologies that could change what the plants can do, and scores each
          one twice — once on what a model thinks of it, once on what this portfolio can{" "}
          <em>prove</em> it needs. The two are never combined.
        </p>
      </header>

      <Card className="mb-4 p-4">
        <h2 className="text-sm font-semibold">What a candidate will be measured against</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The fit score is computed from the registry below, not from anything a vendor page says. This is
          the whole of its input.
        </p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unreadable systems</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{backlog.length}</dd>
            <p className="mt-0.5 text-xs text-muted-foreground">
              across {new Set(backlog.map((b) => b.plant)).size} plants
              {topLayers.length > 0 ? `, at ${topLayers.join(", ")}` : ""}
            </p>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Already decided</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{known.filter((t) => t.status === "adopt").length}</dd>
            <p className="mt-0.5 text-xs text-muted-foreground">
              adopted standards a candidate would have to beat
            </p>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">In the register</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{known.length}</dd>
            <p className="mt-0.5 text-xs text-muted-foreground">dropped from results if the sweep repeats them</p>
          </div>
        </dl>
      </Card>

      <Sweep />

      <p className="mt-6 text-xs text-muted-foreground">
        Discovery only. Decision lives in{" "}
        <Link href="/rollout" className="underline hover:text-foreground">Rollout</Link>, and the gaps this
        scores against are the{" "}
        <Link href="/landscape" className="underline hover:text-foreground">system landscape</Link>. Pages the
        sweep reads are treated as data, never instructions — and because the fit score never reads model
        output, a page that tries to talk its way up the ranking cannot.
      </p>
    </main>
  );
}
