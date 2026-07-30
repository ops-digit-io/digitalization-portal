/**
 * Ablauf und Diagnostik (source doc B) — THE way.
 *
 * A 6-phase iterative loop (Phase 0 → 5 → back), each closed by a failable gate
 * (Tor). After the diagnostics gate the flow branches into one of four Zweige,
 * every intervention passes the change-risk gate (R1–R3), and numbers carry an
 * S/P/I confidence. Two entry directions (Prozess-Pull / Technologie-Push) reach
 * the same health profile; only the order in which criteria are pulled differs.
 *
 * Encoded from `docs/source/B_ablauf-und-diagnostik.md`.
 */

export interface Phase {
  id: string; // "P0".."P5"
  n: number;
  label: string;
  purpose: string;
  gate: { id: string; label: string; condition: string; fail: string };
}

export const PHASES: Phase[] = [
  {
    id: "P0", n: 0, label: "Intake & Priorisierung",
    purpose: "Aus allen Kandidaten (Pull und Push) die Prozesse wählen, bei denen Value, Spoke-Reife und Compounding-Potenzial das Engagement rechtfertigen — und alle anderen sauber zurückstellen.",
    gate: { id: "T0", label: "Aufnahme-Tor", condition: "Spoke-Minimum besetzt: benannter Verantwortlicher mit Änderungsbefugnis + Champion mit Kapazität + Bereitschaft zur Messung.", fail: "Zurückstellen — kein Engagement ohne Spoke, auch nicht bei hohem Value." },
  },
  {
    id: "P1", n: 1, label: "Recon (Aufklärung)",
    purpose: "Den Prozess so verstehen, wie er heute wirklich läuft — Struktur, Toolkette, Friktion, Organisation — und daraus das Zielstatement destillieren.",
    gate: { id: "T1", label: "Recon-Tor", condition: "Zielstatement gezeichnet + VSM-Skizze möglich + Katalog-Scoring vollständig.", fail: "Lücken nacharbeiten. Kein formulierbares Ziel → Kill-Kandidat, Eskalation an den Verantwortlichen." },
  },
  {
    id: "P2", n: 2, label: "Baseline & Diagnostik",
    purpose: "Die Recon-Erzählung mit Zahlen unterlegen: Wo sitzen die Hauptlatenzen wirklich, und mit welcher Konfidenz wissen wir das?",
    gate: { id: "T2", label: "Diagnostik-Tor", condition: "Hauptlatenzen benannt und ≥ Stufe P belegt; Latenzprofil trennt Übergabe- von Schritt-Latenz.", fail: "Erhebung nachschärfen — nicht auf Anekdoten (Stufe S) diagnostizieren. Ausnahme: unzugängliche Schnittstelle → Zweig 1b." },
  },
  {
    id: "P3", n: 3, label: "Diagnose & Verzweigung",
    purpose: "Aus Latenzprofil und Katalog-Scoring die dominante Problemklasse bestimmen und den Zweig wählen — entscheidbar, nicht nach Gefühl.",
    gate: { id: "T3", label: "Änderungsrisiko-Tor", condition: "Alle 7 Prüfpunkte belegt, Risikoklasse (R1–R3) vergeben, Änderungstaktik gewählt, Rückfallpfad benannt.", fail: "R3 ohne tragenden Value → zurück in die Diagnose (billigere Intervention?) oder ehrlich zurückstellen, mit Begründung." },
  },
  {
    id: "P4", n: 4, label: "Enabler-Schritt (Intervention)",
    purpose: "Genau eine Intervention im gewählten Zweig umsetzen, mit einer Testkadenz, die zur Gesundheit der Komponente passt, und die Wirkung messen.",
    gate: { id: "T4", label: "Wirkungs-Tor", condition: "KPI bewegt sich in erwarteter Richtung ODER Hypothese sauber falsifiziert — beides erzeugt Wissen.", fail: "Messung unbrauchbar → zurück zu Phase 2. Falsifikation/offene Befunde → zurück zu Phase 3." },
  },
  {
    id: "P5", n: 5, label: "Zielbild & Übergabe",
    purpose: "Den Prozess in einen Zustand bringen, in dem er sich selbst überwacht, und ihn an den Spoke zurückgeben — der Hub zieht ab.",
    gate: { id: "T5", label: "Betriebstor", condition: "Spoke fährt mindestens einen vollen KPI-Takt ohne Hub; Instrumentierung läuft weiter; Eskalationsschwelle scharf.", fail: "Der Takt reißt ohne Hub ab → Übergabe unvollständig, zurück in Phase 5. Nur unter Aufsicht gesund ist nicht gesund." },
  },
];

