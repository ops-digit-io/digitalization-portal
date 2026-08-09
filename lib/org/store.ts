/**
 * Reading the organization context — Department OS — for the portal's tools.
 *
 * A department is a FOLDER of markdown in the external `du-organization-context`
 * repo, read through the content-repo seam (`lib/content-repo.ts`): live from GitHub
 * when the App is configured, else the local mirror (`npm run content:pull`), else
 * the bundled seed that ships in this repo so `/org` is never blank on a fresh deploy.
 *
 *   departments/<slug>/00-core/charter.md    the mandate — name, purpose, non-scope
 *   departments/<slug>/00-core/<section>.md  …one file per core section (see model.ts)
 *   departments/<slug>/10-modules/<mod>.md   optional department-wide modules
 *   framework.md                             the framework itself, surfaced read-only
 *
 * The `00-core/` / `10-modules/` split follows the framework's own repository layout
 * (01-framework.md); `sectionSubdir()` in model.ts is the single source of truth for it.
 *
 * Every department is scored against the grammar in `model.ts` as it is read, so the
 * org map shows not just which departments exist but how completely each has written
 * down the context its agents need — and which critical sections have gone stale.
 *
 * Defensive throughout: an unreachable repo or a malformed file contributes an empty
 * or zero-scored department rather than throwing. A tool asking "what is the org
 * behind this demand?" must degrade to "unknown", never to an error.
 */

import { listContent, organizationRepo, readContent } from "../content-repo.js";
import { parseFrontmatter } from "../agent/frontmatter.js";
import { CORE_SECTIONS, MODULE_SECTIONS, sectionDef, sectionSubdir } from "./model.js";
import { scoreDepartment, scoreSection, type DepartmentScore, type SectionScore } from "./scoring.js";
import { bundledDepartments, bundledDepartment, bundledFramework } from "./seed.js";

const DEPTS = "departments";

/** One core/module section of a department: its grammar, its markdown, its score. */
export interface DepartmentSection {
  key: string;
  title: string;
  /** The section's raw markdown (frontmatter stripped for display), or "" if absent. */
  body: string;
  /** The raw source including frontmatter, for anyone who needs the metadata. */
  source: string;
  score: SectionScore;
}

export interface DepartmentModule {
  key: string;
  title: string;
  /** When this module becomes necessary. */
  trigger: string;
  /** Rendered body (frontmatter stripped). */
  body: string;
  /** Raw source including frontmatter, for the editor. */
  source: string;
  /** The one module that carries the validity contract (systems-of-record). */
  critical: boolean;
  /** The module file exists with content. */
  present: boolean;
  /** Scored against the module's grammar, the same as a core section. */
  score: SectionScore;
}

export interface DepartmentSummary {
  slug: string;
  name: string;
  /** One line — the department's purpose, pulled from its charter. */
  purpose: string;
  score: DepartmentScore;
}

export interface Department extends DepartmentSummary {
  sections: DepartmentSection[];
  modules: DepartmentModule[];
}

