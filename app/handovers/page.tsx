import { Card } from "@/components/ui/card";

/**
 * Handovers — run-lane and G7 run handover records (docs/06-handover.md).
 * Rendered from registry/handovers.md in a real deployment; seeded empty here.
 */
export default function Handovers() {
  const rows: { id: string; title: string; plant: string; ref: string; status: string }[] = [];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <h1 className="text-lg font-semibold">Handovers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Run-lane demand and post-G7 run handovers. Acceptance requires an external
        reference — without it the trail breaks at the boundary.
      </p>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Plant</th>
                <th className="px-4 py-2 font-medium">External ref</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No handovers yet. Run-lane demand routed at triage will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
