/**
 * Auto-derived funnel artifacts — the seam that stops a demand from landing bare.
 *
 * When a demand is committed to the funnel it carries only its `README.md`; the
 * standardized `requirements.md`, `analysis.md`, and a first `business-case.md`
 * draft used to require a human to open each case and click "generate". Those
 * three drafters are already DETERMINISTIC and pure (`analyseIntake` +
 * `buildRequirementsMarkdown`/`buildAnalysisMarkdown`, and `draftBusinessCaseMarkdown`,
 * which is honest — it never invents a value), so nothing about generating them
 * needs a human or a model. This module runs them automatically, once, when the
 * demand lands.
 *
 * Two rules make it safe to run on autopilot:
 *   - **Idempotent** — every artifact is written only if it is ABSENT, so a human's
 *     later edits are never overwritten and re-running is a no-op.
 *   - **Deterministic / offline** — it never generates `research.md` (the only
 *     model-driven artifact), so it runs identically with no credentials and cannot
 *     fail CI. `research.md` stays an on-demand action on `/api/requirements`.
 *
 * Called from the flush route (for each just-committed demand) and, as a backstop,
 * from the advance route — so a demand created by any path still gets its artifacts.
 */

import { parseUseCase } from "../parse.js";
import { parseDemandToAnswers } from "../demand.js";
import { analyseIntake, buildRequirementsMarkdown, buildAnalysisMarkdown } from "../requirements.js";
import { draftBusinessCaseMarkdown } from "../business-case-draft.js";
import { readDemand, readArtifact, saveArtifact } from "../demands-store.js";
import { listPersonas } from "../persona-library-store.js";
import { mapPool } from "../pool.js";

export interface DeriveResult {
  id: string;
  /** Artifact names newly written this run (subset of requirements/analysis/business-case). */
  generated: string[];
  /** Artifact names already present, left untouched. */
  skipped: string[];
}

export interface DeriveOptions {
  /** Local funnel root for the offline path (tests). */
  baseDir?: string;
  /** Fixed YYYY-MM-DD stamp for deterministic output; defaults to today. */
  generatedOn?: string;
}

/** Strip the `UC-YYYY-NNNN · ` id prefix from a case title, falling back to the id. */
function titleOf(md: string, id: string): string {
  return parseUseCase(md).title?.replace(/^UC-\d{4}-\d+\s*·\s*/, "") ?? id;
}

/**
 * Generate the deterministic funnel artifacts for one demand, writing only the ones
 * that are absent. Returns which were generated vs skipped. A demand whose README is
 * unreadable derives nothing (returns empty) rather than throwing — a caller can run
 * it fire-and-forget.
 */
export async function ensureDerivedArtifacts(id: string, opts: DeriveOptions = {}): Promise<DeriveResult> {
  const baseDir = opts.baseDir;
  const md = await readDemand(id, baseDir);
  if (md === undefined) return { id, generated: [], skipped: [] };

  const generatedOn = opts.generatedOn ?? new Date().toISOString().slice(0, 10);
  const answers = parseDemandToAnswers(md);
  const meta = { id, title: titleOf(md, id), generatedOn };

  const generated: string[] = [];
  const skipped: string[] = [];

  // 1) requirements + analysis. Compute the (cheap, deterministic) pair once if
  //    EITHER is missing; write each only if absent. Personas enrich the stories'
  //    role citations; a library read that fails must not sink the derivation.
  const haveRequirements = (await readArtifact(id, "requirements", baseDir)) !== undefined;
  const haveAnalysis = (await readArtifact(id, "analysis", baseDir)) !== undefined;
  let requirementsMd = haveRequirements ? await readArtifact(id, "requirements", baseDir) : undefined;

  if (!haveRequirements || !haveAnalysis) {
    const library = await listPersonas().catch(() => []);
    const { analysis, requirements } = analyseIntake(answers, library);
    if (!haveRequirements) {
      requirementsMd = buildRequirementsMarkdown(meta, requirements);
      await saveArtifact(id, "requirements", requirementsMd, { baseDir, message: `Auto-derive requirements for ${id}` });
      generated.push("requirements");
    } else {
      skipped.push("requirements");
    }
    if (!haveAnalysis) {
      await saveArtifact(id, "analysis", buildAnalysisMarkdown(meta, analysis), { baseDir, message: `Auto-derive analysis for ${id}` });
      generated.push("analysis");
    } else {
      skipped.push("analysis");
    }
  } else {
    skipped.push("requirements", "analysis");
  }

  // 2) business-case draft — honest (leaves the value "to be quantified"); seeded
  //    from the requirements markdown when we have it.
  if ((await readArtifact(id, "business-case", baseDir)) !== undefined) {
    skipped.push("business-case");
  } else {
    await saveArtifact(id, "business-case", draftBusinessCaseMarkdown(meta, answers, requirementsMd), {
      baseDir,
      message: `Auto-draft business case for ${id}`,
    });
    generated.push("business-case");
  }

  return { id, generated, skipped };
}

/** How many demands to derive in parallel — bounded to respect git rate limits. */
const DERIVE_CONCURRENCY = 4;

/**
 * Derive artifacts for many demands with bounded concurrency, never letting one
 * demand's failure sink the batch. Used by the flush route over the ids it just
 * committed. Returns the per-demand results (a failed one contributes an empty result).
 */
export async function deriveForIds(ids: readonly string[], opts: DeriveOptions = {}): Promise<DeriveResult[]> {
  return mapPool(ids, DERIVE_CONCURRENCY, (id) =>
    ensureDerivedArtifacts(id, opts).catch((): DeriveResult => ({ id, generated: [], skipped: [] })),
  );
}
