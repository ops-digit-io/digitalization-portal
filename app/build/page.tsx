import Link from "next/link";
import { Card } from "@/components/ui/card";

/**
 * Agentic PoC Builder — not yet wired to the real funnel (the scaffolding flow and
 * `/api/poc` still operate on seed use cases), so it is surfaced as "soon" rather
 * than listing artificial data. It lands once the PoC flow reads real demands.
 */
export default function BuildIndex() {
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

      <Card className="mt-5 p-8 text-center">
        <div className="text-2xl" aria-hidden>🛠</div>
        <div className="mt-2 text-sm font-medium">Coming soon</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The PoC builder isn&apos;t wired to the real funnel yet, so it isn&apos;t shown with
          sample data. Capture demands in <Link href="/intake" className="underline">Intake</Link> and
          advance them through <Link href="/triage" className="underline">Triage</Link> in the meantime.
        </p>
      </Card>
    </main>
  );
}
