import Link from "next/link";
import { buildDigest } from "@/lib/digest/service";
import { REASON_LABEL, type Severity } from "@/lib/digest/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const SEV_TONE: Record<Severity, string> = { high: "--destructive", medium: "--warn", low: "--muted-foreground" };

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={tone ? { color: `hsl(var(${tone}))` } : undefined}>{value}</div>
    </Card>
  );
}

export default async function DigestPage() {
  const digest = await buildDigest(new Date().toISOString());
  const s = digest.summary;

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Review Digest</span>
      </nav>
      <h1 className="text-lg font-semibold">Review Digest</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Demands that need a human to look — stalled, past their review date, missing an owner, or unreadable.
        Surfaced for the forum to judge, never auto-enforced. A weekly email digest goes out Monday 07:00 when configured.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Flagged" value={s.flagged} />
        <Tile label="High" value={s.bySeverity.high} tone="--destructive" />
        <Tile label="Medium" value={s.bySeverity.medium} tone="--warn" />
        <Tile label="Low" value={s.bySeverity.low} />
      </div>

      {s.flagged === 0 ? (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          Nothing needs attention — the funnel is healthy. 🎉
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2.5 font-medium">Demand</th>
                <th className="px-4 py-2.5 font-medium">Why</th>
                <th className="px-4 py-2.5 font-medium">Age</th>
                <th className="px-4 py-2.5 font-medium">Accountable</th>
              </tr>
            </thead>
            <tbody>
              {digest.items.map((item) => (
                <tr key={item.id} className="border-b align-top last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <Link href={`/uc/${item.id}`} className="font-medium hover:underline">{item.title}</Link>
                    <div className="font-mono text-xs text-muted-foreground">
                      {item.id}{item.stage ? ` · ${item.stage}` : ""}{item.plant ? ` · ${item.plant}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {item.reasons.map((r) => (
                        <Badge key={r} variant="outline" className="font-normal" style={{ color: `hsl(var(${SEV_TONE[item.severity]}))`, borderColor: `hsl(var(${SEV_TONE[item.severity]}) / 0.4)` }}>
                          {REASON_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {item.ageDays !== undefined ? `${item.ageDays}d` : "—"}
                    {item.overdueDays !== undefined ? <span className="text-warn"> · +{item.overdueDays}d</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {item.accountable.length > 0
                      ? item.accountable.map((a) => `${a.person} (${a.role.replace(/_/g, " ")})`).join(", ")
                      : <span className="text-warn">no one named</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {digest.byPerson.length} accountable {digest.byPerson.length === 1 ? "person" : "people"} across the flagged demands.
        Configure <span className="font-mono">EMAIL_API_KEY</span> + <span className="font-mono">DIGEST_TEAM_EMAIL</span> to send the weekly email.
      </p>
    </main>
  );
}
