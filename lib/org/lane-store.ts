/**
 * Reading a department's lane packs — the third ring.
 *
 * A lane lives under `departments/<slug>/lanes/<lane>/`, one markdown file per scored
 * lane-pack file (`lane.ts`), plus optional `procedures/` and `examples/` directories.
 * Read through the same content seam as everything else (live GitHub → mirror → the
 * bundled seed), and scored by the same machine as the core sections — a lane is just a
 * `SectionDef` set pointed at a different folder.
 *
 * Defensive throughout: a department with no lanes yields an empty list, never an error.
 */

import { listContent, organizationRepo, readContent } from "../content-repo.js";
import { parseFrontmatter } from "../agent/frontmatter.js";
import { LANE_FILES, LANE_DIRS } from "./lane.js";
import { scoreDepartment, type DepartmentScore, type SectionScore } from "./scoring.js";
import { authorityLevelOf } from "./scaffold.js";
import { bundledLane, bundledLaneSlugs } from "./seed.js";

const DEPTS = "departments";

export interface LaneFile {
  key: string;
  title: string;
  body: string;
  source: string;
  score: SectionScore;
}

export interface LaneSummary {
  slug: string;
  name: string;
  /** Completeness across the lane-pack files. */
  score: DepartmentScore;
  /** The authority level from the agent-brief, if it names exactly one. */
  authority: string | null;
}

export interface Lane extends LaneSummary {
  files: LaneFile[];
  /** Optional directories present in the pack (procedures, examples). */
  dirs: string[];
}

function safeSlug(slug: string): string | null {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

function prettyName(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function laneFiles(deptSlug: string, laneSlug: string): Promise<Record<string, string | undefined>> {
  const files: Record<string, string | undefined> = {};
  await Promise.all(
    LANE_FILES.map(async (f) => {
      const live = await readContent(organizationRepo(), `${DEPTS}/${deptSlug}/lanes/${laneSlug}/${f.key}.md`).catch(() => undefined);
      files[f.key] = live ?? bundledLane(deptSlug, laneSlug)?.[f.key];
    }),
  );
  return files;
}

/** The lane slugs present for a department (live folders unioned with the seed). */
export async function listLaneSlugs(deptSlug: string): Promise<string[]> {
  const slug = safeSlug(deptSlug);
  if (!slug) return [];
  const entries = await listContent(organizationRepo(), `${DEPTS}/${slug}/lanes`).catch(() => []);
  const live = entries.filter((e) => e.type === "dir").map((e) => e.name).filter((n) => safeSlug(n));
  return [...new Set<string>([...live, ...bundledLaneSlugs(slug)])].sort();
}

/** A scored summary per lane — what the department page lists. */
export async function listLanes(deptSlug: string): Promise<LaneSummary[]> {
  const slugs = await listLaneSlugs(deptSlug);
  const out = await Promise.all(
    slugs.map(async (laneSlug): Promise<LaneSummary> => {
      const files = await laneFiles(deptSlug, laneSlug);
      return {
        slug: laneSlug,
        name: prettyName(laneSlug),
        score: scoreDepartment(LANE_FILES, files),
        authority: authorityLevelOf(files["agent-brief"]),
      };
    }),
  );
  return out.sort((a, b) => b.score.score - a.score.score || a.name.localeCompare(b.name));
}

/** One lane in full: every pack file scored, plus which optional dirs are present. */
export async function readLane(deptSlug: string, laneSlugInput: string): Promise<Lane | null> {
  const dept = safeSlug(deptSlug);
  const laneSlug = safeSlug(laneSlugInput);
  if (!dept || !laneSlug) return null;
  const slugs = await listLaneSlugs(dept);
  if (!slugs.includes(laneSlug)) return null;

  const files = await laneFiles(dept, laneSlug);
  const score = scoreDepartment(LANE_FILES, files);
  const byKey = new Map(score.sections.map((s) => [s.key, s]));

  const laneFileList: LaneFile[] = LANE_FILES.map((def) => {
    const source = files[def.key] ?? "";
    return { key: def.key, title: def.title, source, body: parseFrontmatter(source).body, score: byKey.get(def.key)! };
  });

  const dirs: string[] = [];
  await Promise.all(
    LANE_DIRS.map(async (d) => {
      const ents = await listContent(organizationRepo(), `${DEPTS}/${dept}/lanes/${laneSlug}/${d}`).catch(() => []);
      if (ents.length > 0) dirs.push(d);
    }),
  );

  return {
    slug: laneSlug,
    name: prettyName(laneSlug),
    score,
    authority: authorityLevelOf(files["agent-brief"]),
    files: laneFileList,
    dirs: dirs.sort(),
  };
}
