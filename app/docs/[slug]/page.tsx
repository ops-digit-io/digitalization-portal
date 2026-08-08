import Link from "next/link";
import { notFound } from "next/navigation";
import { readDoc, docTitle } from "@/lib/docs";
import { MarkdownPage } from "@/components/portal/markdown-page";

export const dynamic = "force-dynamic";

/** A single specification document, rendered inside the portal. */
export default async function DocPage({ params }: { params: { slug: string } }) {
  const md = await readDoc(params.slug);
  if (md === undefined) notFound();
  const title = docTitle(md, params.slug);

  return (
    <main className="mx-auto max-w-[860px] px-6 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/docs" className="hover:text-foreground">Specification</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{params.slug}</span>
      </nav>
      <h1 className="mb-4 text-xl font-semibold">{title}</h1>
      <MarkdownPage body={md} />
    </main>
  );
}