export const byPhase: Record<string, Phase> = Object.fromEntries(PHASES.map((p) => [p.id, p]));

// ------------------------------------------------------------ Zweige (doc B §4)
export interface Branch {
  id: string; // "Z0".."Z3"
  label: string;
  when: string;
  conditions: string[];
}

export const BRANCHES: Branch[] = [
  {
    id: "Z0", label: "Killen (Value zu Effort zu niedrig)",
    when: "Zuerst geprüft — nichts ist billiger als ein Schritt, den man nicht mehr macht.",
    conditions: [
      "Kein Konsument: für den Output kann niemand benannt werden, der ihn liest oder weiterverarbeitet.",
      "Ziel ohne Schritt erreichbar (kontrollierter Aussetz-Test, mit Rückfallpfad).",
      "Negativer Saldo: gemessener Aufwand steht in keinem Verhältnis zum belegbaren Value.",
    ],
  },
  {
    id: "Z1", label: "Interfaces",
    when: "1b (nicht ausleitbar) hat Vorrang — es blockiert die Diagnostik selbst und zahlt per Compounding auf jeden weiteren Prozess am selben System ein.",
    conditions: [
      "1a Friktion im Interface-Design: dominante Latenz liegt ZWISCHEN den Schritten; an Systembrüchen wird manuell übertragen.",
      "1b Technische Interfaces nicht zugänglich: Datenpunkte existieren, sind aber nicht exportierbar (kein API/Report/Zugriff) — Phase 2 kommt hier nicht über Stufe S.",
    ],
  },
  {
    id: "Z2", label: "Prozessdesign",
    when: "Auch mit perfekten Tools würde der Fluss das Ziel verfehlen.",
    conditions: [
      "Gedankentest: mit perfekten Tools und reibungsfreien Übergaben verfehlt der Fluss das Zielstatement — Reihenfolge/Schleifen/Zuständigkeiten sind das Problem.",
      "Latenz IN den Schritten: Warten auf Entscheidungen, Freigabeketten, Nacharbeit.",
      "VSM zeigt seriell geführte Stränge, die parallel laufen könnten.",
    ],
  },
  {
    id: "Z3", label: "Toolbox-Evolution",
    when: "Prozessdesign trägt, aber die Friktion sitzt mechanisch im Tool.",
    conditions: [
      "Friktion INNERHALB eines Schritts, mechanisch dem Tool zuzurechnen (manuelles Konsolidieren, Versionskonflikte, kein Mehrbenutzerbetrieb, Kapazitätsgrenze).",
      "Es existiert eine INKREMENTELLE Evolutionsstufe, die die Prozessform erhält: Excel → SharePoint-Liste → kleine App / Mendix. Kleinste Stufe, kein Big-Bang.",
      "Zusatzindiz: Komponente hätte längst Änderungen erfahren müssen (Iterationsbedarf da, Iterationsspeed nahe null).",
    ],
  },
];

/** Tie-breaker when several branch conditions match (the normal case). */
export const BRANCH_TIEBREAKER = [
  "Zweig 0 vor allem anderen — was gekillt wird, muss nicht optimiert werden.",
  "Zweig 1b vor 2 und 3 — erst messbar machen, dann umbauen.",
  "Danach höchster Compounding-Faktor zuerst; bei Gleichstand die niedrigste Risikoklasse. Pro Schleifendurchlauf eine Intervention.",
];

// ---------------------------------------------- Änderungsrisiko-Tor (doc B §5)
export interface RiskCheck {
  n: number;
  label: string;
  how: string;
}

