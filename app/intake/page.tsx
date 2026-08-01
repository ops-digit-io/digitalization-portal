import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default function IntakeChooser() {
  const t = getT();

  const TOOLS = [
    {
      href: "/intake/chat",
      title: t("intake.chooser.chat.title", "Chat"),
      glyph: "💬",
      desc: t("intake.chooser.chat.desc", "An AI interview — answer a few short questions in a conversation. Best when you'd rather just describe the problem."),
    },
    {
      href: "/intake/form",
      title: t("intake.chooser.form.title", "Form"),
      glyph: "📝",
      desc: t("intake.chooser.form.desc", "A plain form — fill the fields directly. Best when you already know what to write and want to move fast."),
    },
    {
      href: "/intake/md",
      title: "Markdown",
      glyph: "</>",
      desc: t("intake.chooser.md.desc", "Write the demand page as markdown from the template. Best for power users who want full control of the text."),
    },
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("intake.title", "Intake")}</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("intake.chooser.title", "Capture a demand")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("intake.chooser.introPrefix", "Three ways in — pick whichever suits you. They all produce the")} <span className="font-medium text-foreground">{t("intake.chooser.sameDemandPage", "same demand page")}</span>{t("intake.chooser.introSuffix", ", one markdown file in the central intake repo, rendered by the same deterministic builder.")}
          </p>
        </div>
        <Badge variant="secondary" className="font-normal text-muted-foreground">{t("intake.chooser.badge", "same output, any tool")}</Badge>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="flex h-full flex-col p-5 transition-colors hover:border-foreground/30 hover:bg-secondary/30">
              <div className="text-2xl" aria-hidden>{tool.glyph}</div>
              <h2 className="mt-3 text-base font-semibold">{tool.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{tool.desc}</p>
              <span className="mt-4 text-sm font-medium text-foreground">{t("common.open", "Open")} {tool.title} →</span>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {t("intake.chooser.footer", "Whichever you use: the demand opens at S1 with G1 open, awaiting triage. No repository is created here — a demand earns its own repo only at the PoC stage. See")} <Link href="/demands" className="underline">{t("intake.chooser.allDemands", "all demands")}</Link>.
      </p>
    </main>
  );
}
