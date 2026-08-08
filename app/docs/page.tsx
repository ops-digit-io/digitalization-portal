import Link from "next/link";
import { listDocSlugs, readDoc, docTitle } from "@/lib/docs";
import { specificationsRepo } from "@/lib/content-repo";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Specification — the governance spec rendered inside the portal, so the rules are
 * one click from every tool. The spec lives in the external `du-specifications`
 * repo and is read through the content-repo seam (live GitHub → local mirror);
 * when neither is reachable this shows an empty state rather than pretending.
 */
export default async function DocsIndex() {
  const repo = specificationsRepo().repoName;
  const slugs = await listDocSlugs();
  const docs = await Promise.all(
    slugs.map(async (slug) => {
      const md = (await readDoc(slug)) ?? "";
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
        Governance, data model, and architecture — the spec the portal is built to. Read from <span className="font-mono">{repo}</span>.
      </p>

      {docs.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">
          No specifications reachable. They live in <span className="font-mono">{repo}</span> — configure the GitHub App, or run <span className="font-mono">npm run content:pull</span> to mirror them locally.
        </Card>
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
