/**
 * Assembles the coaching prompt for ONE health dimension (coach-then-rate).
 *
 * Injects: the shared guidance + the coaching-stance playbook (from the registry),
 * then this dimension's criteria straight from the Kriterienkatalog (question,
 * required evidence, and the S1–S5 scale), plus the engagement context and any
 * evidence already captured. The coach gathers evidence and PROPOSES an S-level per
 * criterion; the assessor confirms the rating in the UI.
 */

import { dimById, criteriaOf } from "./criteria";
import * as store from "./store";
import { shared, dimensionCoach } from "./prompts";

function criteriaBlock(dimId: string): string {
  return criteriaOf(dimId)
    .map((c) => {
      const scale = c.scale.map((s, i) => `  S${i + 1}: ${s}`).join("\n");
      return `### ${c.id} — ${c.label}${c.knockout ? ` 〔K.o. ${c.knockout}〕` : ""}${c.perComponent ? " (je Kernkomponente)" : ""}
Frage: ${c.question}
Evidenz: ${c.evidence}
Skala:
${scale}`;
    })
    .join("\n\n");
}

export async function build(slug: string, dimId: string, mode: "live" | "export" = "live"): Promise<string> {
  const dim = dimById[dimId];
  if (!dim) throw new Error(`unknown dimension ${dimId}`);
  const m = (await store.meta(slug))!;
  const [sharedText, stance, draft] = await Promise.all([shared(), dimensionCoach(), store.readDimension(slug, dimId)]);

  const head = `Du erhebst die Dimension ${dim.id} — „${dim.label}" (Gewicht ${dim.weight} %) — einer
Prozessdiagnose bei OESL Automotive.

Engagement: ${m.title}
Prozessverantwortlicher: ${m.owner || "(nicht erfasst)"}
Champion: ${m.champion || "(nicht erfasst)"}
Einheit / Kostenstelle: ${m.unit || "(nicht erfasst)"}
Anflugrichtung: ${m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull"}
${m.components.length ? `Kernkomponenten: ${m.components.map((c) => c.label).join(", ")}` : ""}
Heutiges Datum: ${new Date().toISOString().slice(0, 10)}

Kernfrage der Dimension: ${dim.question}`;

  const tail =
    mode === "export"
      ? `\n\nDu wirst in einen Assistenten außerhalb des Portals eingefügt. Führe die Erhebung
mit dem Menschen vor dir und liefere am Ende je Kriterium: vorgeschlagene S-Stufe +
einzeilige Evidenznotiz + Konfidenz (S/P/I).`
      : `\n\nFühre das Gespräch Kriterium für Kriterium. Frage nach Evidenz, nicht nach Gefühl.
Liefere am Ende je Kriterium: vorgeschlagene S-Stufe + einzeilige Evidenznotiz + Konfidenz.`;

  return [
    head,
    sharedText,
    `<coaching-stance>\n${stance || "(keine Stance im Registry)"}\n</coaching-stance>`,
    `<kriterien dimension="${dim.id}">\n${criteriaBlock(dimId)}\n</kriterien>`,
    draft.trim() ? `<bisherige-evidenz>\nBaue darauf auf; verwirf nichts Belegtes.\n\n${draft}\n</bisherige-evidenz>` : "",
    tail,
  ]
    .filter(Boolean)
    .join("\n\n");
}
