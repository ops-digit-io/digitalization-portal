/**
 * The German reading of the ported model.
 *
 * `sections.ts`, `advisory.ts` and `score-model.ts` are verbatim ports of the
 * source tool and stay English — the grader matches English headings, and the
 * score model was checked against the original on 62 cases. So none of them is
 * translated in place. This file is a display overlay: same ids, German words.
 *
 * The rule for what belongs here is the same as everywhere else in the module:
 * anything a user READS is translatable, anything the machine MATCHES is not.
 * Section templates and coaching prompts therefore stay English — a German
 * template would produce artefacts the schemas cannot grade.
 */

export interface SectionDe {
  label: string;
  description: string;
  gateQuestion?: string;
}

/** Section key → German. Keys are the fourteen in `sections.ts`. */
export const SECTIONS_DE: Record<string, SectionDe> = {
  profile: {
    label: "Prozessprofil",
    description:
      "Wer den Prozess verantwortet, wo er anfängt und aufhört, wer darin arbeitet und welcher Bereich die Kosten trägt.",
    gateQuestion:
      "Gibt es eine namentlich benannte Person mit der Befugnis, diesen Prozess zu ändern, und ist sie für die Erhebung erreichbar? Ohne Spoke kein Intake.",
  },
  purpose: {
    label: "Zweck & Zielbild",
    description:
      "Was der Prozess leisten soll, in einem Satz, aus dem prüfbare Kriterien folgen. Und: Wenn Sie ihn von Grund auf neu bauen würden — wann wäre er gut?",
    gateQuestion:
      "Gibt es einen Zwecksatz, aus dem sich mindestens drei prüfbare Kriterien ableiten lassen?",
  },
  mapping: {
    label: "Prozessdarstellung & Artefakte",
    description:
      "Wie der Prozess heute dokumentiert ist, wie aktuell das ist, welche Artefakte aktiv gepflegt werden und welche eingefroren sind.",
  },
  toolchain: {
    label: "Werkzeugkette & Systembrüche",
    description:
      "Welche Werkzeuge beteiligt sind, wo die Kette bricht und ob sich die Daten überhaupt herausholen lassen.",
  },
  flow: {
    label: "Fluss, Reibung & Liegezeit",
    description:
      "Wertstrom: wie viele Hände anfassen, wie oft Arbeit liegen bleibt, wie lange, und wo die dominante Liegezeit sitzt.",
  },
  kpi: {
    label: "Kennzahlenebene",
    description:
      "Welche Kennzahlen den Prozess heute beschreiben, ob sie in einem festen Takt erhoben werden und ob sie auf das zeigen, was das Geschäft tatsächlich braucht.",
  },
  diagnostics: {
    label: "Diagnostik & Datenpunkte",
    description:
      "Die Erkenntnisebene unter den Kennzahlen: welche Datenpunkte sagen, WAS schiefläuft. Mindestlatte: Wertstromanalyse möglich, Zeitstempel erntbar.",
    gateQuestion:
      "Lässt sich für diesen Prozess eine Wertstromanalyse erstellen, und sind Zeitstempel zu bekommen — notfalls per Stichprobe?",
  },
  literacy: {
    label: "Organisatorische Voraussetzungen",
    description:
      "Technische und prozessuale Kompetenz der Menschen, die im Prozess arbeiten. Trägt die Organisation eine Veränderung — oder geht sie darin unter?",
  },
  "cost-of-change": {
    label: "Änderungskosten",
    description:
      "Was es kostet, diesen Prozess anzufassen — Risiko, Aufwand, Reibung und Haltbarkeit. Das Gegengewicht zum adressierbaren Wert und das Tor vor jedem Eingriff.",
    gateQuestion:
      "Ist der Wirkradius jeder anzufassenden Komponente benannt, und ist eine Änderungskostenklasse mit Belegen statt mit Behauptungen vergeben?",
  },
  knowledge: {
    label: "Rückkopplung & Wissensfluss",
    description:
      "Hat der Prozess eine eingebaute Rückkopplung? Aus welcher Information darin lässt sich lernen — und welche anderen Bereiche hätten etwas davon, sie zu bekommen?",
  },
  diagnosis: {
    label: "Diagnose & Zweig",
    description:
      "Wo das Problem sitzt: an den Schnittstellen, im Prozessdesign, im Werkzeugkasten — oder der Schritt gehört ersatzlos gestrichen.",
    gateQuestion:
      "Ist genau ein führender Zweig benannt, und ist seine Bedingung belegt statt behauptet?",
  },
  increment: {
    label: "Wertinkrement & Geschwindigkeit",
    description:
      "Der Kern der Methode: die Änderung auf das kleinste Inkrement schneiden, das für sich genommen Wert liefert, den adressierbaren Wert hinter der Technologie benennen und sagen, wie schnell das nächste Inkrement ausgeliefert werden kann.",
    gateQuestion:
      "Gibt es ein Inkrement, das innerhalb eines Iterationszyklus ausgeliefert wird und für sich genommen Wert liefert — und nicht bloß eine Phase eines Big-Bang-Plans ist?",
  },
  iteration: {
    label: "Iterationsauslöser",
    description:
      "Was die nächste Iteration auslöst, wie schnell sie kommen muss und woraus der Auslöser gespeist wird — aus der Diagnostik oder aus dem Gelernten.",
  },
  "business-case": {
    label: "Wirtschaftlichkeitsrechnung",
    description:
      "Vom Wirkungsgespräch zum konkreten Kostenmodell: was sich ändert, was es spart, wie viele Menschen es berührt, was der Weg dorthin kostet und wann es sich rechnet.",
    gateQuestion:
      "Gibt es eine Rechnung, deren Eingangsgrößen einzeln benannt und entweder belegt oder ausdrücklich als Schätzung gekennzeichnet sind?",
  },
};