export const RISK_CHECKS: RiskCheck[] = [
  { n: 1, label: "Nutzerkreis", how: "Zugriffs-/Versionshistorie auswerten; sonst Verteilerlisten und Befragung über den Spoke." },
  { n: 2, label: "Abhängige Prozesse", how: "Recon-Artefakte der Nachbarschaft; Spoke-Netzwerk fragen: „Wer liest das noch?\"" },
  { n: 3, label: "Schattennutzung", how: "Ankündigungstest mit Termin, Einsprüche sammeln, bevor etwas geändert wird; Kopien/Verlinkungen suchen." },
  { n: 4, label: "Reversibilität", how: "Rückfallpfad benennen und einmal trocken durchspielen." },
  { n: 5, label: "Parallelbetrieb", how: "Technisch und organisatorisch prüfen — wer pflegt in der Übergangszeit was?" },
  { n: 6, label: "Trägerschaft", how: "Eigentum klären; fremde Trägerschaft heißt Änderung braucht deren Mitwirkung und Takt." },
  { n: 7, label: "Literacy-Delta", how: "Recon-Literacy gegen das Anforderungsprofil des Zielzustands halten." },
];

export interface RiskClass {
  id: string; // "R1".."R3"
  label: string;
  tactic: string;
}

export const RISK_CLASSES: RiskClass[] = [
  { id: "R1", label: "direkt iterieren", tactic: "Kleiner Nutzerkreis, keine abhängigen Prozesse, Rollback trivial." },
  { id: "R2", label: "Parallelbetrieb mit Rückfallpfad", tactic: "Mehrere Nutzer oder ein abhängiger Prozess; Alt läuft bis Neu einen vollen Zyklus fehlerfrei gefahren ist, dann harter Umstieg." },
  { id: "R3", label: "Strangler", tactic: "Viele Nutzer, Schattennutzung wahrscheinlich; neben dem Bestand aufbauen, Konsumenten einzeln umziehen, Alt erst abschalten, wenn niemand mehr liest." },
];

// ------------------------------------------- Erhebungsleiter S/P/I (doc B §6.1)
export interface ConfidenceLevel {
  id: "S" | "P" | "I";
  label: string;
  meaning: string;
  enough: string;
}

export const CONFIDENCE_LADDER: ConfidenceLevel[] = [
  { id: "S", label: "Selbstauskunft (strukturiert)", meaning: "Die letzten 3–5 konkreten Vorgänge aus Postfach/Kalender rekonstruiert — echte Einzelwerte, keine gefühlten Mittel.", enough: "Reicht für Triage, Diagnoserichtung, Recon. Nicht für Baseline-Behauptungen im Business Case oder die Zweigentscheidung." },
  { id: "P", label: "Stichprobe", meaning: "Über ≥1 vollen Prozesszyklus jeder Vorgang an definierten Stationen gestempelt (Laufzettel/Pflichtfeld), nicht Selbstbeobachtung.", enough: "Reicht für Diagnostik-Tor, Zweigentscheidung, KPI-Baseline." },
  { id: "I", label: "instrumentiert", meaning: "Timestamps fallen als Nebenprodukt der Systeme an, ohne dass jemand stempelt.", enough: "Ziel für den Regelbetrieb; das Betriebstor verlangt I (oder ersatzweise routinierte P-Erhebung mit festem Takt)." },
];

// --------------------------------------------- Zwei Anflugrichtungen (Katalog A §7.1/7.2; B §1 Prinzip 3 + §8)
export interface Anflug {
  id: "process" | "technology";
  label: string;
  start: string;
  /** Zugreihenfolge: which criteria to pull, in order, with the reason. */
  order: { criteria: string[]; why: string; stop: string }[];
}

