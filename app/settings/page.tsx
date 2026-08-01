import Link from "next/link";
import { describeConfig, type IntegrationItem } from "@/lib/config-status";
import { modelOptions } from "@/lib/model-settings";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { getT, type TFn } from "@/lib/i18n-server";
import { Card } from "@/components/ui/card";
import { ProviderProbe } from "./probe";
import { ModelPicker } from "./model-picker";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = { anthropic: "Anthropic (Claude)", openai: "OpenAI (GPT)", offline: "Offline" };

/** Status dot: green configured; red for a missing required/recommended; grey for optional. */
function dotColor(item: IntegrationItem): string {
  if (item.configured) return "hsl(var(--ok))";
  if (item.level === "required") return "hsl(var(--destructive))";
  if (item.level === "recommended") return "hsl(var(--warn))";
  return "hsl(var(--muted-foreground))";
}

function Row({ item, t }: { item: IntegrationItem; t: TFn }) {
  const levelLabel =
    item.level === "required" ? t("common.required", "required")
    : item.level === "recommended" ? t("settings.level.recommended", "recommended")
    : t("common.optional", "optional");
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: dotColor(item) }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{item.label}</span>
          <span className={`text-xs ${item.configured ? "text-ok" : item.level === "optional" ? "text-muted-foreground" : "text-warn"}`}>
            {item.configured ? t("settings.status.configured", "configured") : `${t("settings.status.notSet", "not set")} · ${levelLabel}`}
          </span>
          {item.detail && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.detail}</span>}
        </div>
        {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.envVars.map((v) => (
            <code key={v} className="rounded border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">{v}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const t = getT();
  const cfg = describeConfig();
  const [options, session] = await Promise.all([modelOptions(), getSession()]);
  const isAdmin = can(session, "all");
  // The active model reflects any admin-selected default, not just the env.
  const activeProviderLabel =
    options.providers.find((p) => p.id === options.active.provider)?.label ??
    PROVIDER_LABEL[options.active.provider] ??
    options.active.provider;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">{t("settings.title", "Settings")}</span>
      </nav>
      <h1 className="text-lg font-semibold">{t("settings.headingIntegrations", "Settings · Integrations")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {t("settings.intro", "What this deployment has wired up. Read-only status — this page shows only whether each integration is configured, never a key's value.")}
      </p>

      {/* Security note — the reason keys aren't entered here. */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2.5 text-sm">
        <span className="mt-0.5 text-info" aria-hidden>🔒</span>
        <div className="text-muted-foreground">
          <span className="font-medium text-foreground">{t("settings.security.title", "Credentials are never entered or shown in the browser.")}</span>{" "}
          {t("settings.security.body1", "API keys and the GitHub App private key are set as")} <span className="font-medium">{t("settings.security.envVars", "environment variables")}</span> {t("settings.security.body2", "in the host (Vercel → Project → Settings → Environment Variables) and stay server-side (constraint #7). Set or rotate a value there, then redeploy — this page reflects it.")}
        </div>
      </div>

      {/* Live summary */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.activeModel", "Active model")}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: options.active.live ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))" }} aria-hidden />
            <span className="text-base font-semibold">{activeProviderLabel}</span>
            {options.active.model && <span className="text-xs text-muted-foreground">{options.active.model}</span>}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{options.active.live ? t("settings.liveReasoning", "Live reasoning enabled.") : t("settings.offlineEngine", "Deterministic offline engine — add a model key to go live.")}</div>
          <ProviderProbe />
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("settings.githubApp", "GitHub App")}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: cfg.gitLive ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))" }} aria-hidden />
            <span className="text-base font-semibold">{cfg.gitLive ? t("settings.github.connected", "Connected") : t("settings.github.localWorkspace", "Local workspace")}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{cfg.gitLive ? t("settings.github.liveDesc", "Reads and writes the org repos live.") : t("settings.github.localDesc", "Using the bundled workspace — add the App to go live.")}</div>
        </Card>
      </div>

      {/* Default model — provider-agnostic runtime selection */}
      <Card className="mt-5 p-4">
        <h2 className="text-sm font-semibold">{t("settings.defaultModel", "Default model")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("settings.defaultModelDesc", "The provider and model every agent uses. Anthropic and OpenAI are built in; any OpenAI-compatible endpoint (OpenRouter, Groq, Together, Azure OpenAI, Ollama, a local runtime) works by setting its base URL, key and model in the environment. Selecting one here overrides the environment default without a redeploy.")}
        </p>
        <ModelPicker
          providers={options.providers}
          active={options.active}
          override={options.override}
          editable={options.editable}
          isAdmin={isAdmin}
        />
      </Card>

      {/* Integration groups */}
      <div className="mt-6 space-y-5">
        {cfg.groups.map((group) => (
          <Card key={group.title} className="p-4">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            {group.blurb && <p className="mt-0.5 text-xs text-muted-foreground">{group.blurb}</p>}
            <div className="mt-2">
              {group.items.map((item) => <Row key={item.key} item={item} t={t} />)}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t("settings.manageAdmin", "Manage (admin):")}</span>
        <Link href="/admin/usage" className="underline hover:text-foreground">{t("usage.breadcrumb", "Cost & usage")}</Link>
        <Link href="/admin/categories" className="underline hover:text-foreground">{t("settings.link.categories", "Categories (plants & domains)")}</Link>
        <Link href="/catalog" className="underline hover:text-foreground">{t("settings.link.skillsPlaybooks", "Skills & playbooks")}</Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("settings.varReference1", "Full variable reference:")} <code className="rounded border px-1 py-0.5">.env.example</code> {t("settings.varReference2", "in the portal repo, and the deployment guide in")} <code className="rounded border px-1 py-0.5">docs/DEPLOYMENT.md</code>.
      </p>
    </main>
  );
}
