import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listDocSlugs, docTitle } from "@/lib/docs";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Specification — the governance spec (`docs/*.md`) rendered inside the portal, so
 * the rules are one click from every tool. Reads the shipped docs folder at request
 * time; the app already renders markdown everywhere else.
 */
export default async function DocsIndex() {
  const slugs = await listDocSlugs();
  const docs = await Promise.all(
    slugs.map(async (slug) => {
      const md = await readFile(join(process.cwd(), "docs", `${slug}.md`), "utf8").catch(() => "");
      return { slug, title: docTitle(md, slug) };
    }),
  );

  return (
    <main className="mx-auto max-w-[900px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Specification</span>
      </nav>
      <h1 className="text-lg font-semibold">Specification</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Governance, data model, and architecture — the spec the portal is built to. Rendered from <span className="font-mono">docs/</span>.
      </p>

      {docs.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">No documents found.</Card>
      ) : (
        <Card className="mt-5 divide-y p-0">
          {docs.map((d) => (
            <Link key={d.slug} href={`/docs/${d.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30">
              <span className="text-sm font-medium">{d.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{d.slug}.md</span>
            </Link>
          ))}
        </Card>
      )}
    </main>
  );
}
