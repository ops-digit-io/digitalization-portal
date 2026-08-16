import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { readRegistry } from "@/lib/otx/source";
import {
  parseHandovers,
  loadByService,
  loadByRegion,
  summariseService,
  SEVERITY_TARGET,
  type Severity,
} from "@/lib/otx/service";

export const dynamic = "force-dynamic";

/**
 * Handovers — the run lane as an operated service (docs/06-handover.md).
 *
 * This page used to be a hardcoded empty table with a comment saying it would be
 * "rendered from registry/handovers.md in a real deployment". That was the run
 * lane's whole problem in miniature: a demand went in and nothing came out. It
 * now reads the register and shows the service catalogue, the load per service
 * and the international shape of the work.
 *
 * There is no per-person view here and there will not be one. Load aggregates by
 * service and region; `Team owner` is a team. Constraint #6 is a works-council
 * boundary, and a support queue is exactly where a leaderboard would feel natural
 * and be wrong.
 */

const SEV_TONE: Record<Severity, string> = {
  S1: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  S2: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  S3: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  S4: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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

export default async function Handovers() {
  const rows = parseHandovers(await readRegistry("handovers"));
  const summary = summariseService(rows);
  const services = loadByService(rows);
  const regions = loadByRegion(rows);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Handovers</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">Operations IT Support — run-lane handovers</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Run-lane demand and post-G7 run handovers. Acceptance requires an external reference — without
          it the trail breaks at the boundary. The lane is a service with a catalogue and a team behind
          it, not a drop-off.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No handovers yet. Run-lane demand routed at triage appears here, and the register lives in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">registry/handovers.md</code>.
        </Card>
      ) : (
        <>
          <Card className="mb-4 p-4">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Handovers" value={String(summary.handovers)} hint={`${summary.open} open`} />
              <Stat label="Services" value={String(summary.services)} hint="in the run catalogue" />
              <Stat label="Regions" value={String(summary.regions)} hint="carrying the lane" />
              <Stat
                label="Untraceable"
                value={String(summary.untraceable)}
                hint="no external reference"
              />
              <Stat label="Needs attention" value={String(summary.needsAttention)} hint="rows not fully readable" />
            </dl>
          </Card>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-1 text-sm font-semibold">Service catalogue &amp; load</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                By service, most open first. Response targets: {" "}
                {(Object.keys(SEVERITY_TARGET) as Severity[]).map((s, i) => (
                  <span key={s}>
                    {i > 0 ? " · " : ""}
                    <strong>{s}</strong> {SEVERITY_TARGET[s]}
                  </span>
                ))}
                .
              </p>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 text-right font-medium">Open</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">By severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.service} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{s.service}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.open}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{s.total}</td>
                        <td className="px-3 py-2">
                          <span className="flex gap-1">
                            {s.bySeverity
                              .filter((b) => b.count > 0)
                              .map((b) => (
                                <span key={b.severity} className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEV_TONE[b.severity]}`}>
                                  {b.severity}·{b.count}
                                </span>
                              ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>

            <section>
              <h2 className="mb-1 text-sm font-semibold">The international team</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Where the work sits, by region and owning team. There is no per-person view on this page —
                a gap is a finding about the service, never about a colleague.
              </p>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Region</th>
                      <th className="px-3 py-2 font-medium">Team</th>
                      <th className="px-3 py-2 text-right font-medium">Plants</th>
                      <th className="px-3 py-2 text-right font-medium">Open</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map((r) => (
                      <tr key={r.region} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{r.region}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.teams.join(", ") || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.plants}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.open}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold">The register</h2>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Plant</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium">Sev</th>
                    <th className="px-3 py-2 font-medium">External ref</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap font-medium">
                        {h.id}
                        {h.needsAttention ? (
                          <span
                            className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            title={h.issues.join("; ")}
                          >
                            needs attention
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{h.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{h.plant}</td>
                      <td className="px-3 py-2 text-xs">{h.service}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{h.teamOwner}</td>
                      <td className="px-3 py-2">
                        {h.severity ? (
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEV_TONE[h.severity]}`}>{h.severity}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">?</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{h.externalRef || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="font-normal">{h.status || "—"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Source of record: <code className="rounded bg-muted px-1 py-0.5">registry/handovers.md</code> — markdown
        in git. No per-person analytics anywhere on this page (constraint #6).
      </p>
    </main>
  );
}
