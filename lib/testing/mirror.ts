/**
 * Test-support ONLY: is the portal's external content mirrored locally?
 *
 * The agent library (`du-agent-registry`) and the artefact templates
 * (`du-templates`) live in their own repositories — this repo carries machinery,
 * not method. Tests that validate that content, or exercise behaviour that reads
 * it, need a mirror (`npm run content:pull`, or a CI step that seeds one).
 *
 * Where no mirror is present — notably this repo's CI, which cannot reach another
 * repo's files without a token — those tests SKIP (visibly, via `describe.skipIf`)
 * rather than fail: a red build there would only mean "the app repo can't see the
 * registry repo", which is not a defect in the app. Every environment that HAS
 * the content (local dev, a mirror-seeded CI) runs them in full.
 *
 * Not imported by any runtime code path; it only supports the test suite.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { registryRepo, templatesRepo } from "../content-repo.js";

/** A registry mirror (playbooks/skills/contracts) is present. */
export const hasRegistryMirror = existsSync(join(registryRepo().mirrorDir, "playbooks"));

/** A templates mirror (section/advisory templates) is present. */
export const hasTemplatesMirror = existsSync(join(templatesRepo().mirrorDir, "sections"));

/** Both mirrors are present — for tests that read library and templates together. */
export const hasContentMirror = hasRegistryMirror && hasTemplatesMirror;

/** Emit a one-line reason so a skipped run says why, instead of going quiet. */
export function warnNoMirror(suite: string): void {
  if (!hasRegistryMirror) {
    console.warn(`${suite}: skipped — no content mirror. Run \`npm run content:pull\` (or seed it in CI) to validate against the real library/templates.`);
  }
}
