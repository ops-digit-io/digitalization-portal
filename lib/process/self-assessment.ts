/**
 * Kurzform-Selbst-Assessment als Intake-Vorfilter (Katalog A §7.3, Ablauf B §7).
 *
 * Sieben Kriterien, die ein Spoke ohne Assessor grob selbst einstuft — billig,
 * parallelisierbar, 1.400-fähig. Sie decken die drei K.o.s, den Business-Bezug und
 * die Datenlage ab; mehr braucht die Triage nicht. Das volle Assessment prüft sie
 * nach (systematische Abweichung Selbstbild ↔ Befund ist selbst ein D8-Befund).
 *
 * Der Vorfilter läuft VOR dem Intake: nur was ihn passiert, bekommt Hub-Zeit.
 */

import { SELF_ASSESSMENT, byId, type Level } from "./criteria";

export const SELF_CRITERIA = SELF_ASSESSMENT.map((id) => byId[id]!);

export type Recommendation = "aufnehmen" | "enabler" | "zurueckstellen" | "selbsthilfe";

export interface Triage {
  recommendation: Recommendation;
  headline: string;
  reason: string;
  /** Non-blocking warnings surfaced for the intake conversation. */
  warnings: string[];
  /** Coverage: how many of the 7 have been rated. */
  rated: number;
  total: number;
}

const REC_HEADLINE: Record<Recommendation, string> = {
  aufnehmen: "Aufnehmen",
  enabler: "Aufnehmen — als Enabler (Zweig 1b)",
  zurueckstellen: "Zurückstellen",
  selbsthilfe: "An den Spoke — Selbsthilfe mit Playbook",
};

/**
 * Triage from the seven self-rated levels (S1–S5). The hard gate is the spoke
 * (K8.1): kein Spoke → keine Aufnahme. An Optimierungs-K.o. (K5.1/K2.2 = S1)
 * bedeutet Aufnahme nur als Enabler. Ein sonst gesundes, gut verstandenes Bild
 * kann per Playbook in die Selbsthilfe. Alles andere: aufnehmen.
 */
export function triage(levels: Record<string, Level | undefined>): Triage {
  const L = (id: string) => levels[id];
  const rated = SELF_ASSESSMENT.filter((id) => L(id) !== undefined).length;
  const total = SELF_ASSESSMENT.length;
  const warnings: string[] = [];

  // Non-blocking findings for the intake conversation.
  if (L("K4.1") === 1) warnings.push("Ziel-Statement fehlt (K4.1=S1) — am Recon-Tor Kill-Kandidat, wenn kein Ziel formulierbar ist.");
  if ((L("K4.4") ?? 5) <= 2) warnings.push("Mengengerüst/Business-Bezug dünn (K4.4) — Addressable Value vor der Priorisierung schärfen.");
  if ((L("K1.1") ?? 5) <= 2) warnings.push("Keine aktuelle Prozessdarstellung (K1.1) — die Recon erzeugt sie, aber der Start ist teurer.");
  if ((L("K3.1") ?? 5) <= 2) warnings.push("Durchlaufzeit nicht gemessen (K3.1) — Stufe P in der Baseline nachziehen.");

  const spoke = L("K8.1");
  if (spoke === 1) {
    return {
      recommendation: "zurueckstellen", headline: REC_HEADLINE.zurueckstellen,
      reason: "Kein benannter Verantwortlicher mit Änderungsbefugnis (K8.1=S1). Kein Engagement ohne Spoke — auch nicht bei hohem Value.",
      warnings, rated, total,
    };
  }

  const ts = L("K5.1");
  const iface = L("K2.2");
  if (ts === 1 || iface === 1) {
    const which = [ts === 1 ? "Messbarkeit (K5.1)" : null, iface === 1 ? "Interface-Zugang (K2.2)" : null].filter(Boolean).join(" und ");
    return {
      recommendation: "enabler", headline: REC_HEADLINE.enabler,
      reason: `Optimierungs-K.o.: ${which} auf S1. Erste und einzige Intervention: das herstellen (Zweig 1b) — kein Optimierungsversprechen darüber hinaus.`,
      warnings, rated, total,
    };
  }

  // Sonst gesund und gut verstanden → kann der Spoke mit Playbook selbst tragen.
  const healthy =
    (spoke ?? 0) >= 4 &&
    (L("K5.1") ?? 0) >= 4 && (L("K2.2") ?? 0) >= 4 &&
    (L("K1.1") ?? 0) >= 4 && (L("K3.1") ?? 0) >= 4 && (L("K4.1") ?? 0) >= 4;
  if (rated === total && healthy) {
    return {
      recommendation: "selbsthilfe", headline: REC_HEADLINE.selbsthilfe,
      reason: "Spoke stark, messbar, dokumentiert, Ziel klar — das trägt der Spoke mit einem Playbook selbst. Hub-Zeit für schwierigere Prozesse aufsparen.",
      warnings, rated, total,
    };
  }

  return {
    recommendation: "aufnehmen", headline: REC_HEADLINE.aufnehmen,
    reason: "Spoke-Minimum plausibel und keine K.o. auf S1. Der Prozess geht ins volle Assessment.",
    warnings, rated, total,
  };
}
