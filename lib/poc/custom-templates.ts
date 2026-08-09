/**
 * Custom PoC templates — ones a team registers at runtime, beyond the built-in
 * stacks in `templates.ts`. Stored as one small JSON document in git (the champions
 * pattern), because it is a short list read whole and edited rarely.
 *
 * A custom template has no in-app file generator: its files live in the GitHub
 * template repository it names, and the PoC builder reaches them via
 * generate-from-template. So a custom is metadata only — it works when
 * `POC_USE_TEMPLATE_REPOS` is on and its `du-template-*` repo exists.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getGitHost, hasGitHubCredentials, type RepoRef } from "../git/index.js";
import { repoRef } from "../repos.js";
import { generateDashboardMockup } from "./mockup.js";
import type { PocStack } from "./templates.js";
import type { ArtifactKind } from "./spec.js";
import type { UseCaseSeed } from "./scaffold.js";

const FILE = "poc-templates/custom.json";
const CATEGORIES: ArtifactKind[] = ["dashboard", "app", "mockup", "report"];

export interface CustomTemplate {
  /** Stable slug, unique across custom templates and distinct from built-in ids. */
  id: string;
  label: string;
  category: ArtifactKind;
  description: string;
  upstream: { name: string; url: string };
  /** The `du-template-*` repository this template generates from. */
  templateRepo: string;
}

function live(): boolean {
  return hasGitHubCredentials();
}
function repo(): RepoRef {
  return repoRef("templatesConfig");
}
function localBase(): string {
  return process.env.TEMPLATES_CONFIG_DIR ?? process.env.PROCESS_DATA_DIR ?? path.join(os.tmpdir(), "du-processes");
}

/** kebab id, so it is safe in a URL and as part of a repo name. */
export function safeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** Normalise + validate a registration; throws (status 400) on a bad field. */
export function normalizeCustom(input: Partial<CustomTemplate>): CustomTemplate {
  const id = safeSlug(input.id || input.label || "");
  if (!id) throw Object.assign(new Error("a template needs a name"), { status: 400 });
  const category = CATEGORIES.includes(input.category as ArtifactKind) ? (input.category as ArtifactKind) : "app";
  const templateRepo = safeSlug(input.templateRepo || `du-template-${id}`);
  const url = (input.upstream?.url ?? "").trim();
  if (url && !/^https:\/\//.test(url)) throw Object.assign(new Error("upstream URL must be https://"), { status: 400 });
  return {
    id,
    label: (input.label || id).trim().slice(0, 80),
    category,
    description: (input.description || "").trim().slice(0, 200),
    upstream: { name: (input.upstream?.name || "custom").trim().slice(0, 80), url },
    templateRepo,
  };
}

export async function listCustomTemplates(): Promise<CustomTemplate[]> {
  const raw = live()
    ? await getGitHost().getFile(repo(), FILE)
    : await readFile(path.join(localBase(), FILE), "utf8").catch(() => undefined);
  if (raw === undefined) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return (v as Partial<CustomTemplate>[])
      .filter((c) => typeof c?.id === "string" && typeof c?.templateRepo === "string")
      .map((c) => normalizeCustom(c))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    throw Object.assign(new Error("the custom-templates file is not valid JSON"), { status: 500 });
  }
}

async function put(all: CustomTemplate[], message: string): Promise<void> {
  const body = JSON.stringify(all, null, 2);
  if (live()) {
    await getGitHost().putFile(repo(), { path: FILE, content: body }, message, "main");
    return;
  }
  const abs = path.join(localBase(), FILE);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
}

export async function addCustomTemplate(input: Partial<CustomTemplate>): Promise<CustomTemplate> {
  const c = normalizeCustom(input);
  const all = await listCustomTemplates();
  if (all.some((x) => x.id === c.id)) throw Object.assign(new Error(`a template "${c.id}" already exists`), { status: 409 });
  await put([...all, c], `Register PoC template ${c.id}`);
  return c;
}

export async function removeCustomTemplate(id: string): Promise<void> {
  const all = await listCustomTemplates();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) throw Object.assign(new Error(`no such template: ${id}`), { status: 404 });
  await put(next, `Remove PoC template ${id}`);
}

/**
 * Present a custom template as a `PocStack`, so the builder treats it uniformly. It
 * contributes NO scaffold files — the files come from its template repo via
 * generate-from-template — and falls back to the dashboard mockup for its preview.
 */
export function customToStack(c: CustomTemplate): PocStack {
  return {
    id: c.id,
    label: c.label,
    templateRepo: c.templateRepo,
    category: c.category,
    language: "html",
    description: c.description,
    upstream: c.upstream,
    run: "generate from template",
    files: () => [],
    previewHtml: (seed: UseCaseSeed) => generateDashboardMockup(seed),
  };
}
