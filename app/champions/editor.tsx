"use client";

/**
 * Add someone to the register. Kept to one collapsed form rather than an inline
 * row editor: registering a champion is a rare, deliberate act — somebody agreed
 * to carry something — and a form that is always open invites half-entries.
 *
 * Warnings are shown after the save, not as blockers. A form that refuses until
 * every box is full gets filled with invented content, and an invented capacity
 * is worse than a blank one.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/providers";
import { CHAMPION_ROLES, ROLE_MEANING, type ChampionRole } from "@/lib/champions";

const INPUT = "mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const LABEL = "block text-xs font-medium text-muted-foreground";

function MultiSelect({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <span className={LABEL}>{label}</span>
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
      {selected.length === 0 && <p className="mt-1 text-[11px] text-muted-foreground">{t("championEditor.noneCountsAll", "none selected — counts as all")}</p>}
    </div>
  );
}

export function ChampionEditor({ plants, domains }: { plants: string[]; domains: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ChampionRole>("champion");
  const [selPlants, setSelPlants] = useState<string[]>([]);
  const [selDomains, setSelDomains] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function save() {
    setBusy(true);
    setErr(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/champions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, role, plants: selPlants, domains: selDomains, capacity, notes }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; warnings?: string[] };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setWarnings(data.warnings ?? []);
      setName(""); setEmail(""); setCapacity(""); setNotes(""); setSelPlants([]); setSelDomains([]);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{t("championEditor.register", "Register a champion")}</Button>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("championEditor.register", "Register a champion")}</h2>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("common.close", "Close")}</Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="ch-name">{t("championEditor.name", "Name")}</label>
          <input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="ch-email">{t("championEditor.email", "Email")}</label>
          <input id="ch-email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="name@company.com" />
        </div>
      </div>

      <div className="mt-3">
        <span className={LABEL}>{t("championEditor.roleLabel", "Role")}</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {CHAMPION_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              title={ROLE_MEANING[r]}
              onClick={() => setRole(r)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                role === r ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ROLE_MEANING[role]}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <MultiSelect label={t("field.plants", "Plants")} options={plants} selected={selPlants} onChange={setSelPlants} />
        <MultiSelect label={t("field.domains", "Domains")} options={domains} selected={selDomains} onChange={setSelDomains} />
      </div>

      <div className="mt-3">
        <label className={LABEL} htmlFor="ch-capacity">{t("championEditor.capacity", "Capacity — honestly")}</label>
        <input id="ch-capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={INPUT} placeholder={t("championEditor.capacityPlaceholder", "half a day a week")} />
      </div>
      <div className="mt-3">
        <label className={LABEL} htmlFor="ch-notes">{t("championEditor.notes", "Notes")}</label>
        <input id="ch-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy || name.trim() === ""} onClick={save}>{busy ? "…" : t("championEditor.add", "Add to the register")}</Button>
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
