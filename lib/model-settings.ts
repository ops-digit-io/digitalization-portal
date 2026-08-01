/**
 * The runtime-selectable default model — the "options" a portal admin sets in
 * Settings without a redeploy.
 *
 * This mirrors `category-store.ts` exactly, for the same reasons: an admin-
 * managed override persists in KV; the ENVIRONMENT is the seed it falls back to;
 * and with no KV configured the override is read-only and the env-derived
 * default is served unchanged. So the portal always has a default model — the
 * env one — and can always be pointed at another provider or model from the
 * options when a durable store is present.
 *
 * What lives WHERE, and why:
 *   - Keys and base URLs stay in the environment (constraint #7 — secrets never
 *     reach the browser, and never sit in KV either). The picker can therefore
 *     only select among providers whose credentials are already configured.
 *   - The *choice* of provider and model is not a secret, so it lives in KV and
 *     is editable from the options page.
 *
 * The override is applied by MERGING it into an env map and handing that to the
 * pure `describeProvider`/`getProvider`. That keeps those two functions pure and
 * synchronous — every existing caller and test still works — while the live
 * seams resolve the effective environment first.
 */

import { kvConfigured, kvCommand } from "./kv.js";
import {
  describeProvider,
  getProvider,
  providerById,
  providerAvailable,
  modelFor,
  PROVIDERS,
  type ModelProvider,
  type ProviderStatus,
} from "./agent/provider.js";

const KV_KEY = "model:settings";

export interface ModelOverride {
  /** A catalogue provider id, or absent to leave provider auto-selection alone. */
  provider?: string;
  /** The model to use for the selected provider, or absent for its default. */
  model?: string;
}

/** A single value with newline/pipe characters or absurd length is not a model
 *  name — the same shape of guard the category store applies. */
function cleanModel(v: unknown): string | undefined {
  const s = String(v ?? "").trim();
  if (s === "" || s.length > 120 || /[|\n\r]/.test(s)) return undefined;
  return s;
}

/** Validate a proposed override against the catalogue. Pure — no I/O. An unknown
 *  provider id is rejected; an unknown MODEL is allowed (a compatible gateway
 *  serves arbitrary names, so we cannot allow-list). */
export function validateOverride(input: { provider?: unknown; model?: unknown }): { ok: true; value: ModelOverride } | { ok: false; reason: string } {
  const value: ModelOverride = {};
  if (input.provider !== undefined && input.provider !== null && String(input.provider) !== "") {
    const id = String(input.provider).trim();
    if (!providerById(id)) return { ok: false, reason: `Unknown provider "${id}".` };
    value.provider = id;
  }
  if (input.model !== undefined && input.model !== null && String(input.model) !== "") {
    const m = cleanModel(input.model);
    if (!m) return { ok: false, reason: "That model name isn't valid." };
    value.model = m;
  }
  return { ok: true, value };
}

/** The stored override, or {} when none is set or KV is absent. Never throws. */
export async function getModelOverride(): Promise<ModelOverride> {
  if (!kvConfigured()) return {};
  try {
    const raw = await kvCommand<string | null>(["GET", KV_KEY]);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const v = validateOverride(parsed as Record<string, unknown>);
    return v.ok ? v.value : {};
  } catch {
    return {};
  }
}

/** Whether the default model is editable from the options (needs a durable store). */
export function modelSettingsEditable(): boolean {
  return kvConfigured();
}

export type ModelSaveResult = { ok: true; override: ModelOverride } | { ok: false; reason: string };

/**
 * Apply an override — but only for a provider whose credentials are already in
 * the environment. Selecting a provider you haven't keyed would produce a
 * default that silently falls back to offline; refusing it here is the honest
 * failure.
 */
export async function saveModelOverride(input: { provider?: unknown; model?: unknown }): Promise<ModelSaveResult> {
  const v = validateOverride(input);
  if (!v.ok) return v;
  if (!modelSettingsEditable()) {
    return { ok: false, reason: "Selecting a default model needs a durable store (set KV_REST_API_URL / KV_REST_API_TOKEN). The environment default is used until then." };
  }
  if (v.value.provider && v.value.provider !== "offline") {
    const def = providerById(v.value.provider)!;
    if (!providerAvailable(def)) {
      const need = [def.keyEnv, def.requiresBaseUrl ? def.baseUrlEnv : undefined].filter(Boolean).join(" and ");
      return { ok: false, reason: `${def.label} isn't configured — set ${need} in the environment first.` };
    }
  }
  await kvCommand(["SET", KV_KEY, JSON.stringify(v.value)]);
  return { ok: true, override: v.value };
}

/** Clear the override — fall back to the environment default. */
export async function resetModelOverride(): Promise<ModelSaveResult> {
  if (!modelSettingsEditable()) {
    return { ok: false, reason: "Selecting a default model needs a durable store (set KV_REST_API_URL / KV_REST_API_TOKEN)." };
  }
  await kvCommand(["DEL", KV_KEY]);
  return { ok: true, override: {} };
}

/**
 * Fold an override into an env map. Pure and separately testable — this is the
 * whole mechanism by which the KV choice reaches the sync resolvers.
 *
 * `provider` maps to `MODEL_PROVIDER`; `model` maps to the SELECTED provider's
 * own model env var (so it lands on the right one), the selected provider being
 * the override's if it set one, otherwise whichever the base env would pick.
 */
export function applyOverride(base: Record<string, string | undefined>, override: ModelOverride): Record<string, string | undefined> {
  if (!override.provider && !override.model) return base;
  const env = { ...base };
  if (override.provider) env.MODEL_PROVIDER = override.provider;
  if (override.model) {
    const def = providerById(override.provider) ?? providerById(describeProvider(env).provider);
    if (def?.modelEnv) env[def.modelEnv] = override.model;
  }
  return env;
}

/** The environment with the stored override applied. */
export async function effectiveEnv(base: Record<string, string | undefined> = process.env): Promise<Record<string, string | undefined>> {
  return applyOverride(base, await getModelOverride());
}

/** The active provider, honouring the stored override. Use this at every live
 *  seam in place of `getProvider()`. */
export async function resolveProvider(): Promise<ModelProvider> {
  return getProvider(await effectiveEnv());
}

/** The active provider status, honouring the stored override. */
export async function resolveStatus(): Promise<ProviderStatus> {
  return describeProvider(await effectiveEnv());
}

/** One catalogue entry as the options page needs it — no secrets, just what is
 *  selectable and whether it can be. */
export interface ProviderOption {
  id: string;
  label: string;
  blurb: string;
  available: boolean;
  requiresBaseUrl: boolean;
  suggestedModels: string[];
  /** The model this provider would use with no explicit choice. */
  defaultModel?: string;
}

/** The catalogue as options, plus the active status and the stored override —
 *  everything the picker renders. Reads the live environment for availability. */
export async function modelOptions(env: Record<string, string | undefined> = process.env): Promise<{
  providers: ProviderOption[];
  active: ProviderStatus;
  override: ModelOverride;
  editable: boolean;
}> {
  const override = await getModelOverride();
  const providers: ProviderOption[] = PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    blurb: p.blurb,
    available: providerAvailable(p, env),
    requiresBaseUrl: Boolean(p.requiresBaseUrl),
    suggestedModels: [...p.suggestedModels],
    defaultModel: modelFor(p, env),
  }));
  return { providers, active: describeProvider(applyOverride(env, override)), override, editable: modelSettingsEditable() };
}
