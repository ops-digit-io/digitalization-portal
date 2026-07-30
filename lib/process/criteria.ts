/**
 * Kriterienkatalog Prozessgesundheit (source doc A) — THE measuring bar.
 *
 * Eight weighted health dimensions (D1–D8), each scored from named criteria
 * (K1.1 … K8.5) on an S1–S5 scale. S1 is always "not evidenceable / no answer"
 * (there is no "not assessable"). Three criteria are knock-outs. D7 is assessed
 * per Kernkomponente; the worst component sets the dimension.
 *
 * Encoded from `docs/source/A_kriterienkatalog.md`, in the source language
 * (German) so the assessment reads as authored. Weights sum to 100.
 */

/** S1..S5 as 1..5. S1 = "nicht benennbar / keine Evidenz". */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Confidence label a quantitative rating carries (Erhebungsleiter, doc B §6.1). */
export type Confidence = "S" | "P" | "I";

/** Aufnahme-K.o. (no engagement) vs. Optimierungs-K.o. (enabler before optimisation). */
export type KoClass = "intake" | "optimisation";

export interface Criterion {
  id: string; // "K1.1"
  dimension: string; // "D1"
  label: string;
  question: string;
  evidence: string;
  /** Set when this criterion is a knock-out (doc A §5). */
  knockout?: KoClass;
  /** D7: rated per Kernkomponente; the worst component sets the dimension note. */
  perComponent?: boolean;
  /** S1..S5 descriptions (index 0 = S1). */
  scale: [string, string, string, string, string];
}

export interface Dimension {
  id: string; // "D1"
  label: string;
  question: string;
  /** Portfolio weight in percent (doc A §3). */
  weight: number;
  /** Ids of the knock-out criteria that live in this dimension. */
  koCriteria: string[];
}

export const DIMENSIONS: Dimension[] = [
  { id: "D1", label: "Prozessabbildung & Artefakte", question: "Wissen wir, wie der Prozess läuft — auf Papier und in echt?", weight: 6, koCriteria: [] },
  { id: "D2", label: "Toolchain & Systembrüche", question: "Wo bricht der Datenfluss, und kommen wir an die Systeme ran?", weight: 13, koCriteria: ["K2.2"] },
  { id: "D3", label: "Fluss & Latenz", question: "Wo steht der Vorgang, statt zu laufen?", weight: 10, koCriteria: [] },
  { id: "D4", label: "Zielklarheit & Zielerreichung", question: "Wozu gibt es den Prozess — und erreicht er das?", weight: 12, koCriteria: [] },
  { id: "D5", label: "Messbarkeit & Diagnostik", question: "Können wir sehen, was passiert — bis auf Schrittebene?", weight: 18, koCriteria: ["K5.1"] },
  { id: "D6", label: "Feedback-Loop-Design", question: "Wird aus Sehen Handeln?", weight: 10, koCriteria: [] },
  { id: "D7", label: "Änderbarkeit & Iterationsrisiko", question: "Wie teuer und gefährlich ist es, hier etwas zu ändern?", weight: 15, koCriteria: [] },
  { id: "D8", label: "Organisatorische Reife", question: "Kann die Organisation die Änderung tragen — und halten?", weight: 16, koCriteria: ["K8.1"] },
];

