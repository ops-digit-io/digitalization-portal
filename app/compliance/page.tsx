import Link from "next/link";
import { SEED_ROWS } from "@/lib/seed";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * EU AI Act register (docs/14-compliance.md). Flags AI-containing use cases that
 * need a classification field. Classification applies to demands, never to people;
 * there is deliberately no per-requester analytics anywhere in the portal.
 */
export default function Compliance() {
  // Data/AI-lane use cases are the AI-containing ones needing a classification.
  const aiRows = SEED_ROWS.filter((r) => r.lane === "data_ai");
  const others = SEED_ROWS.filter((r) => r.lane !== "data_ai");

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">EU AI Act register</span>
      </nav>
      <h1 className="text-lg font-semibold">EU AI Act register</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-containing use cases carry an AI Act classification, added before their
        first AI use reaches G3. Classification applies to demands, never to people.
      </p>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">AI-containing use cases</div>
        <ul className="divide-y">
          {aiRows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{r.id} · {r.plant ?? "—"}</div>
                <Link href={`/uc/${r.id}`} className="truncate font-medium hover:underline">{r.title}</Link>
              </div>
              <Badge variant="outline">classification: needs input</Badge>
              <Badge variant="secondary" className="font-normal">data / AI</Badge>
            </li>
          ))}
          {aiRows.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">No AI-containing use cases.</li>}
        </ul>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">AI use cases</div><div className="mt-1 text-2xl font-semibold">{aiRows.length}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Non-AI</div><div className="mt-1 text-2xl font-semibold">{others.length}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Worker evaluation</div><div className="mt-1 text-2xl font-semibold">0</div><div className="text-xs text-muted-foreground">prohibited by design</div></Card>
      </div>
    </main>
  );
}
