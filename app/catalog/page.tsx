import Link from "next/link";
import { listRegistry, type RegistryEntry } from "@/lib/registry-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SyncButton } from "./sync-button";

export const dynamic = "force-dynamic";

function EntryCard({ e }: { e: RegistryEntry }) {
  const tags = [...e.capabilities, ...e.tools, ...e.skills].slice(0, 4);
  return (
    <Link href={`/catalog/${e.type}/${e.name}`}>
      <Card className="h-full p-4 transition-colors hover:border-foreground/20">
        <div className="flex items-center justify-between">
          <span className="font-medium">{e.title}</span>
          <div className="flex items-center gap-1">
            {e.bundle && <Badge variant="secondary" className="text-[10px] font-normal">{e.files.length} files</Badge>}
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
          <div className="mt-2 text-[10px] text-info">checkpoints: {e.checkpoints.join(", ")}</div>
        )}
      </Card>
    </Link>
  );
}

export default async function Catalog() {
  const { skills, playbooks } = await listRegistry();

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Skills &amp; Playbooks</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">Skills &amp; Playbooks registry</h1>
          <p className="text-sm text-muted-foreground">
            Git-backed agent capabilities. Edit a skill or playbook and it saves straight to the
            registry repo — changes are live for the agent.
          </p>
        </div>
        <div className="ml-auto flex items-start gap-2">
          <SyncButton />
          <Link href="/catalog/new?type=skill" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">+ Skill</Link>
          <Link href="/catalog/new?type=playbook" className="rounded-md border px-3 py-2 text-sm font-medium">+ Playbook</Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills · {skills.length}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((e) => <EntryCard key={e.name} e={e} />)}
          {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills yet.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Playbooks · {playbooks.length}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((e) => <EntryCard key={e.name} e={e} />)}
          {playbooks.length === 0 && <p className="text-sm text-muted-foreground">No playbooks yet.</p>}
        </div>
      </section>
    </main>
  );
}
