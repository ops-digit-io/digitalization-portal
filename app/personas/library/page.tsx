import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { citePersona, type Persona } from "@/lib/persona-library";
import { isRetired, isSeeded, listPersonas } from "@/lib/persona-library-store";
import { getAllCategories } from "@/lib/category-store";
import { PersonaEditor } from "./editor";

export const dynamic = "force-dynamic";

const KIND_NOTE: Record<string, string> = {
  user: "Lives with the result. Their frictions become the acceptance criteria.",
  buyer: "Decides whether it happens. Their objections are why the business case reads as it does.",
  influencer: "Neither uses nor signs, but can stop it. Named early or discovered late.",
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <ul className="mt-0.5 space-y-0.5 text-xs">
        {items.map((i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground" aria-hidden>·</span><span>{i}</span></li>)}
      </ul>
    </div>
  );
}

/**
 * The persona library — the vocabulary requirements are written in.
 *
 * A story that says "As a P-03 · Maintenance Planner" is only standardized if the
 * reader can open P-03 and check it. This is that page. Seeded records are marked
 * plainly: they carry a role name the portal already used, and nothing anybody
 * confirmed with a person, which is a different kind of claim.
 */
export default async function PersonaLibraryPage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Persona Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this view.</p>
      </main>
    );
  }

  const [personas, categories] = await Promise.all([
    listPersonas().catch(() => [] as Persona[]),
    getAllCategories(),
  ]);
  const seeded = personas.filter(isSeeded).length;
  const mayEdit = can(session, "draft");

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/personas" className="hover:text-foreground">Persona Analyst</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Library</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">Persona Library</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The vocabulary requirements are written in. A user story cites an id, and the id resolves to a
          record anyone can read — so two analysts writing about the same person mean the same person.
        </p>
      </header>

      {seeded > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-sm">
            <b>{seeded} of {personas.length}</b> records are seeded stubs.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            They carry a role name the requirements engine already used and nothing that came from a
            conversation. Confirming one with the person it describes is the single most valuable edit
            on this page.
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {personas.map((p) => {
          const stub = isSeeded(p);
          const retired = isRetired(p);
          return (
            <Card key={p.id} className={`p-3 ${retired ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{p.id}</span>
                <span className="text-sm font-medium">{p.name}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium" title={KIND_NOTE[p.kind]}>
                  {p.kind}
                </span>
                <span className="text-[11px] text-muted-foreground">{p.authority}</span>
                {stub && (
                  <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    stub
                  </span>
                )}
                {retired && <span className="text-[11px] text-muted-foreground">retired</span>}
                <span className="flex-1" />
                <span className="text-[11px] text-muted-foreground">
                  {(p.domains.length ? p.domains.join(", ") : "all domains")}
                  {p.plants.length ? ` · ${p.plants.join(", ")}` : ""}
                </span>
              </div>

              <p className="mt-1 text-sm">{p.summary || <span className="text-muted-foreground">no summary recorded</span>}</p>

              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Section title="Goals" items={p.goals} />
                <Section title="Frictions" items={p.frictions} />
                <Section title="Success looks like" items={p.successLooksLike} />
                <Section title={p.kind === "user" ? "Systems" : "Objections"} items={p.kind === "user" ? p.systems : p.objections} />
              </div>

              {p.quote && <blockquote className="mt-2 border-l-2 border-border pl-3 text-xs italic text-muted-foreground">{p.quote}</blockquote>}

              <p className="mt-2 text-[11px] text-muted-foreground">
                Cited as <code className="rounded bg-secondary px-1 py-0.5">{citePersona(p)}</code>
                {p.sourcedFrom ? ` · ${p.sourcedFrom}` : " · no source recorded"}
              </p>
            </Card>
          );
        })}
      </div>

      {mayEdit && (
        <div className="mt-4">
          <PersonaEditor domains={categories.domain} plants={categories.plant} />
        </div>
      )}

      <p className="mt-6 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Ids are never reused. A persona that stops being current is retired rather than deleted, because
        a requirements document written last year still cites it — and a citation that resolves to
        nothing is a worse document than one that resolves to &ldquo;retired, and here is why&rdquo;.
      </p>
    </main>
  );
}