export const CRITERIA: Criterion[] = [
  // ---------------------------------------------------------------- D1
  {
    id: "K1.1", dimension: "D1", label: "Existenz und Aktualität der Prozessdarstellung",
    question: "Zeig mir die aktuelle Darstellung deines Prozesses — wann wurde sie zuletzt geändert, und von wem?",
    evidence: "Artefakt (Diagramm, SOP, Verfahrensanweisung) mit Datum/Versionshistorie; drei beobachtete Schritte gegen die Darstellung gehalten.",
    scale: [
      "Keine Darstellung; der Ablauf ist nur mündlich beschreibbar.",
      "Darstellung existiert, letzte Änderung >24 Monate her oder Stichprobe weicht vom gelebten Ablauf ab.",
      "Hauptpfad korrekt abgedeckt (Stichprobe konsistent); Varianten/Sonderfälle fehlen.",
      "Letzte Pflege ≤12 Monate, Hauptpfad + wesentliche Varianten, Stichprobe konsistent.",
      "Versioniertes Artefakt mit benanntem Pflege-Owner und mehreren datierten Änderungen; Stichprobe konsistent.",
    ],
  },
  {
    id: "K1.2", dimension: "D1", label: "Ausführbarkeit der Dokumentation",
    question: "Könnte jemand Prozessfremdes mit deiner Doku allein einen Durchlauf ausführen?",
    evidence: "Doku enthält je Schritt Rolle, Tool, Input, Output; eine prozessfremde Person beschreibt den Ablauf nur aus der Doku.",
    scale: [
      "Doku nennt nur Schrittnamen; weder Rollen noch Tools noch In-/Outputs.",
      "Rollen ODER Tools je Schritt benannt, nicht beides; In-/Outputs fehlen.",
      "Rolle, Tool, In-/Output je Schritt für den Hauptpfad; der Test scheitert an Sonderfällen.",
      "Der Test gelingt für den Hauptpfad ohne mündliche Nachhilfe.",
      "Der Test gelingt inkl. der häufigsten Sonderfälle; Eskalationswege sind beschrieben.",
    ],
  },
  {
    id: "K1.3", dimension: "D1", label: "Tool-Vollständigkeit der Darstellung",
    question: "Welche Tools stehen in deiner Doku — und mit welchen wird tatsächlich gearbeitet?",
    evidence: "Toolliste der Doku gegen einen beobachteten Durchlauf; jedes nicht dokumentierte Hilfsmittel zählt (private Excel, Mail-Schleifen, Chat, Zettel).",
    scale: [
      "Doku nennt keine Tools, oder der Durchlauf nutzt mehrheitlich undokumentierte Tools.",
      "Kern-IT-Systeme dokumentiert; die Übergaben dazwischen (Excel, Mail, Chat) fehlen ganz.",
      "Übergabe-Tools teilweise dokumentiert; Beobachtung findet einzelne undokumentierte Hilfsmittel.",
      "Beobachteter Durchlauf deckt sich mit der Toolliste; höchstens ein Fund.",
      "Toolliste vollständig inkl. Zweck je Tool und benannter Datenflüsse; Beobachtung ohne Fund.",
    ],
  },

  // ---------------------------------------------------------------- D2
  {
    id: "K2.1", dimension: "D2", label: "Systembrüche im Hauptpfad",
    question: "An welchen Stellen überträgt jemand ein Ergebnis von Hand von einem System ins nächste?",
    evidence: "Beobachteter Durchlauf; Zählung manueller Übertragungen (Abtippen, Copy-Paste, Export/Import, Ausdruck, Mail-Anhang).",
    scale: [
      "Niemand kann die Toolfolge vollständig benennen; Brüche sind nicht zählbar.",
      "Toolfolge benennbar; alle Übergaben im Hauptpfad laufen manuell.",
      "Mindestens eine Systemübergabe automatisiert; die Mehrheit weiter manuell.",
      "Mehrheit der Hauptpfad-Übergaben automatisiert; manuelle Übertragung nur an benannten Reststellen.",
      "Hauptpfad ohne manuelle Datenübertragung; verbleibende Sonderfälle dokumentiert und begründet.",
    ],
  },
  {
    id: "K2.2", dimension: "D2", label: "Interface-Zugänglichkeit", knockout: "optimisation",
    question: "Kommen wir an die Daten der beteiligten Systeme — per API oder Export? Wer gibt das frei, und wer hat das schon einmal gemacht?",
    evidence: "Ein während des Assessments tatsächlich gezogener Datenauszug oder API-Call; benannter Freigabeweg mit Präzedenzfall.",
    scale: [
      "Kein technischer Zugang und kein benennbarer Freigabeweg (geschlossenes System, Blackbox, verwaiste Berechtigungen).",
      "Zugang theoretisch möglich, aber kein Präzedenzfall und Freigabeweg ungeklärt.",
      "Manueller Export (CSV/Excel) möglich und im Termin vorgeführt; keine API.",
      "API oder automatisierter Export vorhanden; Zugriff für das Assessment tatsächlich freigegeben.",
      "API in laufender Nutzung durch mindestens einen weiteren Konsumenten; Zugriffsprozess etabliert.",
    ],
  },
  {
    id: "K2.3", dimension: "D2", label: "Führende Datenhaltung",
    question: "Wenn zwei Ablagen unterschiedliche Werte zeigen — welche gilt?",
    evidence: "Benanntes führendes System je Kerndatum; Zählung paralleler Pflegeorte für dieselben Daten.",
    scale: [
      "Für Kerndaten ist keine führende Quelle benennbar; Widersprüche werden per Zuruf geklärt.",
      "Dieselben Kerndaten werden an ≥3 Orten unabhängig gepflegt; Abgleich manuell und anlassbezogen.",
      "Führendes System benannt; parallele Kopien existieren und werden von Hand nachgezogen.",
      "Führendes System; Kopien werden automatisch abgeleitet, keine eigenständige Pflege in Kopien.",
      "Ein führendes System, keine parallel gepflegten Kopien; Änderungen dort sind für alle sichtbar.",
    ],
  },

  // ---------------------------------------------------------------- D3
  {
    id: "K3.1", dimension: "D3", label: "Durchlaufzeit gemessen",
    question: "Wie lange dauert ein Durchlauf vom Auslöser bis zum Ergebnis — und woher weißt du das?",
    evidence: "Datenauszug mit Zeitstempeln (Ticketsystem, Logs, Workflow, Mail-Header); Konfidenzstufe P oder I — Stufe S zählt als Schätzung.",
    scale: [
      "Keine Angabe möglich, auch keine konsistente Schätzung.",
      "Nur Schätzung (Stufe S); keine Messdaten.",
      "Einmalige Messung oder Stichprobe vorhanden (z. B. aus einem früheren Projekt).",
      "Laufende Messung; Mittelwert/Median bekannt, Streuung nicht ausgewertet.",
      "Laufende Messung mit Verteilung (Median, Ausreißer) je relevanter Prozessvariante.",
    ],
  },
  {
    id: "K3.2", dimension: "D3", label: "Liege- vs. Bearbeitungszeit",
    question: "Wo bleibt ein Vorgang typischerweise liegen, und wie lange?",
    evidence: "Timestamp-Zerlegung in Warte- und Aktivzeit; die drei größten Liegestellen mit Zahlen belegt (Latenzprofil).",
    scale: [
      "Liegestellen nicht benennbar.",
      "Liegestellen aus Erfahrung benannt; keine Zahlen.",
      "Für mindestens eine Liegestelle liegt eine gemessene Dauer vor (≥P).",
      "Warte-/Aktivzeit-Anteil im Hauptpfad gemessen; Top-3-Liegestellen quantifiziert.",
      "Zerlegung laufend verfügbar; Liegezeiten werden über die Zeit verfolgt (Trend sichtbar).",
    ],
  },
  {
    id: "K3.3", dimension: "D3", label: "Eingriffe und Handoffs",
    question: "Wie viele Personen fassen einen Vorgang an — und wie viele davon verändern das Ergebnis inhaltlich?",
    evidence: "Durchlaufprotokoll; Zahl der Übergaben, Anteil reiner Weiterleitungen und Freigaben ohne inhaltlichen Beitrag.",
    scale: [
      "Zahl der Beteiligten unbekannt; Vorgänge suchen sich ihren Weg per Mail-Verteiler.",
      "Beteiligte benennbar; Anteil reiner Durchreicher unbekannt.",
      "Handoffs gezählt; Verdachtsstellen für wertfreie Übergaben benannt, nicht belegt.",
      "Handoffs gezählt und aus einem Protokoll klassifiziert (wertschöpfend / prüfend / durchreichend).",
      "Klassifizierung liegt vor UND wertfreie Übergaben wurden nachweislich entfernt oder zusammengelegt.",
    ],
  },
  {
    id: "K3.4", dimension: "D3", label: "Parallelisierungs- und Kill-Kandidaten",
    question: "Welche Schritte könnten gleichzeitig laufen? Welcher Schritt könnte ersatzlos entfallen, ohne dass es jemand merkt?",
    evidence: "Schrittliste mit Abhängigkeitsbegründung; Schritte, deren Output nachweislich niemand konsumiert (Input für Zweig 0).",
    scale: [
      "Abhängigkeiten kann niemand begründen; die Reihenfolge ist „schon immer so\".",
      "Abhängigkeiten stecken in den Köpfen Einzelner; nicht dokumentiert.",
      "Abhängigkeiten dokumentiert; keine Value-/Effort-Bewertung je Schritt.",
      "Value/Effort je Schritt bewertet; Parallel- und Kill-Kandidaten schriftlich benannt.",
      "Zusätzlich: In den letzten 12 Monaten wurde mindestens ein Schritt entfernt oder parallelisiert.",
    ],
  },

  // ---------------------------------------------------------------- D4
  {
    id: "K4.1", dimension: "D4", label: "Ziel-Statement mit ableitbaren Kriterien",
    question: "Was ist das Ziel dieses Prozesses in einem Satz — und woran misst man, ob es erreicht ist?",
    evidence: "Schriftliches Statement; unabhängige Befragung von Owner und mindestens einem Ausführenden, Abgleich der Antworten.",
    scale: [
      "Owner und Ausführende nennen unterschiedliche oder keine Ziele.",
      "Ziel mündlich konsistent; nirgends schriftlich; keine messbaren Kriterien.",
      "Ziel schriftlich; Kriterien nur qualitativ („schnell\", „zuverlässig\").",
      "Ziel schriftlich mit messbaren Kriterien (Größe, Einheit, Richtung).",
      "Zusätzlich Soll-Werte mit Begründung aus dem Geschäftsbedarf.",
    ],
  },
  {
    id: "K4.2", dimension: "D4", label: "Ist-Performance gegen Ziel",
    question: "Wie gut erreicht der Prozess sein Ziel heute — mit welcher Zahl belegst du das?",
    evidence: "Aktueller Messwert je Zielkriterium gegen Soll; Zeitreihe über mindestens einige Monate.",
    scale: [
      "Keine Aussage zur Zielerreichung möglich.",
      "Aussage nur als Einschätzung („läuft ganz gut\"); keine Zahl.",
      "Aktueller Wert für mindestens ein Zielkriterium belegbar; kein Soll-Vergleich oder keine Historie.",
      "Ist vs. Soll für die Zielkriterien belegt; Zeitreihe vorhanden.",
      "Ist vs. Soll inkl. Trend; Abweichungen sind kommentiert (Ursachen bekannt).",
    ],
  },
  {
    id: "K4.3", dimension: "D4", label: "Soll-Bild (Greenfield-Test)",
    question: "Wenn du den Prozess heute neu bauen würdest — was wäre anders, und was hindert dich?",
    evidence: "Benannte Deltas und Blocker; Abgleich mit Backlog oder Plänen.",
    scale: [
      "Keine Antwort oder „alles gut\", obwohl Befunde das Gegenteil zeigen.",
      "Beschwerden über Symptome; kein konkretes Soll-Bild.",
      "Soll-Bild qualitativ beschrieben; Blocker nicht benannt.",
      "Soll-Bild und Blocker benannt; nichts davon in einem Plan.",
      "Dokumentiertes Soll-Bild; Blocker in einem konkreten Backlog/Plan mit Terminen adressiert.",
    ],
  },
  {
    id: "K4.4", dimension: "D4", label: "Mengengerüst & Business-Bezug",
    question: "Wie oft läuft der Prozess pro Jahr, wie viel Arbeitszeit steckt drin, und was kostet ein Fehler?",
    evidence: "Belegtes Mengengerüst: Durchläufe/Jahr aus Systemdaten, Rollen × Zeit, Fehler-/Nacharbeitsfälle — Rohstoff für Addressable Value.",
    scale: [
      "Weder Volumen noch Aufwand benennbar.",
      "Volumen geschätzt (Stufe S); Aufwand unbekannt.",
      "Volumen aus Systemdaten belegt; Aufwand geschätzt.",
      "Volumen und Aufwand belegt; Fehlerkosten geschätzt.",
      "Volumen, Aufwand und Fehler-/Nacharbeitsquote belegt; daraus ein Geldwert je Hebel ableitbar.",
    ],
  },

  // ---------------------------------------------------------------- D5
  {
    id: "K5.1", dimension: "D5", label: "Timestamp-Farmbarkeit", knockout: "optimisation",
    question: "An welchen Stellen entsteht heute automatisch ein Zeitstempel — System-Log, Ticket, Mail-Header, Datei-Metadaten?",
    evidence: "Echter Datenauszug mit Timestamps aus mindestens einem System, während des Assessments gezogen (Exhaust-Daten zuerst).",
    scale: [
      "Keine Timestamps erhebbar: mündlich oder auf Papier, kein System schreibt auswertbare Zeitstempel.",
      "Timestamps nur am Start ODER am Ende, oder nur manuell nacherfassbar.",
      "Start- und Ende-Timestamps automatisch vorhanden; Zwischenschritte dunkel.",
      "Timestamps an den Hauptübergaben; Auswertung mit vertretbarem Aufwand (Export + Skript).",
      "Timestamps je Schritt in auswertbaren Systemen; Historie über ≥12 Monate verfügbar.",
    ],
  },
  {
    id: "K5.2", dimension: "D5", label: "KPI-Abdeckung",
    question: "Welche Kennzahlen beschreiben den Prozess heute — und kannst du mir den aktuellen Wert jetzt zeigen?",
    evidence: "KPI-Liste mit Datenquelle und Aktualisierungstakt je KPI; der aktuelle Wert wird im Termin abgerufen.",
    scale: [
      "Keine Kennzahl vorhanden.",
      "Kennzahlen benannt; aktueller Wert im Termin nicht abrufbar.",
      "Werte abrufbar; Erhebung manuell; Takt unregelmäßig.",
      "Werte automatisch erhoben in festem Takt; Definition je KPI schriftlich.",
      "Zusätzlich Historie ≥12 Monate und benannter Empfängerkreis.",
    ],
  },
  {
    id: "K5.3", dimension: "D5", label: "KPI-Validität",
    question: "Wenn alle deine Kennzahlen grün sind — kann der Prozess trotzdem sein Ziel verfehlen? Wo?",
    evidence: "Mapping vorhandene KPIs ↔ Zielkriterien (K4.1); schriftlich benannte Messlücken und bekannte Fehlalarme.",
    scale: [
      "Kennzahlen messen Aktivität (Menge erledigt), ohne Bezug zu den Zielkriterien.",
      "Teilbezug; wesentliche Zielkriterien ohne Messgröße.",
      "Hauptzielkriterium gemessen; Nebenkriterien offen.",
      "Alle Zielkriterien aus dem Ziel-Statement mit Messgröße hinterlegt.",
      "Zusätzlich bekannte Lücken und Fehlalarme schriftlich dokumentiert.",
    ],
  },
  {
    id: "K5.4", dimension: "D5", label: "Diagnostische Tiefe (Drill-down)",
    question: "Die Durchlaufzeit steigt um 30 % — wie findest du heraus, welcher Schritt es war?",
    evidence: "Vorgeführte Zerlegung eines Ergebnis-KPI auf Schritt-/Latenzebene an einem echten Fall.",
    scale: [
      "Eine solche Abweichung würde nicht bemerkt.",
      "Abweichung würde bemerkt; Ursachensuche nur durch Herumfragen.",
      "Ursache per manueller Einzelfallanalyse auffindbar.",
      "Latenz-Zerlegung je Schritt auf Abruf möglich; im Termin vorgeführt.",
      "Zerlegung laufend verfügbar; Hauptlatenzen historisch nachvollziehbar; frühere Diagnosen dokumentiert.",
    ],
  },

  // ---------------------------------------------------------------- D6
  {
    id: "K6.1", dimension: "D6", label: "Geschlossener Loop: Messung → Änderung",
    question: "Wann habt ihr zuletzt aufgrund einer Kennzahl etwas am Prozess geändert — was genau?",
    evidence: "Datiertes Beispiel Kennzahl → Entscheidung → Änderung (Protokoll, Ticket, Changelog); Regeltermin mit Protokollen.",
    scale: [
      "Änderungen passieren nur nach Vorfall oder Eskalation; kein Termin, kein Beispiel.",
      "Es gibt Gespräche über den Prozess; Änderungen daraus sind nicht nachweisbar.",
      "Regeltermin existiert mit Protokollen; abgeleitete Änderungen nicht auffindbar.",
      "Mindestens eine messungsbasierte Änderung in den letzten 12 Monaten belegbar.",
      "Regelzyklus mit mehreren belegten Änderungen pro Jahr; Wirkung nachgemessen.",
    ],
  },
  {
    id: "K6.2", dimension: "D6", label: "Aktive vs. statische Zonen",
    question: "An welchen Teilen des Prozesses wird laufend gearbeitet — und welche sind seit Jahren unangetastet?",
    evidence: "Änderungshistorien der Artefakte und Komponenten (Dateiversionen, Changelogs, Ticket-Historie); Karte aktiv/statisch.",
    scale: [
      "Für keine Komponente ist eine Änderungshistorie auffindbar.",
      "Historie nur für einzelne Komponenten; ein Gesamtbild ist nicht herstellbar.",
      "Aktiv/statisch grob benennbar aus Befragung; Historie stützt es teilweise.",
      "Karte aktiv/statisch aus Historien belegt; statische Zonen benannt.",
      "Zusätzlich begründet, ob statische Zonen stabil-gut oder eingefroren-krank sind.",
    ],
  },

  // ---------------------------------------------------------------- D7 (per Kernkomponente)
  {
    id: "K7.1", dimension: "D7", label: "Iterationsfrequenz vs. Iterationsbedarf", perComponent: true,
    question: "Wann wurde diese Komponente zuletzt geändert — und wann hätte sie geändert werden müssen?",
    evidence: "Versions-/Änderungshistorie der Komponente gegen dokumentierte Mängel und Workarounds.",
    scale: [
      "Komponente seit Jahren unverändert, obwohl aktive Workarounds existieren; niemand traut sich heran.",
      "Änderungsbedarf benannt; keine Änderung und keine dokumentierte Entscheidung dagegen.",
      "Änderungen finden statt, aber seltener als Bedarf entsteht; die Behelfsliste wächst.",
      "Iterationsfrequenz deckt den Bedarf; offene Mängel stabil oder sinkend.",
      "Frequenz wird gesteuert: instabile/kritische Komponenten bekommen bewusst höhere Velocity.",
    ],
  },
  {
    id: "K7.2", dimension: "D7", label: "Kopplung und Konsumenten (Blast Radius)", perComponent: true,
    question: "Wenn wir diese Komponente morgen ändern — wer merkt es zuerst, und was fällt aus?",
    evidence: "Dokumentierte Konsumentenliste (wer liest, wer schreibt, welche Folgeprozesse); Vorfallhistorie der letzten Änderung.",
    scale: [
      "Konsumenten unbekannt; die letzte Änderung führte zu ungeplantem Ausfall oder wird deshalb vermieden.",
      "Konsumenten nur im Kopf des Owners; nie gegen die Realität geprüft.",
      "Konsumentenliste dokumentiert; Vollständigkeit ungeprüft.",
      "Konsumentenliste dokumentiert und in den letzten 12 Monaten verifiziert.",
      "Kopplungen inkl. Schnittstellenabsprachen dokumentiert; Änderungen werden konsumentenweise angekündigt.",
    ],
  },
  {
    id: "K7.3", dimension: "D7", label: "Test- und Rückrollweg", perComponent: true,
    question: "Kannst du eine Änderung ausprobieren, ohne den laufenden Betrieb zu treffen — und zurücknehmen, wenn sie schiefgeht?",
    evidence: "Existierende Testkopie/-umgebung, dokumentierter Rückfallpfad; Nachweis am letzten Änderungsfall.",
    scale: [
      "Änderungen nur am offenen Herzen; kein Sicherungsstand, kein Weg zurück.",
      "Manuelle Sicherungskopie vor Änderungen; Rückweg ungetestet.",
      "Testkopie möglich und schon genutzt; Rollback manuell und personenabhängig.",
      "Test- und Rückrollweg dokumentiert und bei der letzten Änderung genutzt.",
      "Parallelbetrieb oder stufenweises Ausrollen möglich; Rollback nachweislich geübt.",
    ],
  },
  {
    id: "K7.4", dimension: "D7", label: "Änderfähige Personen", perComponent: true,
    question: "Wer außer der einen Person kann diese Komponente sicher ändern?",
    evidence: "Änderungshistorie: Zahl unterschiedlicher Personen mit nachgewiesenen Änderungen; ist der Vertretungsfall real vorgekommen?",
    scale: [
      "Genau eine Person kann ändern; bei Abwesenheit steht die Komponente still.",
      "Eine Person ändert; eine zweite „könnte theoretisch\", hat aber nie.",
      "Zwei Personen mit nachgewiesenen Änderungen in der Historie.",
      "≥2 Personen ändern regelmäßig; das Wissen ist dokumentiert.",
      "Änderfähigkeit ist Rollenwissen: dokumentiert und einmal an eine neue Person übergeben.",
    ],
  },

  // ---------------------------------------------------------------- D8
  {
    id: "K8.1", dimension: "D8", label: "Verantwortlicher Rollen-Spoke", knockout: "intake",
    question: "Wer trägt im Business die Verantwortung für diesen Prozess — und kann diese Person eine Änderung entscheiden?",
    evidence: "Benannte Person; beantwortet Detailfragen UND benennt ihren Entscheidungsrahmen; Gegenprobe bei der Führungskraft. Spoke-Minimum.",
    scale: [
      "Niemand benennbar, oder mehrere widersprechende Nennungen; die Gegenprobe scheitert.",
      "Person benannt; kennt den Prozess nur oberflächlich ODER kann nichts entscheiden.",
      "Person kennt den Prozess; jede Entscheidung braucht Einzelfall-Eskalation.",
      "Person kennt den Prozess und entscheidet in definiertem Rahmen; keine reservierte Kapazität (Champion fehlt).",
      "Benannte Rolle mit Prozesstiefe, Entscheidungsrahmen und eingeplanter Kapazität; Champion benannt — Spoke-Minimum vollständig.",
    ],
  },
  {
    id: "K8.2", dimension: "D8", label: "Process Literacy",
    question: "Beschreib den Gesamtprozess — was passiert vor deinem Schritt, was danach, und wozu? (an Ausführende)",
    evidence: "Stichproben-Interviews mit ≥3 Ausführenden; Abdeckung und Korrektheit gegen den beobachteten Ist-Ablauf.",
    scale: [
      "Befragte kennen nur den eigenen Schritt; Vor-/Nachgelagertes unbekannt oder falsch.",
      "Direkter Vor- und Nachschritt bekannt; das Gesamtbild fehlt.",
      "Gesamtablauf grob korrekt; Zweck einzelner Schritte unklar.",
      "Die Mehrheit beschreibt Ablauf und Zweck korrekt.",
      "Zusätzlich benennen Befragte unabhängig dieselben Schwachstellen — die Organisation sieht ihren Prozess selbst.",
    ],
  },
  {
    id: "K8.3", dimension: "D8", label: "Technical Literacy",
    question: "Was machst du, wenn dich das Tool ausbremst — zeig mir, wie du dir das letzte Mal geholfen hast.",
    evidence: "Beobachtete Toolnutzung; Verhältnis Selbsthilfe (Filter, Vorlagen, Formeln) zu Stillstand/Ticket; Herkunft der Hilfsmittel.",
    scale: [
      "Grundfunktionen der Tools werden umgangen (Ausdrucken, Abtippen, Zuruf).",
      "Grundfunktionen beherrscht; jede Abweichung erzeugt Ticket oder Wartezeit.",
      "Sichere Nutzung; einzelne Power-User bauen Hilfsmittel, die lokal bleiben.",
      "Hilfsmittel werden geteilt; die Mehrheit nutzt fortgeschrittene Funktionen.",
      "Das Team passt Tools im erlaubten Rahmen selbst an und dokumentiert das.",
    ],
  },
  {
    id: "K8.4", dimension: "D8", label: "KPI-Verständnis",
    question: "Woran würdest du erkennen, ob der Prozess diese Woche gut läuft? Und was genau misst euer Haupt-KPI?",
    evidence: "Befragte definieren den Haupt-KPI korrekt (Zähler, Nenner, Zeitraum) und benennen Signalgrößen; Abgleich mit der Definition.",
    scale: [
      "Haupt-KPI unbekannt oder falsch erklärt; keine Signalgrößen benennbar.",
      "KPI-Name bekannt; Definition falsch oder nicht erklärbar.",
      "Definition korrekt beim Owner; Ausführende kennen sie nicht.",
      "Owner und Mehrheit der Ausführenden erklären Definition und Einflussfaktoren korrekt.",
      "Zusätzlich benennen Befragte Signalgrößen, die heute NICHT gemessen werden.",
    ],
  },
  {
    id: "K8.5", dimension: "D8", label: "Adoptionsnachweis",
    question: "Was war die letzte Änderung an Prozess oder Tool — und arbeiten heute alle danach?",
    evidence: "Stichprobe im Betrieb: Wird das neue Verfahren genutzt, oder leben Alt-Wege weiter?",
    scale: [
      "Die letzte Änderung wurde faktisch zurückgebaut; alle arbeiten im Alt-Weg.",
      "Neu und Alt laufen parallel; die Mehrheit im Alt-Weg.",
      "Mehrheit im Neu-Weg; Alt-Wege existieren für Sonderfälle ohne bewusste Entscheidung.",
      "Neu-Weg flächig adoptiert; Alt-Wege abgeschaltet.",
      "Adoption gemessen (Nutzungsdaten), Nachzügler nachgezogen; Abschaltdatum des Alt-Wegs dokumentiert.",
    ],
  },
];

export const byId: Record<string, Criterion> = Object.fromEntries(CRITERIA.map((c) => [c.id, c]));
export const dimById: Record<string, Dimension> = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d]));

/** Criteria of a dimension, in id order. */
export function criteriaOf(dimId: string): Criterion[] {
  return CRITERIA.filter((c) => c.dimension === dimId);
}

/** The three knock-out criteria (K8.1 intake, K5.1 + K2.2 optimisation). */
export const KNOCKOUTS: Criterion[] = CRITERIA.filter((c) => c.knockout);

/** Short-form self-assessment (doc A §7.3): the seven criteria a spoke rates alone. */
export const SELF_ASSESSMENT = ["K8.1", "K4.1", "K4.4", "K1.1", "K3.1", "K5.1", "K2.2"];
