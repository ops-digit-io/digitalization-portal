import Link from "next/link";
import { readFramework } from "@/lib/org/store";
import { getT } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { MarkdownPage } from "@/components/portal/markdown-page";

export const dynamic = "force-dynamic";

/**
 * The Department OS framework itself, read-only — the method behind the org map. A
 * static route, so it takes precedence over the `[dept]` segment for the "framework"
 * slug. Read live from `du-organization-context`, else the bundled copy.
 */
export default async function FrameworkPage() {
  const { t } = getT();
  const framework = await readFramework();

  return (
    <main className="mx-auto max-w-[900px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/org" className="hover:text-foreground">{t("org.title")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("org.framework")}</span>
      </nav>

      {framework ? (
        <Card className="p-6">
          <MarkdownPage body={framework} />
        </Card>
      ) : (
        <Card className="p-10 text-center text-sm text-muted-foreground">{t("org.frameworkUnreachable")}</Card>
      )}
    </main>
  );
}