/** Stage id → German. */
export const STAGES_DE: Record<string, { label: string; subtitle: string }> = {
  discovery: {
    label: "Erfassung",
    subtitle: "Was wir uns ansehen, und wozu es da ist",
  },
  recon: {
    label: "Aufklärung",
    subtitle: "Wie der Prozess heute läuft — Darstellung, Werkzeuge, Fluss",
  },
  measurement: {
    label: "Messung",
    subtitle: "Was wir wissen, und was wir erst erheben müssten",
  },
  capacity: {
    label: "Veränderungsfähigkeit",
    subtitle: "Ob die Organisation die Änderung trägt, und was es kostet, sie anzufassen",
  },
  decision: {
    label: "Entscheidung & Wert",
    subtitle: "Was zu tun ist, wie schnell es ausgeliefert wird, und was es wert ist",
  },
};

/** Advisory pass key → German. */
export const ADVISORY_DE: Record<string, { label: string; description: string }> = {
  challenge: {
    label: "Kritische Rückfragen",
    description:
      "Kritische Rückfragen an die Anamnese: Was fehlt, was ist zu weich belegt, was sollte zusätzlich verfolgt werden — und was passierte, wenn es diesen Teilprozess gar nicht gäbe.",
  },
  clusters: {
    label: "Problemcluster",
    description:
      "Die Befunde aus allen Abschnitten, gebündelt und nach Schwere gereiht, an einer Stelle. Einzelbefunde, verteilt über vierzehn Artefakte, verbergen das Muster.",
  },
  improvements: {
    label: "Verbesserungsideen",
    description:
      "Vorschläge für den Prozess selbst, für den Zuschnitt der Kennzahlen und für deren Kalibrierung — jeder mit seinem Preis, nicht nur mit seinem Nutzen.",
  },
  "target-tech": {
    label: "Zieltechnologie-Karte",
    description:
      "Heute → Übergang oder schneller Gewinn → Zieltechnologie, je Prozessschritt, begründet am Werkzeug-Playbook und beschränkt auf Mittel, denen die Organisation traut und die sie betreiben kann.",
  },
};

/** Score-model dimension key → German label. */
export const SCORE_DIMENSIONS_DE: Record<string, string> = {
  visibility: "Sichtbarkeit",
  shippability: "Lieferfähigkeit",
  carry: "Organisatorische Tragfähigkeit",
  health: "Prozessgesundheit",
  value: "Adressierbarer Wert",
};

/** Knock-out key → German. */
export const KNOCK_OUTS_DE: Record<string, { label: string; statement: string; consequence: string }> = {
  spoke: {
    label: "Verantwortlicher Spoke",
    statement: "Eine namentlich benannte Person im Fachbereich kann eine Änderung an diesem Prozess entscheiden.",
    consequence:
      "Kein Intake. Ein Prozess, für den das Geschäft niemanden abstellt, ist dem Geschäft nicht wichtig genug.",
  },
  timestamps: {
    label: "Zeitstempel erhältlich",
    statement: "Zeitstempel lassen sich ernten — aus Systemen, aus Nebendaten oder per Stichprobe.",
    consequence:
      "Keine Diagnose und keine Wirtschaftlichkeitsrechnung. Zulässig ist einzig, den Prozess messbar zu machen.",
  },
  "interface-access": {
    label: "Schnittstellen zugänglich",
    statement:
      "Die Daten der beteiligten Systeme lassen sich auslesen — per Schnittstelle, per Export oder auf einem vereinbarten Weg.",
    consequence:
      "Die Zweige Werkzeugkasten und Schnittstellen sind tot. Erster Eingriff: Zugang beschaffen oder aushandeln.",
  },
};