function safeSlug(slug: string): string | null {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

/** The department's display name: charter frontmatter `name`/`title`, its H1, else the slug prettified. */
function nameFrom(charter: string | undefined, slug: string): string {
  const { meta, body } = parseFrontmatter(charter ?? "");
  const fm = meta["name"] ?? meta["title"];
  if (typeof fm === "string" && fm.trim()) return fm.trim();
  const h1 = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
  if (h1) return h1.replace(/\s*—.*$/, "").trim();
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** The department's purpose line: charter frontmatter `purpose`/`summary`, else the first
 *  paragraph under a Purpose/Vision/Mission heading, else the first paragraph of the body. */
function purposeFrom(charter: string | undefined): string {
  const { meta, body } = parseFrontmatter(charter ?? "");
  const fm = meta["purpose"] ?? meta["summary"] ?? meta["mission"];
  if (typeof fm === "string" && fm.trim()) return fm.trim();
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{1,6}\s+.*(purpose|zweck|vision|mission)/i.test(l));
  const from = start >= 0 ? start + 1 : 0;
  for (let i = from; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (l === "" || l.startsWith("#") || l.startsWith(">")) continue;
    return l.replace(/^[*_>-]+\s*/, "").replace(/\*\*/g, "").slice(0, 240);
  }
  return "";
}

/** Read one department's core files from the seam (falling back to the bundled seed). */
async function readCoreFiles(slug: string): Promise<Record<string, string | undefined>> {
  const files: Record<string, string | undefined> = {};
  await Promise.all(
    CORE_SECTIONS.map(async (s) => {
      const live = await readContent(organizationRepo(), `${DEPTS}/${slug}/${sectionSubdir(s.key)}/${s.key}.md`).catch(() => undefined);
      files[s.key] = live ?? bundledDepartment(slug)?.[s.key];
    }),
  );
  return files;
}

/** The department slugs present in the org repo (falling back to the bundled seed). */
export async function listDepartmentSlugs(): Promise<string[]> {
  const entries = await listContent(organizationRepo(), DEPTS).catch(() => []);
  const live = entries.filter((e) => e.type === "dir").map((e) => e.name).filter((n) => safeSlug(n));
  const seed = bundledDepartments();
  const merged = new Set<string>([...live, ...seed]);
  return [...merged].sort();
}

/** A scored summary per department — what the org map lists. Never throws. */
export async function listDepartments(): Promise<DepartmentSummary[]> {
  const slugs = await listDepartmentSlugs();
  const out = await Promise.all(
    slugs.map(async (slug): Promise<DepartmentSummary> => {
      const files = await readCoreFiles(slug);
      return {
        slug,
        name: nameFrom(files["charter"], slug),
        purpose: purposeFrom(files["charter"]),
        score: scoreDepartment(CORE_SECTIONS, files),
      };
    }),
  );
  return out.sort((a, b) => b.score.score - a.score.score || a.name.localeCompare(b.name));
}

/** One department in full: every core section scored, plus any modules it has written. */
export async function readDepartment(slugInput: string): Promise<Department | null> {
  const slug = safeSlug(slugInput);
  if (!slug) return null;
  const slugs = await listDepartmentSlugs();
  if (!slugs.includes(slug)) return null;

  const files = await readCoreFiles(slug);
  const score = scoreDepartment(CORE_SECTIONS, files);
  const byKey = new Map(score.sections.map((s) => [s.key, s]));

  const sections: DepartmentSection[] = CORE_SECTIONS.map((def) => {
    const source = files[def.key] ?? "";
    return {
      key: def.key,
      title: def.title,
      source,
      body: parseFrontmatter(source).body,
      score: byKey.get(def.key)!,
    };
  });

  // Every module, scored — present ones filled, absent ones at 0 so the UI can offer to
  // start them. Modules are first-class scored sections now, not read-only prose.
  const modules: DepartmentModule[] = await Promise.all(
    MODULE_SECTIONS.map(async (m): Promise<DepartmentModule> => {
      const live = await readContent(organizationRepo(), `${DEPTS}/${slug}/${sectionSubdir(m.key)}/${m.key}.md`).catch(() => undefined);
      const source = live ?? bundledDepartment(slug)?.[m.key] ?? "";
      return {
        key: m.key,
        title: m.title,
        trigger: m.trigger,
        source,
        body: parseFrontmatter(source).body,
        critical: m.critical === true,
        present: source.trim() !== "",
        score: scoreSection(m, source),
      };
    }),
  );

  return {
    slug,
    name: nameFrom(files["charter"], slug),
    purpose: purposeFrom(files["charter"]),
    score,
    sections,
    modules,
  };
}

/** The framework document itself, surfaced read-only on the org overview. */
export async function readFramework(): Promise<string | undefined> {
  const live = await readContent(organizationRepo(), "framework.md").catch(() => undefined);
  return live ?? bundledFramework();
}

export { sectionDef };
