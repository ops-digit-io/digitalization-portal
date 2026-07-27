import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { loadRequestorRecords, buildRequestorProfile, normalizeRequester } from "@/lib/persona";
import { ShareBars, Chips, EthicsNote } from "../shared";

export const dynamic = "force-dynamic";

/**
 * One requestor's service profile. Restricted content: visible to a `view_all` holder
 * or to the requestor themselves (transparency). Built only from that requestor's own
 * demands; descriptive, never a score.
 */
export default async function RequestorProfilePage({ params }: { params: { requestor: string } }) {
  const key = normalizeRequester(decodeURIComponent(params.requestor));
  const session = await getSession();
  const isSelf = normalizeRequester(session.user) === key;
  if (!can(session, "view_all") && !isSelf) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Requestor profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">You can only view your own profile (or need view-all).</p>
        <Link href="/personas" className="mt-3 inline-block text-sm underline">← Persona Analyst</Link>
      </main>
    );
  }

  const records = (await loadRequestorRecords()).filter((r) => normalizeRequester(r.requester) === key);
  if (records.length === 0) notFound();
  const profile = buildRequestorProfile(records);

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <Link href="/personas" className="hover:text-foreground">Persona Analyst</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{profile.requester}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{profile.requester}{isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.demandCount} demand{profile.demandCount === 1 ? "" : "s"}
            {profile.firstSeen && ` · since ${profile.firstSeen}`}
            {profile.lastSeen && profile.lastSeen !== profile.firstSeen && ` · last ${profile.lastSeen}`}
          </p>
        </div>
      </div>
      <div className="mt-3"><EthicsNote /></div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Role & domain focus */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Role &amp; domain focus</h2>
          <p className="text-xs font-medium text-muted-foreground">Domains</p>
          <div className="mt-1"><ShareBars items={profile.domains} empty="No domain recorded." /></div>
          {profile.plants.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Plants</p>
              <div className="mt-1"><ShareBars items={profile.plants} /></div>
            </>
          )}
          {profile.lanes.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Lanes</p>
              <div className="mt-1"><ShareBars items={profile.lanes} /></div>
            </>
          )}
        </Card>

        {/* Solution-archetype needs */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Solution-archetype needs</h2>
          <p className="mb-2 text-xs text-muted-foreground">The kinds of digital solution their demands point to.</p>
          <ShareBars items={profile.archetypes} empty="No demands to read yet." />
        </Card>

        {/* Jobs & daily workflows */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Jobs &amp; daily workflows</h2>
          <p className="text-xs font-medium text-muted-foreground">Recurring themes</p>
          <div className="mt-1"><Chips items={profile.themes} empty="Not enough text to surface themes." /></div>
          {profile.workflows.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Processes they name</p>
              <ul className="mt-1 space-y-1 text-sm text-foreground/90">
                {profile.workflows.map((w, i) => (
                  <li key={i} className="flex gap-2"><span className="text-muted-foreground" aria-hidden>·</span><span>{w}</span></li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Digitalization maturity — descriptive */}
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">Digitalization maturity</h2>
          <p className="mb-3 text-xs text-muted-foreground">Descriptive facts about how demands are framed — not a score.</p>
          <ul className="space-y-2 text-sm">
            {profile.maturity.map((m) => (
              <li key={m.label}>
                <span className="font-medium">{m.label}.</span>{" "}
                <span className="text-muted-foreground">{m.detail}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Their demands */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Demands</h2>
        <div className="divide-y rounded-lg border">
          {profile.demands.map((d) => (
            <Link key={d.id} href={`/uc/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40">
              <span className="min-w-0">
                <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                <span className="ml-2 text-sm">{d.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span>{d.archetype}</span>
                {d.createdOn && <span className="hidden sm:inline">· {d.createdOn}</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
