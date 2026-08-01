import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { readDemand } from "@/lib/demands-store";
import { parseDemandToAnswers } from "@/lib/demand";
import { parsePeople } from "@/lib/parse";
import { canEditDemand } from "@/lib/demand-edit";
import { getAllCategories } from "@/lib/category-store";
import { getT } from "@/lib/i18n-server";
import { EditForm, type EditFormValues } from "./edit-form";

export const dynamic = "force-dynamic";

/**
 * Edit a demand's content in the portal — no GitHub round-trip. Server-loads the
 * markdown, enforces `canEditDemand` (draft + own or view-all), and prefills the
 * form from `parseDemandToAnswers` + `parsePeople`. Saving is section-surgical, so
 * gates/history/stage survive (see `lib/demand-edit.ts` and the edit route).
 */
export default async function EditDemandPage({ params }: { params: { id: string } }) {
  const t = getT();
  const md = await readDemand(params.id);
  if (md === undefined) notFound();

  const session = await getSession();
  if (!canEditDemand(session, md)) {
    redirect(`/uc/${encodeURIComponent(params.id)}`);
  }

  const answers = parseDemandToAnswers(md);
  const people = parsePeople(md);
  const categories = await getAllCategories();
  const initial: EditFormValues = {
    ...answers,
    sponsor: people.sponsor ?? "",
    value_owner: people.value_owner ?? "",
  };

  return (
    <main className="mx-auto max-w-[720px] px-4 py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href="/board" className="hover:text-foreground">{t("nav.portfolio", "Portfolio")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href={`/uc/${encodeURIComponent(params.id)}`} className="hover:text-foreground">{params.id}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("common.edit", "Edit")}</span>
      </nav>

      <h1 className="text-xl font-semibold">{t("uc.editDemand", "Edit demand")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {t("edit.intro", "Editing content only — the stage, gates, lane, and history are unaffected. A history line records what you change.")}
      </p>

      <EditForm id={params.id} initial={initial} categories={categories} />
    </main>
  );
}
