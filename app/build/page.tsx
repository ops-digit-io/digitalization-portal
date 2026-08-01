import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getT } from "@/lib/i18n-server";

/**
 * Agentic PoC Builder — not yet wired to the real funnel (the scaffolding flow and
 * `/api/poc` still operate on seed use cases), so it is surfaced as "soon" rather
 * than listing artificial data. It lands once the PoC flow reads real demands.
 */
export default function BuildIndex() {
  const t = getT();
  return (
    <main className="mx-auto max-w-[900px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("build.title", "Agentic PoC Builder")}</span>
      </nav>
      <h1 className="text-lg font-semibold">{t("build.title", "Agentic PoC Builder")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("build.intro", "Pick a demand and the assistant creates a repository, drafts a spec for your approval, then builds the artifact and opens a pull request — it never merges.")}
      </p>

      <Card className="mt-5 p-8 text-center">
        <div className="text-2xl" aria-hidden>🛠</div>
        <div className="mt-2 text-sm font-medium">{t("build.comingSoon", "Coming soon")}</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {t("build.notWired", "The PoC builder isn't wired to the real funnel yet, so it isn't shown with sample data. Capture demands in")} <Link href="/intake" className="underline">{t("nav.intake", "Intake")}</Link> {t("build.and", "and advance them through")} <Link href="/triage" className="underline">{t("nav.triage", "Triage")}</Link> {t("build.inMeantime", "in the meantime.")}
        </p>
      </Card>
    </main>
  );
}
