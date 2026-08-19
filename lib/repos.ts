/**
 * The single registry of every GitHub repository the portal reads or writes.
 *
 * Every repo name is resolved from an environment variable with a default, and this
 * is the ONE place those names live. Before this, ~10 stores and routes each re-read
 * `process.env.DEMANDS_REPO ?? "du-demands"` (and friends) by hand, so changing a
 * default or auditing what is configurable meant grepping the codebase. Now a store
 * calls `repoName("demands")` and a deployment sets `DEMANDS_REPO` — every repo the
 * portal touches is settable, from one table.
 *
 * The `owner` is always `GITHUB_ORG` (constraint: authority is the deployment's), so
 * only the repo NAME is modelled here; `repoRef()` assembles the full ref.
 *
 * Note on non-repos this module deliberately does NOT own: the `du-triage` / `du-value`
 * strings in `codeowners.ts` are GitHub TEAM slugs, and `OWNER_REPO` in `skill-search`
 * is an `owner/repo` shape regex — neither is a repository name.
 */

import type { RepoRef } from "./git/index.js";

export type RepoKey =
  | "demands"
  | "registry"
  | "templates"
  | "specifications"
  | "organization"
  | "processes"
  | "champions"
  | "personas"
  | "templatesConfig";

export interface RepoDef {
  key: RepoKey;
  /** Primary env var that overrides the repo name. */
  env: string;
  /** Env vars checked (in order) before the default when the primary is unset. */
  fallbackEnv?: readonly string[];
  /** The name used when nothing is set — the conventional `du-*` repo. */
  default: string;
  /** One line for the config/status surface and env-var docs. */
  purpose: string;
}

/**
 * Every repository, its env var, and its default. `champions`/`personas`/`templatesConfig`
 * historically share the `du-processes` repo, so they fall back to `PROCESS_REPO` when
 * their own var is unset — set the specific var to split them onto their own repo.
 */
export const REPO_DEFS: readonly RepoDef[] = [
  { key: "demands", env: "DEMANDS_REPO", default: "du-demands", purpose: "Intake funnel — every demand as a folder." },
  { key: "registry", env: "REGISTRY_REPO", default: "du-agent-registry", purpose: "Agent library: playbooks, skills, contracts." },
  { key: "templates", env: "TEMPLATES_REPO", default: "du-templates", purpose: "Artefact templates — the shape of produced documents." },
  { key: "specifications", env: "SPECIFICATIONS_REPO", default: "du-specifications", purpose: "Specification documents surfaced by /docs." },
  { key: "organization", env: "ORGANIZATION_REPO", default: "du-organization-context", purpose: "Department OS — the organization-context layer." },
  { key: "processes", env: "PROCESS_REPO", default: "du-processes", purpose: "Process diagnoses (engagements); also tools added by hand in the landscape." },
  { key: "champions", env: "CHAMPION_REPO", fallbackEnv: ["PROCESS_REPO"], default: "du-processes", purpose: "Digital champions register." },
  { key: "personas", env: "PERSONA_REPO", fallbackEnv: ["PROCESS_REPO"], default: "du-processes", purpose: "Persona library." },
  { key: "templatesConfig", env: "TEMPLATES_CONFIG_REPO", fallbackEnv: ["PROCESS_REPO"], default: "du-processes", purpose: "Custom PoC-template registrations." },
];

const BY_KEY = new Map<RepoKey, RepoDef>(REPO_DEFS.map((d) => [d.key, d]));

/** The GitHub org that owns every repo (a deployment setting). */
export function githubOrg(env: Record<string, string | undefined> = process.env): string {
  return env.GITHUB_ORG?.trim() || "org";
}

/** The configured repository NAME for a logical key — env override, then fallbacks, then default. */
export function repoName(key: RepoKey, env: Record<string, string | undefined> = process.env): string {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`unknown repo key: ${key}`);
  const own = env[def.env]?.trim();
  if (own) return own;
  for (const f of def.fallbackEnv ?? []) {
    const v = env[f]?.trim();
    if (v) return v;
  }
  return def.default;
}

/** The full GitHub ref for a logical key — owner from `GITHUB_ORG`, name from `repoName`. */
export function repoRef(key: RepoKey, env: Record<string, string | undefined> = process.env): RepoRef {
  const org = githubOrg(env);
  const name = repoName(key, env);
  return { owner: org, name, url: `https://github.com/${org}/${name}`, local: false };
}

/**
 * The prefix for the per-stack PoC template repositories. The built-in stacks are named
 * `du-template-<stack>` (e.g. `du-template-streamlit`); setting `POC_TEMPLATE_REPO_PREFIX`
 * swaps that leading `du-template-` for another prefix, so the whole set is settable from
 * one variable without renaming each stack.
 */
export function templateRepoName(defaultName: string, env: Record<string, string | undefined> = process.env): string {
  const prefix = env.POC_TEMPLATE_REPO_PREFIX?.trim();
  return prefix ? defaultName.replace(/^du-template-/, prefix) : defaultName;
}

/** Every repo's key, env var, resolved name, and whether it is overridden — for the status surface. */
export function repoConfig(env: Record<string, string | undefined> = process.env): {
  key: RepoKey;
  env: string;
  name: string;
  overridden: boolean;
  purpose: string;
}[] {
  return REPO_DEFS.map((d) => {
    const name = repoName(d.key, env);
    return { key: d.key, env: d.env, name, overridden: name !== d.default, purpose: d.purpose };
  });
}
