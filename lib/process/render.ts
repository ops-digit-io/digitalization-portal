/**
 * A one-function template renderer for the prompt library.
 *
 * Every prompt this module sends to a model lives in `playbooks/` (registry
 * first, bundled copy as fallback) rather than in the code, so the wording is
 * editable in the Skills & Playbooks catalog without a deploy. The code supplies
 * only the facts; the playbook decides how they are phrased.
 *
 * Placeholders are `{{name}}`. An unknown or empty placeholder collapses to an
 * empty string rather than leaking `{{name}}` into a prompt, and a line whose
 * placeholders ALL came out empty is dropped entirely — label and all.
 *
 * That last rule is about what the reader concludes. "Champion:" with nothing
 * after it reads as a question that was asked and came back empty; the line simply
 * not being there reads as a field that did not apply. The prompts are pasted into
 * assistants by hand now, so the difference is one a human sees.
 */

export type Vars = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

const value = (vars: Vars, k: string): string => {
  const v = vars[k];
  return v === undefined || v === null ? "" : String(v);
};

export function render(template: string, vars: Vars): string {
  return template
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(PLACEHOLDER)].map((m) => m[1]!);
      // A line with no placeholder is literal text and always survives; a line
      // that has them survives only if at least one carried a value.
      return keys.length === 0 || keys.some((k) => value(vars, k).trim() !== "");
    })
    .map((line) => line.replace(PLACEHOLDER, (_m, k: string) => value(vars, k)))
    .join("\n");
}
