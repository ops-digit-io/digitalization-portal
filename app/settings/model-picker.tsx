"use client";

import { useState } from "react";

interface ProviderOption {
  id: string;
  label: string;
  blurb: string;
  available: boolean;
  requiresBaseUrl: boolean;
  suggestedModels: string[];
  defaultModel?: string;
}
interface Active { provider: string; live: boolean; model?: string }
interface Override { provider?: string; model?: string }

interface Props {
  providers: ProviderOption[];
  active: Active;
  override: Override;
  /** A durable store (KV) is present, so a choice can persist. */
  editable: boolean;
  /** The viewer may change it. */
  isAdmin: boolean;
}

/**
 * The default-model picker. Chooses among providers whose credentials are ALREADY
 * in the environment — keys never pass through the browser, so an unconfigured
 * provider is shown but not selectable, with a note on which env var to set. The
 * choice persists in KV via `/api/model-settings`; without KV, or for a
 * non-admin, this renders read-only.
 */
export function ModelPicker({ providers, active, override, editable, isAdmin }: Props) {
  const [provider, setProvider] = useState(override.provider ?? active.provider);
  const [model, setModel] = useState(override.model ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<Active>(active);
  const [ov, setOv] = useState<Override>(override);

  const selected = providers.find((p) => p.id === provider);
  const canEdit = editable && isAdmin;

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/model-settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; active?: Active; override?: Override };
      if (!data.ok) {
        setErr(data.error ?? "Could not save.");
        return;
      }
      if (data.active) setCurrent(data.active);
      setOv(data.override ?? {});
      setModel(data.override?.model ?? "");
      setProvider(data.override?.provider ?? data.active?.provider ?? provider);
      setMsg(payload.action === "reset" ? "Reset to the environment default." : "Saved. Every agent uses this now.");
    } catch {
      setErr("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      {/* What is active right now. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="size-2 rounded-full" style={{ background: current.live ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))" }} aria-hidden />
        <span className="font-medium">
          {providers.find((p) => p.id === current.provider)?.label ?? current.provider}
        </span>
        {current.model && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{current.model}</span>}
        <span className="text-xs text-muted-foreground">
          {ov.provider || ov.model ? "selected here" : "environment default"}
        </span>
      </div>

      {!canEdit && (
        <p className="mt-2 text-xs text-muted-foreground">
          {!editable
            ? "The default is set by the environment (MODEL_PROVIDER / *_MODEL). To choose it here without a redeploy, configure a durable store (KV_REST_API_URL / KV_REST_API_TOKEN)."
            : "Only an administrator can change the default model."}
        </p>
      )}

      {canEdit && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="mp-provider">Provider</label>
            <select
              id="mp-provider"
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={provider}
              disabled={busy}
              onChange={(e) => { setProvider(e.target.value); setModel(""); }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.label}{p.available ? "" : " — not configured"}
                </option>
              ))}
            </select>
            {selected && <p className="mt-1 text-xs text-muted-foreground">{selected.blurb}</p>}
            {selected && !selected.available && (
              <p className="mt-1 text-xs text-warn">
                Set this provider's key{selected.requiresBaseUrl ? " and base URL" : ""} in the environment before selecting it.
              </p>
            )}
          </div>

          {provider !== "offline" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="mp-model">
                Model {selected?.defaultModel && <span className="font-normal">· default {selected.defaultModel}</span>}
              </label>
              <input
                id="mp-model"
                list="mp-model-list"
                className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                placeholder={selected?.defaultModel ?? "model name"}
                value={model}
                disabled={busy}
                onChange={(e) => setModel(e.target.value)}
              />
              <datalist id="mp-model-list">
                {(selected?.suggestedModels ?? []).map((m) => <option key={m} value={m} />)}
              </datalist>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank for the provider's default. Any model the endpoint serves is accepted.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || (selected ? !selected.available : true)}
              onClick={() => send({ action: "save", provider, model: model.trim() || undefined })}
              className="rounded-md border bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save default"}
            </button>
            <button
              type="button"
              disabled={busy || (!ov.provider && !ov.model)}
              onClick={() => send({ action: "reset" })}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:border-foreground/40 disabled:opacity-50"
            >
              Reset to environment
            </button>
            {msg && <span className="text-xs text-ok">{msg}</span>}
            {err && <span className="text-xs text-destructive">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