export const ANFLUG: Anflug[] = [
  {
    id: "process", label: "Prozess-Anflug", start: "„Ich brauche eine Lösung für meinen Prozess.\"",
    order: [
      { criteria: ["K8.1"], why: "Ohne Spoke kein Gegenüber.", stop: "S1 → keine Aufnahme (Aufnahme-Tor)." },
      { criteria: ["K4.1", "K4.4"], why: "Lohnt der Einstieg — Ziel und Mengengerüst.", stop: "Ziel nicht formulierbar → Kill-Kandidat, Eskalation." },
      { criteria: ["K5.1", "K2.2"], why: "K.o.-Check früh: Enabler- oder Optimierungspfad.", stop: "S1 → Engagement wird Zweig-1b-Enabler, kein Optimierungsversprechen." },
      { criteria: ["K1.1", "K1.2", "K1.3", "K3.1", "K3.2", "K3.3"], why: "Recon: Abbildung und Ist-Fluss.", stop: "—" },
      { criteria: ["K2.1", "K2.3", "K3.4"], why: "Brüche, Datenhaltung, Kill-/Parallel-Kandidaten.", stop: "—" },
      { criteria: ["K7.1", "K7.2", "K7.3", "K7.4"], why: "Wo kann man anfassen, zu welchem Risiko.", stop: "R3 ohne tragenden Value → zurückstellen." },
      { criteria: ["K5.2", "K5.3", "K5.4", "K6.1", "K6.2", "K8.2", "K8.3", "K8.4", "K8.5", "K4.2", "K4.3"], why: "Kalibrierung und Nachhaltigkeit.", stop: "—" },
    ],
  },
  {
    id: "technology", label: "Technologie-Anflug", start: "„Wie viel Value sitzt auf diesem Piece of Technology?\"",
    order: [
      { criteria: ["K2.2"], why: "Ohne Zugang keine Skalierung.", stop: "S1 und nicht verhandelbar → Kandidat deprioritisieren." },
      { criteria: ["K7.2"], why: "Konsumenten und Kopplung = addressable Menge.", stop: "Keine Konsumenten → Kill-Kandidat statt Skalierungskandidat." },
      { criteria: ["K4.4"], why: "Der Value auf dem Piece of Technology (aggregiert über angebundene Prozesse).", stop: "Value trägt den Effort erkennbar nicht → zurückstellen." },
      { criteria: ["K7.1", "K7.3", "K7.4"], why: "Iterierbarkeit der Komponente = Skalierungsrisiko.", stop: "—" },
      { criteria: ["K8.3"], why: "Skaliert die Einführung, oder wird sie zurückgebaut?", stop: "—" },
      { criteria: [], why: "Je priorisiertem Prozess: voller Katalog im Prozess-Anflug (der Schnitt wird pro Prozess verifiziert).", stop: "—" },
    ],
  },
];

export const byAnflug: Record<string, Anflug> = Object.fromEntries(ANFLUG.map((a) => [a.id, a]));

// -------------------------------------- Richtungsvektor: Profil → Zweig (doc A §6.4)
export interface DirectionRule {
  pattern: string;
  indication: string;
  branch: string;
}

export const DIRECTION_RULES: DirectionRule[] = [
  { pattern: "K3.4 zeigt konsumentenlose Schritte; K4.4-Saldo negativ", indication: "Zweig 0 — Killen", branch: "Z0" },
  { pattern: "K5.1 oder K2.2 ≤ S2; Latenz dominiert zwischen Schritten (K3.2)", indication: "Zweig 1 — Interfaces (1b vor 1a)", branch: "Z1" },
  { pattern: "D3 niedrig bei D2 ≥ 3; Latenz in den Schritten; Schleifen/Nacharbeit", indication: "Zweig 2 — Prozessdesign", branch: "Z2" },
  { pattern: "Friktion konzentriert in einem Schritt; K7.1 zeigt Iterationsstau", indication: "Zweig 3 — Toolbox-Evolution", branch: "Z3" },
  { pattern: "D8 < 2,5 (ohne K.o.-Fall)", indication: "Kein Zweig zuerst: Befähigung — sonst wird das Literacy-Delta am Risiko-Tor zum Blocker", branch: "" },
  { pattern: "D6 niedrig bei sonst grünem Profil", indication: "Feedback-Loop einbauen (Phase 5 vorziehen)", branch: "" },
];
