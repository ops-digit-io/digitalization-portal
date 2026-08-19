"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Record a tool by hand.
 *
 * Two fields are required — a name, and a capability (without one the tool takes
 * part in no finding). Everything else is optional and comes back as a warning on
 * the row: a half-known tool recorded beats a perfect tool nobody records.
 *
 * POSTs to `/api/landscape/tools`, which appends a row to `landscape/tools.md` in
 * git; `router.refresh()` re-renders the page, so the tool appears in the register
 * with its risk already scored.
 */

const SCOPES = ["", "global", "regional", "plant", "local"];
const HOSTINGS = ["", "saas", "private-cloud", "on-prem", "edge"];
const LIFECYCLES = ["", "evaluate", "invest", "tolerate", "migrate", "eliminate"];
const INTEGRATIONS = ["", "isolated", "file-export", "point-to-point", "api", "hub"];
const CRITICALITIES = ["", "critical", "important", "standard", "low"];

const EMPTY = {
  tool: "", vendor: "", capability: "", domain: "", scope: "", hosting: "", lifecycle: "",
  integration: "", businessOwner: "", itOwner: "", users: "", criticality: "", annualCost: "", notes: "",
};

type Form = typeof EMPTY;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const inputClass = "h-9 rounded-md border bg-background px-2.5 text-sm";

export function AddTool({
  capabilities,
  domains,
  /** Present when editing an existing tool: its node id and current values. */
  edit,
}: {
  capabilities: string[];
  domains: string[];
  edit?: { node: string; label: string; values: Partial<Form> };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ ...EMPTY, ...(edit?.values ?? {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (busy) return;
    if (!edit && (form.tool.trim() === "" || form.capability.trim() === "")) return;
    setBusy(true);
    setError(null);
    try {
      // Editing patches only what changed, so a one-field correction stays one
      // field in the overlay — and a field left as it was is never rewritten.
      const body = edit
        ? {
            tool: edit.node,
            ...Object.fromEntries(
              (Object.keys(form) as (keyof Form)[])
                .filter((k) => (form[k] ?? "") !== ((edit.values[k] ?? "") as string))
                .map((k) => [k === "tool" ? "name" : k, form[k]]),
            ),
          }
        : form;
      const res = await fetch("/api/landscape/tools", {
        method: edit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; warnings?: string[] };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setWarnings(data.warnings ?? []);
      if (!edit) setForm(EMPTY);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return edit ? (
      <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground" title={`Edit ${edit.label}`}>
        edit
      </button>
    ) : (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Add a tool
        </button>
        {warnings.length > 0 ? (
          <p className="max-w-md text-right text-[11px] text-amber-700 dark:text-amber-400">
            Recorded, with gaps: {warnings.join(" ")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-card p-4 ${edit ? "" : "w-full"}`}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{edit ? `Edit ${edit.label}` : "Record a tool"}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {edit
              ? "Only what you change is written, as an overlay in git over the source row. Risk and budget follow it."
              : "Name and capability required; anything left blank shows as a gap on the row."}
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={edit ? "Name" : "Tool *"}>
          <input autoFocus value={form.tool} onChange={set("tool")} className={inputClass} placeholder="e.g. Miro" />
        </Field>
        <Field label="Vendor">
          <input value={form.vendor} onChange={set("vendor")} className={inputClass} />
        </Field>
        <Field label={edit ? "Capability" : "Capability *"} hint="Reuse an existing one so overlaps stay visible.">
          <input
            list="landscape-capabilities"
            value={form.capability}
            onChange={set("capability")}
            className={inputClass}
            placeholder="e.g. Whiteboarding"
          />
          <datalist id="landscape-capabilities">
            {capabilities.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Domain">
          <input list="landscape-domains" value={form.domain} onChange={set("domain")} className={inputClass} />
          <datalist id="landscape-domains">
            {domains.map((d) => <option key={d} value={d} />)}
          </datalist>
        </Field>
        <Field label="Scope">
          <select value={form.scope} onChange={set("scope")} className={inputClass}>
            {SCOPES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </Field>
        <Field label="Hosting">
          <select value={form.hosting} onChange={set("hosting")} className={inputClass}>
            {HOSTINGS.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </Field>
        <Field label="Lifecycle">
          <select value={form.lifecycle} onChange={set("lifecycle")} className={inputClass}>
            {LIFECYCLES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </Field>
        <Field label="Integration">
          <select value={form.integration} onChange={set("integration")} className={inputClass}>
            {INTEGRATIONS.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </Field>
        <Field label="Criticality" hint="How much stops when it does.">
          <select value={form.criticality} onChange={set("criticality")} className={inputClass}>
            {CRITICALITIES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </Field>
        <Field label="Business owner" hint="A team, never a person.">
          <input value={form.businessOwner} onChange={set("businessOwner")} className={inputClass} />
        </Field>
        <Field label="IT owner">
          <input value={form.itOwner} onChange={set("itOwner")} className={inputClass} />
        </Field>
        <Field label="Users" hint="Approximate headcount.">
          <input value={form.users} onChange={set("users")} className={inputClass} inputMode="numeric" />
        </Field>
        <Field label="Annual cost (€/yr)" hint="Licence + hosting + support.">
          <input value={form.annualCost} onChange={set("annualCost")} className={inputClass} inputMode="numeric" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <input value={form.notes} onChange={set("notes")} className={inputClass} />
          </Field>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || (!edit && (form.tool.trim() === "" || form.capability.trim() === ""))}
          className="h-9 rounded-md border bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : edit ? "Save changes" : "Record tool"}
        </button>
        <span className="text-xs text-muted-foreground">
          One row in <code>{edit ? "landscape/overrides.md" : "landscape/tools.md"}</code>.
        </span>
      </div>
    </div>
  );
}
