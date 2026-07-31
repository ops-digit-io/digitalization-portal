/**
 * Assembles the system guidance the coaching AGENT runs on for ONE health
 * dimension (coach-then-rate). There is no prompt to paste — this drives the live
 * coach at .../dimension/[dim]/coach and the section generator at
 * .../section/[key]/generate.
 *
 * Injects: the shared guidance + the coaching-stance playbook (from the registry),
 * then this dimension's criteria straight from the Kriterienkatalog (question,
 * required evidence, and the S1–S5 scale), plus the engagement context and any
 * evidence already captured. The coach gathers evidence and PROPOSES an S-level per
 * criterion; the assessor confirms the rating in the UI.
 */

import { dimById, criteriaOf } from "./criteria";
import { sectionByKey, SECTIONS, groupById } from "./sections";
import * as store from "./store";
import { shared, dimensionCoach, sectionCoach, agentPrompt } from "./prompts";
import { render } from "./render";
import * as C from "./content";
import type { Locale } from "../i18n";

/**
 * Where the assembled prompt is going.
 *
 * "live" drives the coach inside the portal; "export" is the same prompt handed to
 * an assistant outside it. The body is identical — only the closing instruction
 * differs, because in export mode nobody is in the portal to answer a follow-up
 * question. This matters more than it sounds: without a model key the export path
 * is the ONLY path, so it cannot be an afterthought.
 */
export type Mode = "live" | "export";

/** Directive that pins the agent's reply language to the user's locale. */
function speak(locale: Locale): string {
  return locale === "de" ? "Antworte auf Deutsch." : "Respond in English.";
}

function criteriaBlock(dimId: string, locale: Locale): string {
  return criteriaOf(dimId)
    .map((c) => {
      const ct = C.critText(locale, c.id);
      const scale = ct.scale.map((s, i) => `  ${i + 1}: ${s}`).join("\n");
      return `### ${c.id} — ${ct.label}${c.knockout ? ` 〔K.o. ${c.knockout}〕` : ""}${c.perComponent ? " (per core component)" : ""}
Question: ${ct.question}
Evidence required: ${ct.evidence}
Scale:
${scale}`;
    })
    .join("\n\n");
}

export async function build(slug: string, dimId: string, locale: Locale = "en", mode: Mode = "live"): Promise<string> {
  const dim = dimById[dimId];
  if (!dim) throw new Error(`unknown dimension ${dimId}`);
  const dt = C.dimText(locale, dimId);
  const m = (await store.meta(slug))!;
  const [sharedText, stance, draft] = await Promise.all([shared(), dimensionCoach(), store.readDimension(slug, dimId)]);

  const [headTpl, tailTpl] = await Promise.all([
    agentPrompt("dimension"),
    agentPrompt(mode === "export" ? "dimension-tail-export" : "dimension-tail"),
  ]);
  const head = render(headTpl, {
    dimId: dim.id, dimLabel: dt.label, weight: dim.weight, dimQuestion: dt.question,
    title: m.title, owner: m.owner, champion: m.champion, unit: m.unit,
    anflug: C.anflugLabel(locale, m.anflug),
    components: m.components.map((c) => c.label).join(", "),
    today: new Date().toISOString().slice(0, 10),
  });
  const tail = `\n\n${render(tailTpl, { speak: speak(locale) })}`;

  return [
    head,
    sharedText,
    `<coaching-stance>\n${stance || "(no stance in the registry)"}\n</coaching-stance>`,
    `<criteria dimension="${dim.id}">\n${criteriaBlock(dimId, locale)}\n</criteria>`,
    draft.trim() ? `<evidence-so-far>\nBuild on this; discard nothing that is evidenced.\n\n${draft}\n</evidence-so-far>` : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * System guidance the agent runs on to GENERATE one anamnesis section (Markdown)
 * from its template, the engagement context and the sections already produced
 * earlier in the sequence. Drives .../section/[key]/generate.
 */
export async function buildSection(slug: string, key: string, locale: Locale = "en", mode: Mode = "live"): Promise<string> {
  const sec = sectionByKey[key];
  if (!sec) throw new Error(`unknown section ${key}`);
  const group = groupById[sec.group];
  const m = (await store.meta(slug))!;
  const [sharedText, stance, current] = await Promise.all([shared(), sectionCoach(key), store.readSection(slug, key)]);

  // Prior context: the sections earlier in the sequence that already have content.
  const priorParts: string[] = [];
  for (const p of SECTIONS.filter((x) => x.order < sec.order)) {
    const c = (await store.readSection(slug, p.key)).trim();
    if (c) priorParts.push(`<section key="${p.key}" label="${C.sectionText(locale, p).label}">\n${c.slice(0, 2000)}\n</section>`);
  }

  const [headTpl, tailTpl] = await Promise.all([
    agentPrompt("section"),
    agentPrompt(mode === "export" ? "section-tail-export" : "section-tail"),
  ]);
  // The framing is read by whoever pastes the prompt, so it follows their locale.
  // The TEMPLATE stays English regardless: the grader matches English headings.
  const st = C.sectionText(locale, sec);
  const head = render(headTpl, {
    sectionLabel: st.label, sectionOrder: sec.order,
    stageOrder: group?.order, stageLabel: group ? C.stageLabel(locale, group.id, group.label) : undefined,
    description: st.description, gateQuestion: sec.gate ? st.gateQuestion : undefined,
    title: m.title, owner: m.owner, champion: m.champion, unit: m.unit,
    anflug: C.anflugLabel(locale, m.anflug),
    components: m.components.map((c) => c.label).join(", "),
  });
  const tail = `\n\n${render(tailTpl, { speak: speak(locale) })}`;

  return [
    head,
    sharedText,
    // How to run THIS interview — the section's own coaching prompt.
    stance ? `<coaching-prompt>\n${stance}\n</coaching-prompt>` : "",
    `<target-template>\n${sec.template}\n</target-template>`,
    priorParts.length ? `<earlier-sections>\n${priorParts.join("\n\n")}\n</earlier-sections>` : "",
    current.trim() ? `<current-draft>\nBuild on this; discard nothing that is evidenced.\n\n${current}\n</current-draft>` : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}


