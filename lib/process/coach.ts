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

/** Directive that pins the agent's reply language to the user's locale. */
function speak(locale: Locale): string {
  return locale === "de" ? "Antworte auf Deutsch." : "Respond in English.";
}

function criteriaBlock(dimId: string, locale: Locale): string {
  return criteriaOf(dimId)
    .map((c) => {
      const ct = C.critText(locale, c.id);
      const scale = ct.scale.map((s, i) => `  ${i + 1}: ${s}`).join("\n");
      return `### ${c.id} — ${ct.label}${c.knockout ? ` 〔K.o. ${c.knockout}〕` : ""}${c.perComponent ? " (je Kernkomponente)" : ""}
Frage: ${ct.question}
Evidenz: ${ct.evidence}
Skala:
${scale}`;
    })
    .join("\n\n");
}

export async function build(slug: string, dimId: string, locale: Locale = "en"): Promise<string> {
  const dim = dimById[dimId];
  if (!dim) throw new Error(`unknown dimension ${dimId}`);
  const dt = C.dimText(locale, dimId);
  const m = (await store.meta(slug))!;
  const [sharedText, stance, draft] = await Promise.all([shared(), dimensionCoach(), store.readDimension(slug, dimId)]);

  const [headTpl, tailTpl] = await Promise.all([agentPrompt("dimension"), agentPrompt("dimension-tail")]);
  const head = render(headTpl, {
    dimId: dim.id, dimLabel: dt.label, weight: dim.weight, dimQuestion: dt.question,
    title: m.title, owner: m.owner, champion: m.champion, unit: m.unit,
    anflug: m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull",
    components: m.components.map((c) => c.label).join(", "),
    today: new Date().toISOString().slice(0, 10),
  });
  const tail = `\n\n${render(tailTpl, { speak: speak(locale) })}`;

  return [
    head,
    sharedText,
    `<coaching-stance>\n${stance || "(keine Stance im Registry)"}\n</coaching-stance>`,
    `<kriterien dimension="${dim.id}">\n${criteriaBlock(dimId, locale)}\n</kriterien>`,
    draft.trim() ? `<bisherige-evidenz>\nBaue darauf auf; verwirf nichts Belegtes.\n\n${draft}\n</bisherige-evidenz>` : "",
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
export async function buildSection(slug: string, key: string, locale: Locale = "en"): Promise<string> {
  const sec = sectionByKey[key];
  if (!sec) throw new Error(`unknown section ${key}`);
  const group = groupById[sec.group];
  const m = (await store.meta(slug))!;
  const [sharedText, stance, current] = await Promise.all([shared(), sectionCoach(key), store.readSection(slug, key)]);

  // Prior context: the sections earlier in the sequence that already have content.
  const priorParts: string[] = [];
  for (const p of SECTIONS.filter((x) => x.order < sec.order)) {
    const c = (await store.readSection(slug, p.key)).trim();
    if (c) priorParts.push(`<abschnitt key="${p.key}" titel="${p.label}">\n${c.slice(0, 2000)}\n</abschnitt>`);
  }

  const [headTpl, tailTpl] = await Promise.all([agentPrompt("section"), agentPrompt("section-tail")]);
  const head = render(headTpl, {
    sectionLabel: sec.label, sectionOrder: sec.order,
    stageOrder: group?.order, stageLabel: group?.label,
    description: sec.description, gateQuestion: sec.gateQuestion,
    title: m.title, owner: m.owner, champion: m.champion, unit: m.unit,
    anflug: m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull",
    components: m.components.map((c) => c.label).join(", "),
  });
  const tail = `\n\n${render(tailTpl, { speak: speak(locale) })}`;

  return [
    head,
    sharedText,
    // How to run THIS interview — the section's own coaching prompt.
    stance ? `<coaching-prompt>\n${stance}\n</coaching-prompt>` : "",
    `<vorlage>\n${sec.template}\n</vorlage>`,
    priorParts.length ? `<vorherige-abschnitte>\n${priorParts.join("\n\n")}\n</vorherige-abschnitte>` : "",
    current.trim() ? `<aktueller-stand>\nBaue darauf auf; verwirf nichts Belegtes.\n\n${current}\n</aktueller-stand>` : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}


