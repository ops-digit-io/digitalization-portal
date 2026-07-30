/**
 * Assembles the system guidance the coaching AGENT runs on for ONE health
 * dimension (coach-then-rate). There is no prompt to paste — this drives the live
 * coach at .../dimension/[dim]/coach and the artefact generator at
 * .../artefact/[id]/generate.
 *
 * Injects: the shared guidance + the coaching-stance playbook (from the registry),
 * then this dimension's criteria straight from the Kriterienkatalog (question,
 * required evidence, and the S1–S5 scale), plus the engagement context and any
 * evidence already captured. The coach gathers evidence and PROPOSES an S-level per
 * criterion; the assessor confirms the rating in the UI.
 */

import { dimById, criteriaOf } from "./criteria";
import { artefactById, artefactsOf } from "./artefacts";
import { byPhase } from "./phases";
import * as store from "./store";
import { shared, dimensionCoach } from "./prompts";
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

  const head = `Du erhebst die Dimension ${dim.id} — „${dt.label}" (Gewicht ${dim.weight} %) — einer
Prozessdiagnose bei OESL Automotive.

Engagement: ${m.title}
Prozessverantwortlicher: ${m.owner || "(nicht erfasst)"}
Champion: ${m.champion || "(nicht erfasst)"}
Einheit / Kostenstelle: ${m.unit || "(nicht erfasst)"}
Anflugrichtung: ${m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull"}
${m.components.length ? `Kernkomponenten: ${m.components.map((c) => c.label).join(", ")}` : ""}
Heutiges Datum: ${new Date().toISOString().slice(0, 10)}

Kernfrage der Dimension: ${dt.question}`;

  const tail = `\n\nFühre das Gespräch Kriterium für Kriterium. Frage nach Evidenz, nicht nach Gefühl.
Liefere am Ende je Kriterium: vorgeschlagene Stufe (1–5) + einzeilige Evidenznotiz + Konfidenz.
${speak(locale)}`;

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
 * System guidance the agent runs on to GENERATE a phase artefact (Markdown) from
 * its template, the engagement context and the artefacts already produced in
 * earlier phases. Drives .../artefact/[id]/generate.
 */
export async function buildArtefact(slug: string, artefactId: string, locale: Locale = "en"): Promise<string> {
  const a = artefactById[artefactId];
  if (!a) throw new Error(`unknown artefact ${artefactId}`);
  const at = C.artefactText(locale, artefactId);
  const m = (await store.meta(slug))!;
  const [sharedText, current] = await Promise.all([shared(), store.readArtefact(slug, artefactId)]);

  // Prior context: the artefacts of earlier phases that already have content.
  const phaseN = byPhase[a.phase]?.n ?? 0;
  const priorArtefacts = ARTEFACTS_BEFORE(phaseN);
  const priorParts: string[] = [];
  for (const p of priorArtefacts) {
    const c = (await store.readArtefact(slug, p.id)).trim();
    if (c) priorParts.push(`<artefakt phase="${p.phase}" titel="${C.artefactText(locale, p.id).title}">\n${c.slice(0, 2000)}\n</artefakt>`);
  }

  const head = `Du erzeugst das Artefakt „${at.title}" (Phase ${byPhase[a.phase]?.n} — ${C.phaseText(locale, a.phase).label})
einer Prozessdiagnose bei OESL Automotive.

Engagement: ${m.title}
Prozessverantwortlicher: ${m.owner || "(nicht erfasst)"}
Champion: ${m.champion || "(nicht erfasst)"}
Einheit: ${m.unit || "(nicht erfasst)"}
Anflug: ${m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull"}
${m.components.length ? `Kernkomponenten: ${m.components.map((c) => c.label).join(", ")}` : ""}

Zweck dieses Artefakts: ${at.purpose}

DISZIPLIN
- Fülle die Vorlage aus. Erfinde keine Zahlen oder Namen; wo etwas nicht erhoben ist,
  schreibe „nicht erhoben" und nenne, was es erheben würde. Keine eckigen Platzhalter.
- Zahlen tragen ihre Konfidenzstufe (Selbstauskunft/Stichprobe/instrumentiert). Eine reine Selbstauskunft ist keine Baseline.
- Behalte Überschriften und Tabellenspalten der Vorlage bei; sie werden gerendert.`;

  const tail = `\n\nErhebe das Fehlende Schritt für Schritt. Wenn du genug hast, liefere das fertige Artefakt
in einem einzigen fenced-Markdown-Block, damit es verbatim gespeichert werden kann.
${speak(locale)}`;

  return [
    head,
    sharedText,
    `<vorlage>\n${at.template}\n</vorlage>`,
    priorParts.length ? `<vorherige-artefakte>\n${priorParts.join("\n\n")}\n</vorherige-artefakte>` : "",
    current.trim() ? `<aktueller-stand>\nBaue darauf auf; verwirf nichts Belegtes.\n\n${current}\n</aktueller-stand>` : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Artefacts of all phases strictly before phase number n. */
function ARTEFACTS_BEFORE(n: number) {
  const out = [] as ReturnType<typeof artefactsOf>;
  for (let i = 0; i < n; i++) out.push(...artefactsOf(`P${i}`));
  return out;
}
