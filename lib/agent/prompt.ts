/**
 * Offline-provider helper. The analyst's *behaviour* is no longer hardcoded here —
 * it is loaded dynamically from the library (`lib/agent/analyst-guideline.ts`:
 * the `portfolio-query` playbook + `portfolio-analysis` skill). This module keeps
 * only the structural facts-block helper the offline provider recognises.
 */

/** A wrapper the offline provider recognises: embeds tool inputs as a facts block. */
export function factsBlock(facts: unknown): string {
  return "```facts\n" + JSON.stringify(facts) + "\n```";
}
