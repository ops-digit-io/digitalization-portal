/**
 * A one-function template renderer for the prompt library.
 *
 * Every prompt this module sends to a model lives in `playbooks/` (registry
 * first, bundled copy as fallback) rather than in the code, so the wording is
 * editable in the Skills & Playbooks catalog without a deploy. The code supplies
 * only the facts; the playbook decides how they are phrased.
 *
 * Placeholders are `{{name}}`. An unknown or empty placeholder collapses to an
 * empty string rather than leaking `{{name}}` into a prompt, and a whole line is
 * dropped when its only content was an empty placeholder — that keeps optional
 * context (a champion, a gate question) from leaving blank lines behind.
 */

export type Vars = Record<string, string | number | null | undefined>;

export function render(template: string, vars: Vars): string {
  const filled = template.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
  // Drop lines that existed only to carry an empty placeholder.
  return filled
    .split("\n")
    .filter((line, i, all) => {
      if (line.trim() !== "") return true;
      const had = /\{\{\w+\}\}/.test(template.split("\n")[i] ?? "");
      return !had;
    })
    .join("\n");
}
