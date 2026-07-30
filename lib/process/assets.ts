/**
 * Reads the process-funnel config assets — templates, schemas, coaching prompts,
 * the tool playbook — that were ported VERBATIM from PDT into `process-funnel/`.
 *
 * Server-only (uses `fs`). The assets live under the repo root so they are read
 * the same way in dev, in `next start`, and in the standalone server. Route
 * handlers that read them are listed in `next.config.mjs` outputFileTracingIncludes
 * so Vercel's function bundler ships them too.
 */

import fs from "node:fs";
import path from "node:path";
import type { SectionSchema } from "./grader";

const ROOT = path.join(process.cwd(), "process-funnel");

export const TEMPLATE_DIR = path.join(ROOT, "templates");
export const SCHEMA_DIR = path.join(ROOT, "schemas");
export const PROMPT_DIR = path.join(ROOT, "coaching-prompts");
export const PLAYBOOK = path.join(ROOT, "tool-playbook.md");

export function readIf(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/** The target template markdown for a section (or advisory item under advisory/). */
export function template(key: string): string {
  return readIf(path.join(TEMPLATE_DIR, `${key}.md`));
}

export function advisoryTemplate(key: string): string {
  return readIf(path.join(TEMPLATE_DIR, "advisory", `${key}.md`));
}

export function sectionPrompt(key: string): string {
  return readIf(path.join(PROMPT_DIR, "sections", `${key}.md`));
}

export function advisoryPrompt(key: string): string {
  return readIf(path.join(PROMPT_DIR, "advisory", `${key}.md`));
}

/** The always-injected shared guidance, wrapped for the prompt. */
export function shared(): string {
  const dir = path.join(PROMPT_DIR, "shared");
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `<shared-guidance file="${f}">\n${readIf(path.join(dir, f))}\n</shared-guidance>`)
    .join("\n\n");
}

export function playbook(): string {
  return readIf(PLAYBOOK);
}

/** One section schema, parsed. Returns null when the file is missing/broken. */
export function schema(key: string): SectionSchema | null {
  const p = path.join(SCHEMA_DIR, `${key}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SectionSchema;
  } catch {
    return null;
  }
}

/** All schemas keyed by section, in one read. */
export function allSchemas(): Record<string, SectionSchema> {
  const out: Record<string, SectionSchema> = {};
  if (!fs.existsSync(SCHEMA_DIR)) return out;
  for (const f of fs.readdirSync(SCHEMA_DIR).filter((n) => n.endsWith(".json"))) {
    const key = f.replace(/\.json$/, "");
    try {
      out[key] = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), "utf8")) as SectionSchema;
    } catch {
      /* skip broken; validateSchema reports it elsewhere */
    }
  }
  return out;
}
