import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import {
  parseLandscape,
  parsePlants,
  parseUns,
  maturityByPlant,
  blockers,
  summarise,
  unsConventionProgress,
  integrationRank,
  ISA_LEVELS,
  INTEGRATION_STATES,
  MAX_INTEGRATION_RANK,
  type SystemRow,
  type PlantRow,
} from "@/lib/otx/landscape";

export const dynamic = "force-dynamic";

/**
 * System landscape & Unified Namespace — the as-is of the IT/OT roadmap.
 *
 * The page leads with the BACKLOG, not the inventory, because the inventory is
 * not the finding. The finding is that the process funnel already refuses to
 * optimise a process whose systems cannot be read (`K2.2`, `K5.1`, branch `Z1b`)
 * and, until this page existed, nothing recorded which system caused it. The
 * blocked list IS the UNS roadmap, ordered by how much each system denies.
 */

const TONE: Record<string, string> = {
  "uns-modelled": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "broker-published": "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "point-to-point": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "file-export": "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  none: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A level cell in the plant × ISA-95 matrix: mean maturity, shaded, with the blocked count. */
function LevelCell({ rank, blocked }: { rank: number | null; blocked: number }) {
  if (rank === null) {
    return <td className="px-2 py-2 text-center text-xs text-muted-foreground/40">—</td>;
  }
  const pct = Math.round((rank / MAX_INTEGRATION_RANK) * 100);
  const band = pct >= 75 ? TONE["uns-modelled"] : pct >= 50 ? TONE["point-to-point"] : TONE.none;
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-flex min-w-[3rem] items-center justify-center gap-1 rounded px-1.5 py-1 text-xs font-medium tabular-nums ${band}`}>
        {pct}%
        {blocked > 0 ? <span title={`${blocked} system(s) with no readable interface`}>·{blocked}</span> : null}
      </span>
    </td>
  );
}

export default async function LandscapePage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">System landscape</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const [landscapeMd, plantsMd, unsMd] = await Promise.all([
    readRegistry("landscape"),
    readRegistry("plants"),
    readRegistry("uns"),
  ]);

  const systems: SystemRow[] = parseLandscape(landscapeMd);
  const plants: PlantRow[] = parsePlants(plantsMd);
  const uns = parseUns(unsMd);
  const summary = summarise(systems);
  const perPlant = maturityByPlant(systems);
  const backlog = blockers(systems);
  const convention = unsConventionProgress(uns);
  const plantMeta = new Map(plants.map((p) => [p.code, p]));

  if (systems.length === 0) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">System landscape</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          No landscape recorded yet. The inventory lives in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/landscape.md</code> — one row per plant ×
          system, edited by hand in git. Add rows there and they appear here.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">System landscape</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">System landscape &amp; Unified Namespace</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          What runs in each plant, at which ISA-95 level, and how far its data has travelled towards the
          namespace. Maturity is derived from the integration column, never stored — so it cannot drift
          from the rows a human edits.
        </p>
      </header>

      <Card className="mb-4 p-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Plants" value={String(summary.plants)} hint={`${summary.systems} systems inventoried`} />
          <Stat
            label="Mean maturity"
            value={summary.meanMaturity === null ? "—" : `${summary.meanMaturity}%`}
            hint="across plants with systems"
          />
          <Stat
            label="Unreadable"
            value={String(summary.blocked)}
            hint="systems blocking K2.2"
          />
          <Stat
            label="On the namespace"
            value={`${summary.withNamespace}/${summary.plants}`}
            hint="plants with a modelled topic tree"
          />
          <Stat
            label="Convention"
            value={convention.percent === null ? "—" : `${convention.percent}%`}
            hint={`${convention.published} published · ${convention.agreed} agreed · ${convention.proposed} proposed`}
          />
        </dl>
      </Card>

      {/* The finding comes first: which systems deny data, and to how much. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">The UNS backlog — systems nobody can read</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          These are the funnel&apos;s <strong>K2.2 Interface-Zugänglichkeit</strong> failures, as data. An
          engagement touching one of them cannot pass the diagnostics gate — and per branch{" "}
          <strong>Z1b</strong>, an inaccessible interface &ldquo;zahlt per Compounding auf jeden weiteren
          Prozess am selben System ein&rdquo;. Higher ISA-95 levels come first: a blocked L3 historian denies
          data to the whole plant, a blocked L1 controller to one line.
        </p>
        {backlog.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Every inventoried system has a readable interface. Nothing is blocking K2.2.
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Plant</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">System</th>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Barrier</th>
                </tr>
              </thead>
              <tbody>
                {backlog.map((b, i) => (
                  <tr key={`${b.plant}-${b.system}-${i}`} className="border-b last:border-0">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{b.rank}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">{b.plant}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{plantMeta.get(b.plant)?.region ?? ""}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="font-normal">{b.level || "—"}</Badge>
                    </td>
                    <td className="px-3 py-2">{b.system || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.vendor}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{b.barrier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Then the map: where each plant stands, per level. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Maturity by plant and ISA-95 level</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          Percentages are the mean integration state at that level ({INTEGRATION_STATES.join(" → ")}). A
          suffix after the dot is the number of systems there with no readable interface. Most-blocked
          plants first.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium">Role</th>
                {ISA_LEVELS.slice().reverse().map((l) => (
                  <th key={l} className="px-2 py-2 text-center font-medium">{l}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Overall</th>
              </tr>
            </thead>
            <tbody>
              {perPlant.map((p) => {
                const meta = plantMeta.get(p.plant);
                const byLevel = new Map(p.byLevel.map((l) => [l.level, l]));
                return (
                  <tr key={p.plant} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium">{p.plant}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{meta?.name ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{meta?.region ?? "—"}</td>
                    <td className="px-3 py-2">
                      {meta?.siteRole ? (
                        <Badge variant="secondary" className="font-normal">{meta.siteRole}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {ISA_LEVELS.slice().reverse().map((l) => {
                      const lm = byLevel.get(l);
                      return <LevelCell key={l} rank={lm?.rank ?? null} blocked={lm?.blocked ?? 0} />;
                    })}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {p.maturity === null ? "—" : `${p.maturity}%`}
                      {p.hasNamespace ? <span className="ml-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400" title="Has a modelled namespace">◆</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* The to-be: the convention itself. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">The namespace convention</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
          A Unified Namespace is an agreed grammar, not a broker. This is the grammar and how far it has
          got — <code className="rounded bg-muted px-1 py-0.5">registry/uns.md</code>.
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Example topic</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Standard</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {uns.map((u, i) => (
                <tr key={`${u.level}-${u.segment}-${i}`} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{u.level}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.example}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.owner}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.standardRef}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        u.status === "published"
                          ? TONE["uns-modelled"]
                          : u.status === "agreed"
                            ? TONE["point-to-point"]
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.status || "unreadable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* The full inventory, last — it is reference, not a finding. */}
      <section className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Inventory</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {summary.systems} systems.{" "}
          {summary.needsAttention > 0 ? (
            <span className="text-amber-700 dark:text-amber-400">
              {summary.needsAttention} row(s) could not be fully read — they are kept and marked, never dropped.
            </span>
          ) : null}
        </p>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Plant</th>
                <th className="px-3 py-2 font-medium">Lvl</th>
                <th className="px-3 py-2 font-medium">System</th>
                <th className="px-3 py-2 font-medium">Integration</th>
                <th className="px-3 py-2 font-medium">Interface</th>
                <th className="px-3 py-2 font-medium">Topic root</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Fresh</th>
              </tr>
            </thead>
            <tbody>
              {systems
                .slice()
                .sort(
                  (a, b) =>
                    (a.plant < b.plant ? -1 : a.plant > b.plant ? 1 : 0) ||
                    integrationRank(b.integration) - integrationRank(a.integration),
                )
                .map((s, i) => (
                  <tr key={`${s.plant}-${s.system}-${i}`} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{s.plant}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.level || "?"}</td>
                    <td className="px-3 py-2">
                      {s.system}
                      {s.needsAttention ? (
                        <span
                          className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          title={s.issues.join("; ")}
                        >
                          needs attention
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TONE[s.integration] ?? "bg-muted text-muted-foreground"}`}>
                        {s.integration || "unreadable"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{s.iface || "?"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.topicRoot || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.dataOwner}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.freshness}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Source of record: <code className="rounded bg-muted px-1 py-0.5">registry/landscape.md</code>,{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/uns.md</code> and{" "}
        <code className="rounded bg-muted px-1 py-0.5">registry/plants.md</code> — markdown in git, edited by hand.
        This page derives; it never writes.
      </p>
    </main>
  );
}
