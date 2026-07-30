/**
 * Die Artefakte je Phase (Ablauf B §3). Jede Phase erzeugt Markdown-Dokumente;
 * das sind die realen Ergebnisse der Diagnose, die im Portal gerendert, editiert
 * und (optional) vom Coach generiert werden. Jedes Artefakt hat eine Vorlage.
 *
 * Das Katalog-Scoring (D1–D8) und das Änderungsrisiko-Tor (7 Prüfpunkte) sind
 * eigene, strukturierte Schritte (nicht als Freitext-Artefakt hier), werden aber
 * in denselben Phasen-Tabs angezeigt.
 */

export interface Artefact {
  id: string;
  phase: string; // "P0".."P5"
  title: string;
  purpose: string;
  template: string;
}

const T = (s: string) => s.replace(/^\n/, "");

export const ARTEFACTS: Artefact[] = [
  // ----------------------------------------------------------- Phase 0
  {
    id: "a0-intake", phase: "P0", title: "Intake-Entscheid",
    purpose: "Kandidat, Anflug, grober Business Case und Spoke-Minimum — Entscheid: aufnehmen, zurückstellen oder an den Spoke mit Playbook.",
    template: T(`
## Kandidat

**Prozess:** …
**Anflugrichtung:** Prozess-Pull | Technologie-Push
**Quelle:** …

## Grober Business Case

**Addressable Value (grob, Stufe S):** …
**Compounding — gleicher Schnitt in weiteren Prozessen?:** …

## Spoke-Minimum

**Verantwortlicher (Änderungsbefugnis):** …
**Champion (Kapazität):** …
**Bereitschaft zur Messung erklärt:** ja | nein

## Entscheid

**Entscheid:** aufnehmen | zurückstellen | Selbsthilfe mit Playbook
**Begründung:** …
`),
  },
  {
    id: "a0-selbstassessment", phase: "P0", title: "Selbst-Assessment (Kurzform)",
    purpose: "Die sieben Kriterien, die der Spoke grob selbst einstuft (Katalog §7.3) — billiger Vorfilter vor der vollen Erhebung.",
    template: T(`
> Grobe Selbsteinschätzung des Spokes, S1–S5. Das volle Assessment prüft nach.

| Kriterium | Stufe (S1–S5) | Notiz |
|---|---|---|
| K8.1 Verantwortlicher Rollen-Spoke | | |
| K4.1 Ziel-Statement | | |
| K4.4 Mengengerüst & Business-Bezug | | |
| K1.1 Prozessdarstellung | | |
| K3.1 Durchlaufzeit gemessen | | |
| K5.1 Timestamp-Farmbarkeit (grob) | | |
| K2.2 Interface-Zugänglichkeit (grob) | | |
`),
  },

  // ----------------------------------------------------------- Phase 1
  {
    id: "a1-prozessdarstellung", phase: "P1", title: "Prozessdarstellung",
    purpose: "Ist-Ablauf inkl. Toolkette und Systembrüchen — wie der Prozess heute wirklich läuft.",
    template: T(`
## Ist-Ablauf

_Schritte vom Auslöser bis zum Ergebnis. Je Schritt: Rolle · Tool · Input → Output._

\`\`\`mermaid
flowchart LR
  A["Auslöser"] --> B["Schritt 1 (Rolle, Tool)"]
  B --> C["Schritt 2"]
  C --> D["Ergebnis"]
\`\`\`

## Schritte

| # | Schritt | Rolle | Tool | Input → Output | Systembruch? |
|---|---|---|---|---|---|
| 1 | … | … | … | … | — |

## Systembrüche

_Stellen, an denen von Hand von einem System ins nächste übertragen wird._

- …
`),
  },
  {
    id: "a1-friktionsliste", phase: "P1", title: "Friktionsliste",
    purpose: "Übergaben, Medienbrüche, Liegestellen — noch qualitativ.",
    template: T(`
| Ort (Schritt/Übergabe) | Was passiert | Art (Übergabe/Medienbruch/Liegestelle) | Evidenz |
|---|---|---|---|
| … | … | … | … |
`),
  },
  {
    id: "a1-zielstatement", phase: "P1", title: "Zielstatement",
    purpose: "Ein Satz, was der Prozess erreichen soll, mit mindestens drei ableitbaren, testbaren Kriterien. Vom Verantwortlichen gezeichnet.",
    template: T(`
## Zielstatement

> _Ein Satz: Wozu gibt es den Prozess, und wann ist er gut?_

## Ableitbare Kriterien

1. **…** (Größe, Einheit, Richtung)
2. **…**
3. **…**

## Greenfield-Test

_Wenn man den Prozess neu bauen würde — was wäre anders, und was hindert daran?_

**Gezeichnet von:** … (Prozessverantwortlicher)
`),
  },
  {
    id: "a1-artefaktsammlung", phase: "P1", title: "Artefaktsammlung",
    purpose: "Die realen Objekte des Prozesses — Listen, Formulare, Reports, Mails — nicht ihre idealisierte Beschreibung.",
    template: T(`
| Artefakt | Typ | Ablageort / System | Pflegestand |
|---|---|---|---|
| … | Liste/Formular/Report/Mail | … | … |
`),
  },

  // ----------------------------------------------------------- Phase 2
  {
    id: "a2-vsm", phase: "P2", title: "Value Stream Map (mit Zahlen)",
    purpose: "Durchlaufzeit, Liegezeiten, Eingriffe, Frequenz — die Recon-Erzählung mit Zahlen unterlegt.",
    template: T(`
| Station | Aktivzeit | Liegezeit | Eingriffe | Konfidenz (S/P/I) |
|---|---|---|---|---|
| … | … | … | … | |

**E2E-Durchlaufzeit:** … (Konfidenz: …)
**Dominante Liegestelle:** …
`),
  },
  {
    id: "a2-latenzprofil", phase: "P2", title: "Latenzprofil",
    purpose: "Wo die Hauptlatenzen sitzen, getrennt nach Latenz ZWISCHEN Schritten (Übergabe) und IN Schritten — je Messpunkt mit Konfidenzstufe. Entscheidet später den Zweig.",
    template: T(`
| Messpunkt | Latenz zwischen (Übergabe) | Latenz in (Bearbeitung) | Konfidenz (S/P/I) |
|---|---|---|---|
| … | … | … | |

**Dominante Latenz:** zwischen den Schritten | in den Schritten
**Begründung:** …
`),
  },
  {
    id: "a2-erhebungsplan", phase: "P2", title: "Erhebungsplan",
    purpose: "Wie jede Zahl künftig gewonnen wird und wie sie von S über P nach I aufsteigt (Erhebungsleiter).",
    template: T(`
| Größe | Heutige Stufe | Quelle (Exhaust zuerst) | Nächste Stufe | Wie |
|---|---|---|---|---|
| … | S/P/I | Mail-Header/Datei-Metadaten/ERP/Ticket/… | P/I | … |
`),
  },
  {
    id: "a2-kpi-baseline", phase: "P2", title: "KPI-Baseline",
    purpose: "Die heutigen KPI-Werte, festgehalten vor jedem Eingriff — der Nullpunkt für die Wirkungsmessung.",
    template: T(`
| KPI | Definition | Aktueller Wert | Datenquelle | Takt |
|---|---|---|---|---|
| … | … | … | … | … |

**Erfasst am:** …
`),
  },

  // ----------------------------------------------------------- Phase 3
  {
    id: "a3-diagnose", phase: "P3", title: "Diagnose-Entscheid",
    purpose: "Der gewählte Zweig, die geprüften Bedingungen und die verworfenen Alternativen — entscheidbar, nicht nach Gefühl.",
    template: T(`
## Gewählter Zweig

**Zweig:** Z0 Killen | Z1 Interfaces | Z2 Prozessdesign | Z3 Toolbox-Evolution

## Geprüfte Bedingungen

_Die Bedingungen des Zweigs, je mit Evidenz aus Latenzprofil und Katalog-Scoring._

- **…** — belegt durch: …

## Verworfene Alternativen

| Zweig | Warum verworfen |
|---|---|
| … | … |
`),
  },
  {
    id: "a3-hypothese", phase: "P3", title: "Interventionshypothese",
    purpose: "»Wenn wir X ändern, bewegt sich KPI Y um Richtung Z« — falsifizierbar formuliert, mit der Messung benannt, die sie bestätigt oder widerlegt.",
    template: T(`
**Hypothese:** Wenn wir **…** ändern, bewegt sich **KPI …** um **… Richtung …**.

**Kleinster Schritt, der die Hypothese testet:** …
**Messung, die bestätigt/widerlegt:** …
**Testkadenz (passend zur Komponentengesundheit):** …
`),
  },

  // ----------------------------------------------------------- Phase 4
  {
    id: "a4-intervention", phase: "P4", title: "Umgesetzte Intervention",
    purpose: "Die umgesetzte Änderung gemäß der Änderungstaktik aus dem Risiko-Tor (direkt / Parallelbetrieb / Strangler).",
    template: T(`
**Was geändert wurde:** …
**Änderungstaktik:** R1 direkt | R2 Parallelbetrieb | R3 Strangler
**Neue Timestamps (Messbarkeits-Ratsche):** …
`),
  },
  {
    id: "a4-wirkung", phase: "P4", title: "Wirkungsmessung",
    purpose: "Vorher-Nachher gegen die KPI-Baseline — bewegte sich die KPI, oder ist die Hypothese sauber falsifiziert?",
    template: T(`
| KPI | Baseline (vorher) | Nachher | Delta | Konfidenz |
|---|---|---|---|---|
| … | … | … | … | |

**Ergebnis:** KPI bewegt | Hypothese falsifiziert | Messung unbrauchbar
**Interpretation:** …
`),
  },
  {
    id: "a4-register", phase: "P4", title: "Register-Eintrag (Technologie-Schnitt)",
    purpose: "Der wiederverwendbare Technologie-Schnitt (Muster, nicht Produktname) und wo er noch anwendbar ist — Compounding.",
    template: T(`
**Schnitt (Muster):** …
**Hier angewandt auf:** …
**Weitere Prozesse mit demselben Schnitt (addressable Menge):** …
`),
  },

  // ----------------------------------------------------------- Phase 5
  {
    id: "a5-prozessdoku", phase: "P5", title: "Prozessdokumentation (Soll)",
    purpose: "Der Prozess im Soll-Zustand, mit eingebautem Feedback-Loop — die geforderte Output-Größe.",
    template: T(`
## Soll-Ablauf

\`\`\`mermaid
flowchart LR
  A["Auslöser"] --> B["Schritt 1"] --> C["Ergebnis"]
\`\`\`

## Eingebauter Feedback-Loop

**Welche Größen werden dauerhaft erfasst:** …
**Wer sieht sie, in welchem Takt:** …
`),
  },
  {
    id: "a5-kpi-takt", phase: "P5", title: "KPI-Takt & Eskalationsschwelle",
    purpose: "Der KPI-Takt im Regelbetrieb (Verantwortung Champion) inkl. scharf geschalteter Eskalationsschwelle.",
    template: T(`
| KPI | Takt | Empfänger | Eskalationsschwelle |
|---|---|---|---|
| … | … | Champion / … | … |

**Diagnostik-Ebene auf Abruf farmbar:** ja | nein — wie: …
`),
  },
  {
    id: "a5-uebergabe", phase: "P5", title: "Übergabe an den Spoke",
    purpose: "Der Hub zieht ab: der Champion fährt Scoring und KPI-Takt ohne Hub. Abschluss-Scoring liefert das Delta zum Recon-Scoring als ausgewiesene Wirkung.",
    template: T(`
**Übernommen von (Champion):** …
**Voller KPI-Takt ohne Hub gefahren am:** …
**Abschluss-Scoring vs. Recon-Scoring (Delta = Wirkung):** … → …
**Offene Restpunkte:** …
`),
  },
];

export const artefactById: Record<string, Artefact> = Object.fromEntries(ARTEFACTS.map((a) => [a.id, a]));

export function artefactsOf(phaseId: string): Artefact[] {
  return ARTEFACTS.filter((a) => a.phase === phaseId);
}
