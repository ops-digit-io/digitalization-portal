import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { buildCoverage, buildLoads, findCandidates, ROLE_MEANING, type Champion, type EngagementRef } from "@/lib/champions";
import { listChampions } from "@/lib/champions-store";
import { getAllCategories } from "@/lib/category-store";
import { listDemandRows } from "@/lib/demands-store";
import * as processStore from "@/lib/process/store";
import { ChampionEditor } from "./editor";
import { ChampionsAnalysis } from "./analysis";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

/**
 * Digital Champions — the hub-and-spoke network and, above all, its holes.
 *
 * The page leads with the coverage map because that is the finding: a plant with
 * nobody cannot raise anything, and a plant with a champion but no spoke can carry
 * work nobody is allowed to approve. Load appears per person only so the hub can
 * see who to help — there is no ordering by volume anywhere on this page, and the
 * note at the bottom says why.
 */
export default async function ChampionsPage() {
  const t = getT();
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">{t("champions.title", "Digital Champions")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("access.denied", "You don't have access to this view.")}</p>
      </main>
    );
  }

  const [champions, categories, engagements, requesters] = await Promise.all([
    listChampions().catch(() => [] as Champion[]),
    getAllCategories(),
    processStore
      .list()
      .then((ms): EngagementRef[] => ms.map((m) => ({ slug: m.slug, title: m.title, owner: m.owner, champion: m.champion })))
      .catch(() => [] as EngagementRef[]),
    listDemandRows().then((rows) => rows.map((r) => r.requester ?? "").filter((r) => r !== "")).catch(() => [] as string[]),
  ]);

  const on = new Date().toISOString().slice(0, 10);
  const coverage = buildCoverage(champions, categories.plant, categories.domain, on);
  const loads = buildLoads(champions, engagements, requesters);
  const candidates = findCandidates(champions, engagements, requesters);
  const byId = new Map(champions.map((c) => [c.id, c]));
  const mayEdit = can(session, "draft");
  const pct = Math.round(coverage.coverage * 100);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("champions.title", "Digital Champions")}</span>
      </nav>

      <header className="mb-4">
        <h1 className="text-lg font-semibold">{t("champions.title", "Digital Champions")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t("champions.intro", "The hub only scales if the work is carried locally. This is who carries it, where the network has holes, and who is already doing the job without being on the list.")}
        </p>
      </header>

      {/* The headline is the gap, not the total. */}
      <Card className="mb-4 p-4">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("champions.coverage", "Coverage")}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums leading-none">{pct}</span>
              <span className="text-xs text-muted-foreground">
                % · {coverage.cells.length - coverage.gaps.length}/{coverage.cells.length} {t("champions.plantXDomain", "plant × domain")}
              </span>
            </dd>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("champions.uncovered", "Uncovered")}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums leading-none">{coverage.gaps.length}</dd>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              {t("champions.uncoveredDesc", "Nobody to ask. Nothing can be raised here.")}
            </p>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("champions.noSpoke", "No spoke")}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums leading-none">{coverage.spokeless.length}</dd>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              {t("champions.noSpokeDesc", "Someone can carry the work; nobody can approve the change.")}
            </p>
          </div>
        </dl>
      </Card>

      {/* Coverage map — a grid, because one percentage hides the shape of the hole. */}
      <section className="mb-5">
        <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{t("champions.coverageMap", "Coverage map")}</h2>
        {categories.plant.length === 0 ? (
          <Card className="p-3 text-sm text-muted-foreground">{t("champions.noPlants", "No plants configured yet.")}</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-2.5">{t("field.plant", "Plant")}</th>
                  {categories.domain.map((d) => <th key={d} className="p-2.5">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {categories.plant.map((plant) => (
                  <tr key={plant} className="border-b last:border-0">
                    <td className="p-2.5 font-medium">{plant}</td>
                    {categories.domain.map((domain) => {
                      const cell = coverage.cells.find((c) => c.plant === plant && c.domain === domain);
                      const none = !cell || cell.covered.length === 0;
                      const tone = none
                        ? "border-destructive/40 bg-destructive/10 text-[hsl(var(--destructive))]"
                        : cell.hasSpoke
                          ? "border-[hsl(var(--ok))]/40 bg-[hsl(var(--ok))]/10 text-[hsl(var(--ok))]"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500";
                      const label = none ? t("champions.cellNobody", "nobody") : cell.hasSpoke ? t("champions.cellSpoke", "spoke") : t("champions.cellNoSpoke", "no spoke");
                      return (
                        <td key={domain} className="p-2.5 align-top">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                            {label}
                          </span>
                          {!none && (
                            <small className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                              {cell.covered.map((id) => byId.get(id)?.name ?? id).join(", ")}
                            </small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* The register. Register order, never load order. */}
      <section className="mb-5">
        <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          {t("champions.register", "The register")} {champions.length > 0 && <span className="font-normal normal-case tracking-normal">· {champions.length}</span>}
        </h2>
        {champions.length === 0 ? (
          <Card className="p-3 text-sm text-muted-foreground">
            {t("champions.registerEmpty", "Nobody registered yet. The candidates below are already doing the work.")}
          </Card>
        ) : (
          <div className="space-y-2">
            {champions.map((c) => {
              const load = loads.find((l) => l.championId === c.id);
              const inactive = Boolean(c.until && c.until <= on);
              return (
                <Card key={c.id} className={`p-3 ${inactive ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{c.id}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium" title={ROLE_MEANING[c.role]}>
                      {c.role}
                    </span>
                    {inactive && <span className="text-[11px] text-muted-foreground">{t("champions.stoodDown", "stood down")} {c.until}</span>}
                    <span className="flex-1" />
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(c.plants.length ? c.plants.join(", ") : t("field.allPlants", "all plants"))} · {(c.domains.length ? c.domains.join(", ") : t("field.allDomains", "all domains"))}
                    {c.capacity ? ` · ${c.capacity}` : ""}
                  </p>
                  {load && (load.engagementsOwned + load.engagementsChampioned + load.demandsRaised > 0) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("champions.carrying", "Carrying")} {load.engagementsOwned + load.engagementsChampioned} {t("champions.engagementsUnit", "engagement(s)")}
                      {load.demandsRaised > 0 ? `, ${t("champions.raised", "raised")} ${load.demandsRaised} ${t("champions.demandsUnit", "demand(s)")}` : ""}
                      {load.carrying.length > 0 ? ` — ${load.carrying.join(", ")}` : ""}
                    </p>
                  )}
                  {c.notes && <p className="mt-1 text-xs">{c.notes}</p>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* The agentic reading, governed from the library. */}
      <ChampionsAnalysis />

      {/* Already doing the job. The register's failure mode is being a wish list. */}
      {candidates.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            {t("champions.alreadyDoing", "Already doing the job")}
          </h2>
          <Card className="divide-y">
            {candidates.map((c) => (
              <div key={c.name} className="flex flex-wrap items-baseline gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.seenAs.join(" · ")}</span>
              </div>
            ))}
          </Card>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("champions.candidatesDesc", "Alphabetical. People who already own a process, are already named as a champion, or already raise demands — but are not on the register.")}
          </p>
        </section>
      )}

      {mayEdit && <ChampionEditor plants={categories.plant} domains={categories.domain} />}

      <p className="mt-6 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t("champions.footer", "This register describes coverage of the organisation, which is the hub’s responsibility. Nothing here ranks people: load is shown so someone carrying too much can be offered help, and a gap is a finding about the network, never about a person.")}
      </p>
    </main>
  );
}
