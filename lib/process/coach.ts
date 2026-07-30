/**
 * Assembles the prompt that drives a coaching session. Same construction as PDT:
 * two always-injected shared files, the section-specific prompt, the target
 * template, and the live state of prior sections carried forward so the coach
 * never asks the same question twice.
 *
 * Now async: the store reads over git and the coaching prompts load from the
 * playbook registry.
 */

import { byKey, ordered } from "./sections";
import * as store from "./store";
import { template } from "./assets";
import { shared, sectionPrompt } from "./prompts";

/** Short digest of what the earlier sections already established. */
export async function priorContext(slug: string, key: string): Promise<string> {
  const target = byKey[key];
  if (!target) return "";
  const parts: string[] = [];
  for (const s of ordered()) {
    if (s.order >= target.order) break;
    const c = (await store.read(slug, s.key)).trim();
    if (!c) continue;
    const head = c.length > 2500 ? `${c.slice(0, 2500)}\n\n[…truncated, ${c.length} chars total]` : c;
    parts.push(`<prior section="${s.key}" label="${s.label}">\n${head}\n</prior>`);
  }
  return parts.join("\n\n");
}

/**
 * The full prompt for one coaching session. `mode` is 'live' (an AI coach runs the
 * conversation) or 'export' (a human pastes this into their own assistant).
 */
export async function build(slug: string, key: string, mode: "live" | "export" = "live"): Promise<string> {
  const s = byKey[key];
  if (!s) throw new Error(`unknown section ${key}`);
  const m = (await store.meta(slug))!;
  const [current, sharedText, sectionText, prior] = await Promise.all([
    store.read(slug, key),
    shared(),
    sectionPrompt(key),
    priorContext(slug, key),
  ]);

  const head = `You are running section ${s.order} of 14 — "${s.label}" — of a process
diagnosis for OESL Automotive.

Engagement: ${m.title}
Process owner: ${m.owner || "(not recorded)"}
Unit / cost centre: ${m.unit || "(not recorded)"}
Today's date: ${new Date().toISOString().slice(0, 10)}
${m.note ? `Intake note: ${m.note}` : ""}

Section purpose: ${s.description}
${s.gate ? `\nTHIS SECTION IS A GATE. It can fail. Gate question: ${s.gateQuestion}` : ""}

OUTPUT DISCIPLINE — this is checked mechanically, so it is not a style preference.

1. The facts above are known. Use them. The process owner's name, the unit and the date
   are given here; do not write a bracket placeholder where a value was handed to you.
2. NEVER leave a square-bracket placeholder in the finished artefact. The template's
   brackets are instructions to you, not text to keep. If a value is genuinely not
   established, write "not established" and add the question to the open-questions list.
   A placeholder that survives makes the section unscoreable, and a reader cannot tell it
   apart from a value nobody bothered to ask about.
3. Copy the field labels and headings from the template exactly. They are read by a
   machine. Renaming "Process owner" to "Owner" loses the answer even though a human
   would read the two as the same thing.
4. Delete template rows and blocks you have nothing to put in. An example row left with its
   brackets in is worse than no row: it reads as data that was lost rather than never collected.
5. The template's blockquotes and bracketed hints are instructions to YOU. Strip them. What you
   hand back must read as a finished document to someone who has never seen the template.
6. Where you need the name of the person running the session and it has not been given, ask for
   it rather than inventing or bracketing it.`;

  const tail =
    mode === "export"
      ? `\n\nYou are being pasted into an assistant outside the portal. Nobody will answer
your clarifying questions in the portal, so ask them of the human in front of you,
and produce the artefact once you have what you need.`
      : `\n\nRun the conversation turn by turn. Ask one question at a time; do not dump the
whole sequence at once. When you have enough to fill the target format, produce the
complete artefact in a single fenced markdown block so it can be saved verbatim.`;

  return [
    head,
    sharedText,
    `<section-guidance>\n${sectionText || "(no section prompt in the registry yet)"}\n</section-guidance>`,
    `<target-template>\n${template(key) || "(no template on disk yet)"}\n</target-template>`,
    prior,
    current.trim()
      ? `<current-draft>\nThis section already has content. Improve it rather than starting over; \npreserve anything that is already evidenced.\n\n${current}\n</current-draft>`
      : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}
