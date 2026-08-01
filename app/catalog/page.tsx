import Link from "next/link";
import { listRegistry, type RegistryEntry } from "@/lib/registry-store";
import { getT, type TFn } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Reference-skill import lives in the dedicated Skill Library tool (/skill-library),
// kept out of the registry so this stays focused on checking & adjusting skills.

export const dynamic = "force-dynamic";

function EntryCard({ e, t }: { e: RegistryEntry; t: TFn }) {
  const tags = [...e.capabilities, ...e.tools, ...e.skills].slice(0, 4);
  return (
    <Link href={`/catalog/${e.type}/${e.name}`}>
      <Card className="h-full p-4 transition-colors hover:border-foreground/20">
        <div className="flex items-center justify-between">
          <span className="font-medium">{e.title}</span>
          <div className="flex items-center gap-1">
            {e.bundle && <Badge variant="secondary" className="text-[10px] font-normal">{e.files.length} {t("catalog.filesUnit", "files")}</Badge>}
            <Badge variant="outline" className="text-[10px]">{e.type}</Badge>
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.description || "—"}</p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
        {e.checkpoints.length > 0 && (
          <div className="mt-2 text-[10px] text-info">{t("catalog.checkpoints", "checkpoints")}: {e.checkpoints.join(", ")}</div>
        )}
      </Card>
    </Link>
  );
}

export default async function Catalog() {
  const t = getT();
  const { skills, playbooks, contracts } = await listRegistry();

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("catalog.breadcrumb", "Skills & Playbooks")}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("catalog.title", "Skills & Playbooks registry")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("catalog.registryDesc1", "The agent library lives in")} <code>du-agent-registry</code>{t("catalog.registryDesc2", ", not in this application. Edit a skill or playbook and it saves straight there — changes are live for the agent on the next request, with no deploy.")}
          </p>
        </div>
        <div className="ml-auto flex items-start gap-2">
          <Link href="/catalog/new?type=skill" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">+ {t("catalog.new.skill", "Skill")}</Link>
          <Link href="/catalog/new?type=playbook" className="rounded-md border px-3 py-2 text-sm font-medium">+ {t("catalog.new.playbook", "Playbook")}</Link>
          <Link href="/catalog/new?type=contract" className="rounded-md border px-3 py-2 text-sm font-medium">+ {t("catalog.new.contract", "Contract")}</Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("catalog.section.skills", "Skills")} · {skills.length}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((e) => <EntryCard key={e.name} e={e} t={t} />)}
          {skills.length === 0 && <p className="text-sm text-muted-foreground">{t("catalog.emptySkills", "No skills yet.")}</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("catalog.section.playbooks", "Playbooks")} · {playbooks.length}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((e) => <EntryCard key={e.name} e={e} t={t} />)}
          {playbooks.length === 0 && <p className="text-sm text-muted-foreground">{t("catalog.emptyPlaybooks", "No playbooks yet.")}</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("catalog.section.contracts", "Contracts")} · {contracts.length}</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("catalog.contractsBlurb", "The non-negotiable operating contracts each agent runs under — now file-managed and editable, just like playbooks.")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((e) => <EntryCard key={e.name} e={e} t={t} />)}
          {contracts.length === 0 && <p className="text-sm text-muted-foreground">{t("catalog.emptyContracts", "No contracts yet.")}</p>}
        </div>
      </section>
    </main>
  );
}
