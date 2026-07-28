/**
 * Configuration status — a KEY-FREE view of what the deployment has wired up.
 *
 * This is the data behind the Settings page. It reports only DERIVED FACTS:
 * whether each integration is configured (a boolean from the presence of an env
 * var), and non-secret detail like the active model name, org, and repo names.
 * It NEVER reads or returns a secret's value — credentials stay server-side and
 * never reach the browser (constraint #7). Keys are set as environment variables
 * in the host (Vercel); this page shows only whether they are present.
 */

import { describeProvider, type ProviderStatus } from "./agent/provider.js";

export type Level = "required" | "recommended" | "optional";

export interface IntegrationItem {
  /** Stable id. */
  key: string;
  label: string;
  configured: boolean;
  /** Non-secret detail shown when configured (model, org, repo, on/off). */
  detail?: string;
  /** The env var(s) that control this integration — names only, never values. */
  envVars: string[];
  level: Level;
  /** One-line guidance shown when not configured (or as context). */
  note?: string;
}

export interface IntegrationGroup {
  title: string;
  blurb?: string;
  items: IntegrationItem[];
}

export interface ConfigStatus {
  model: ProviderStatus;
  gitLive: boolean;
  groups: IntegrationGroup[];
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Summarise the deployment's configuration from the environment. Pure and
 * key-free: every field is a boolean or a non-secret name.
 */
export function describeConfig(env: Record<string, string | undefined> = process.env): ConfigStatus {
  const model = describeProvider(env);
  const hasAnthropic = has(env.ANTHROPIC_API_KEY);
  const hasOpenAI = has(env.OPENAI_API_KEY);
  const gitLive = has(env.GITHUB_APP_ID) && has(env.GITHUB_APP_PRIVATE_KEY) && has(env.GITHUB_ORG);
  const org = env.GITHUB_ORG?.trim();
  const demandsRepo = env.DEMANDS_REPO?.trim() || "du-demands";
  const registryRepo = env.REGISTRY_REPO?.trim() || "du-agent-registry";
  const agentTools = (env.AGENT_TOOLS?.trim().toLowerCase() ?? "on") !== "off";
  const oidc = has(env.OIDC_ISSUER) && has(env.OIDC_CLIENT_ID) && has(env.AUTH_SECRET);

  const groups: IntegrationGroup[] = [
    {
      title: "Model providers",
      blurb:
        "The assistant, intake enhancement, and research agents run live when a key is present, and fall back to a deterministic offline engine otherwise. At least one is recommended.",
      items: [
        {
          key: "anthropic",
          label: "Anthropic (Claude)",
          configured: hasAnthropic,
          detail: hasAnthropic ? env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5" : undefined,
          envVars: ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_MODEL"],
          level: "recommended",
          note: "Set ANTHROPIC_API_KEY to enable Claude. Optional: ANTHROPIC_BASE_URL (EU endpoint), ANTHROPIC_MODEL.",
        },
        {
          key: "openai",
          label: "OpenAI (GPT)",
          configured: hasOpenAI,
          detail: hasOpenAI ? env.OPENAI_MODEL?.trim() || "gpt-4o" : undefined,
          envVars: ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"],
          level: "optional",
          note: "Set OPENAI_API_KEY to enable GPT. Used when Anthropic is absent, or when MODEL_PROVIDER=openai.",
        },
        {
          key: "provider-override",
          label: "Provider override",
          configured: has(env.MODEL_PROVIDER),
          detail: has(env.MODEL_PROVIDER) ? env.MODEL_PROVIDER?.trim() : undefined,
          envVars: ["MODEL_PROVIDER"],
          level: "optional",
          note: "Optional: force anthropic | openai | offline. Otherwise the first keyed provider wins.",
        },
      ],
    },
    {
      title: "GitHub App",
      blurb:
        "The single write identity. When present the portal reads and writes the org repos live; otherwise it uses a bundled local workspace.",
      items: [
        {
          key: "github-app",
          label: "GitHub App identity",
          configured: gitLive,
          detail: gitLive ? `installed on ${org}` : undefined,
          envVars: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_ORG"],
          level: "recommended",
          note: "Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (full PEM), and GITHUB_ORG. Installation id is auto-discovered.",
        },
        {
          key: "webhook",
          label: "Webhook secret",
          configured: has(env.GITHUB_WEBHOOK_SECRET),
          envVars: ["GITHUB_WEBHOOK_SECRET"],
          level: "optional",
          note: "Optional until webhook-driven reconciliation is enabled.",
        },
      ],
    },
    {
      title: "Repositories",
      blurb: "The repos the portal orchestrates. Names only — no credentials.",
      items: [
        {
          key: "demands-repo",
          label: "Intake funnel repo",
          configured: true,
          detail: demandsRepo,
          envVars: ["DEMANDS_REPO"],
          level: "required",
          note: "Where every demand/case folder lives. Defaults to du-demands.",
        },
        {
          key: "registry-repo",
          label: "Skills & playbooks registry repo",
          configured: true,
          detail: registryRepo,
          envVars: ["REGISTRY_REPO"],
          level: "required",
          note: "Where agent skills and playbooks live. Defaults to du-agent-registry.",
        },
      ],
    },
    {
      title: "Authentication",
      blurb: "Corporate OIDC. Until wired, the portal runs on a demo session.",
      items: [
        {
          key: "oidc",
          label: "OIDC (Auth.js)",
          configured: oidc,
          envVars: ["AUTH_SECRET", "OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_TENANT"],
          level: "recommended",
          note: "Reserved — not yet enforced in this build. Real sessions replace the demo session once wired.",
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          key: "agent-tools",
          label: "Agent tools",
          configured: agentTools,
          detail: agentTools ? "on" : "off (kill switch engaged)",
          envVars: ["AGENT_TOOLS"],
          level: "optional",
          note: "Global kill switch for all agent tools. Set AGENT_TOOLS=off to disable them in one change.",
        },
        {
          key: "kv",
          label: "Job / cache / config store (KV)",
          configured: has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN),
          detail: has(env.KV_REST_API_URL) && has(env.KV_REST_API_TOKEN) ? "editing enabled" : "seed defaults (read-only)",
          envVars: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
          level: "recommended",
          note: "Registry cache, funnel projection, AND admin-managed categories (plants/domains at /admin/categories). Without it those fall back to read-only seed defaults.",
        },
        {
          key: "cron",
          label: "Scheduled jobs secret",
          configured: has(env.CRON_SECRET),
          envVars: ["CRON_SECRET"],
          level: "optional",
          note: "Optional: shared secret for scheduled reconciliation.",
        },
        {
          key: "attachments",
          label: "File attachments",
          configured: has(env.BLOB_READ_WRITE_TOKEN),
          detail: has(env.BLOB_READ_WRITE_TOKEN) ? "upload + link" : "link-only (paste a URL)",
          envVars: ["BLOB_READ_WRITE_TOKEN"],
          level: "optional",
          note: "Optional: set BLOB_READ_WRITE_TOKEN (Vercel Blob store) to upload Excel/PPT/PDF. Without it, demands can still reference files by pasted link.",
        },
        {
          key: "notifications",
          label: "Email digest",
          configured: has(env.EMAIL_API_KEY) && has(env.EMAIL_FROM),
          detail: has(env.DIGEST_TEAM_EMAIL) ? "team digest + per-owner nudges" : "per-owner nudges only (set DIGEST_TEAM_EMAIL)",
          envVars: ["EMAIL_API_KEY", "EMAIL_FROM", "DIGEST_TEAM_EMAIL"],
          level: "optional",
          note: "Optional: weekly review/staleness digest by email. Without it, the /digest page still works.",
        },
      ],
    },
  ];

  return { model, gitLive, groups };
}
