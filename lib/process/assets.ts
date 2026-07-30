/**
 * Reads the process-funnel bundled config assets — the section TEMPLATES (output
 * shapes) and SCHEMAS (weighted grading rubrics), ported verbatim from PDT into
 * `process-funnel/`. These are grading/output config, not playbooks, so they stay
 * bundled and read synchronously.
 *
 * The COACHING PROMPTS and the TOOL PLAYBOOK no longer live here — they moved into
 * the portal's skill & playbook registry; see `lib/process/prompts.ts`.
 *
 * Server-only (uses `fs`). Route handlers that read them are listed in
 * `next.config.mjs` outputFileTracingIncludes so Vercel's bundler ships them too.
 */

import fs from "node:fs";
import path from "node:path";
import type { SectionSchema } from "./grader";

const ROOT = path.join(process.cwd(), "process-funnel");

export const TEMPLATE_DIR = path.join(ROOT, "templates");
export const SCHEMA_DIR = path.join(ROOT, "schemas");

export function readIf(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/** The target template markdown for a section. */
export function template(key: string): string {
  return readIf(path.join(TEMPLATE_DIR, `${key}.md`));
}

export function advisoryTemplate(key: string): string {
  return readIf(path.join(TEMPLATE_DIR, "advisory", `${key}.md`));
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
