"use client";

/**
 * Describe a persona.
 *
 * The form asks for goals and frictions as free text, one per line, rather than
 * as a structured list builder: the point of this record is that somebody wrote
 * down what a real person said, and a fiddly widget between the interview notes
 * and the file is how that stops happening.
 *
 * Only three fields are required — name, summary, one goal. Everything else
 * warns. An over-strict form gets filled with invented content, and an invented
 * persona is worse than a thin one, because it looks researched.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/providers";
import { AUTHORITIES, PERSONA_KINDS, type Authority, type PersonaKind } from "@/lib/persona-library";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const AREA = "mt-1 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

const lines = (v: string): string[] => v.split("\n").map((l) => l.trim()).filter((l) => l !== "");

function Chips({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function PersonaEditor({ domains, plants }: { domains: string[]; plants: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PersonaKind>("user");
  const [authority, setAuthority] = useState<Authority>("uses");
  const [selDomains, setSelDomains] = useState<string[]>([]);
  const [selPlants, setSelPlants] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [goals, setGoals] = useState("");
  const [frictions, setFrictions] = useState("");
  const [systems, setSystems] = useState("");
  const [success, setSuccess] = useState("");
  const [triggers, setTriggers] = useState("");
  const [objections, setObjections] = useState("");
  const [quote, setQuote] = useState("");
  const [sourcedFrom, setSourcedFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const buyerish = kind !== "user";

  async function save() {
    setBusy(true);
    setErr(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/personas/library", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, kind, authority, domains: selDomains, plants: selPlants, summary,
          goals: lines(goals), frictions: lines(frictions), systems: lines(systems),
          successLooksLike: lines(success), triggers: lines(triggers), objections: lines(objections),
          quote, sourcedFrom,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; warnings?: string[] };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setWarnings(data.warnings ?? []);
      setName(""); setSummary(""); setGoals(""); setFrictions(""); setSystems("");
      setSuccess(""); setTriggers(""); setObjections(""); setQuote(""); setSourcedFrom("");
      setSelDomains([]); setSelPlants([]);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{t("personaEditor.describe", "Describe a persona")}</Button>;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("personaEditor.describe", "Describe a persona")}</h2>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("common.close", "Close")}</Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="p-name">{t("personaEditor.role", "Role, as the business says it")}</label>
          <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder={t("personaEditor.rolePlaceholder", "Maintenance Planner")} />
        </div>
        <div>
          <label className={LABEL} htmlFor="p-source">{t("personaEditor.source", "Where this came from")}</label>
          <input id="p-source" value={sourcedFrom} onChange={(e) => setSourcedFrom(e.target.value)} className={INPUT} placeholder={t("personaEditor.sourcePlaceholder", "Interview, 12 June, Hamburg")} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className={LABEL}>{t("personaEditor.kind", "Kind")}</span>
          <Chips options={[...PERSONA_KINDS]} selected={[kind]} onChange={(v) => setKind((v.find((x) => x !== kind) as PersonaKind) ?? kind)} />
        </div>
        <div>
          <span className={LABEL}>{t("personaEditor.authority", "Authority")}</span>
          <Chips options={[...AUTHORITIES]} selected={[authority]} onChange={(v) => setAuthority((v.find((x) => x !== authority) as Authority) ?? authority)} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <span className={LABEL}>{t("field.domains", "Domains")} <span className="font-normal">{t("personaEditor.domainsHint", "(none = every domain)")}</span></span>
          <Chips options={domains} selected={selDomains} onChange={setSelDomains} />
        </div>
        <div>
          <span className={LABEL}>{t("field.plants", "Plants")} <span className="font-normal">{t("personaEditor.plantsHint", "(none = organisation-wide)")}</span></span>
          <Chips options={plants} selected={selPlants} onChange={setSelPlants} />
        </div>
      </div>

      <div className="mt-3">
        <label className={LABEL} htmlFor="p-summary">{t("personaEditor.summary", "One sentence: who they are and what they answer for")}</label>
        <input id="p-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className={INPUT} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="p-goals">{t("personaEditor.goals", "Goals — one per line")}</label>
          <textarea id="p-goals" value={goals} onChange={(e) => setGoals(e.target.value)} className={AREA} />
        </div>
        <div>
          <label className={LABEL} htmlFor="p-frictions">{t("personaEditor.frictions", "Frictions — what gets in the way today")}</label>
          <textarea id="p-frictions" value={frictions} onChange={(e) => setFrictions(e.target.value)} className={AREA} />
        </div>
        <div>
          <label className={LABEL} htmlFor="p-success">{t("personaEditor.success", "Success looks like — in their words, not the project's")}</label>
          <textarea id="p-success" value={success} onChange={(e) => setSuccess(e.target.value)} className={AREA} />
        </div>
        <div>
          <label className={LABEL} htmlFor="p-systems">{t("personaEditor.systems", "Systems they work in")}</label>
          <textarea id="p-systems" value={systems} onChange={(e) => setSystems(e.target.value)} className={AREA} />
        </div>
        {buyerish && (
          <>
            <div>
              <label className={LABEL} htmlFor="p-triggers">{t("personaEditor.triggers", "Triggers — why now rather than next year")}</label>
              <textarea id="p-triggers" value={triggers} onChange={(e) => setTriggers(e.target.value)} className={AREA} />
            </div>
            <div>
              <label className={LABEL} htmlFor="p-objections">{t("personaEditor.objections", "Objections — cheapest to hear here")}</label>
              <textarea id="p-objections" value={objections} onChange={(e) => setObjections(e.target.value)} className={AREA} />
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <label className={LABEL} htmlFor="p-quote">{t("personaEditor.quote", "Something they actually said (quoted, never invented)")}</label>
        <input id="p-quote" value={quote} onChange={(e) => setQuote(e.target.value)} className={INPUT} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy || name.trim() === "" || summary.trim() === "" || lines(goals).length === 0} onClick={save}>
          {busy ? "…" : t("personaEditor.add", "Add to the library")}
        </Button>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
      {warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-amber-600 dark:text-amber-500">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </Card>
  );
}
