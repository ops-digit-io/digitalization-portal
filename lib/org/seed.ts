/**
 * The bundled Department OS seed — one worked example, shipped in the app so `/org`
 * is never blank before `du-organization-context` is populated.
 *
 * "Operations Digitalization" is the real-case department the framework was pressure-
 * tested against (it is what grew the core from 9 to 12 files). Its sections are
 * authored to MEET the grammar in `model.ts`, so the example both demonstrates the
 * tool and doubles as the reference a real department fills its own files against.
 *
 * Inlined as string constants rather than read from disk on purpose: a serverless
 * function only bundles files it statically references, so a runtime `fs` read of a
 * `content/` directory would come back empty in production. The live source of truth
 * is always the external repo — this is the floor, not the ceiling.
 *
 * Language follows the source: the department describes itself in German, and the
 * grammar's patterns match German and English alike.
 */

const charter = `---
name: Operations Digitalization
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
purpose: Konnektivität in den Werken herstellen und Shopfloor-Realität in belastbare Entscheidungsgrundlagen überführen.
---

# Operations Digitalization — Charter

## Zweck / Vision

Konnektivität in den Werken herstellen und Shopfloor-Realität in belastbare
Entscheidungsgrundlagen überführen — damit in den Facilities datenbasiert entschieden
wird statt nach Erfahrung.

## Mission (heute)

Probleme am Shopfloor erfassen und transparent machen, technische Artefakte für ihre
Lösung liefern und technisch bootstrappen; Infrastruktur, Data Pipelines und
OT-Architektur standardisieren.

## Scope

Konnektivität von Workplaces und Assets · Datenerfassung und Pipelines ·
OT-Architektur- und Technologieentscheidungen · technische Artefakte je Use Case ·
Standardisierung im eigenen Technologiebereich · Demand- und Interaktionsmanagement
gegenüber den Werken.

## Non-Scope

Exakte Toolwahl (IT) · Licensing · Betrieb von Tools und Infrastruktur ·
Cybersecurity. Diese Themen sind **Stakeholder, nicht Aufgaben** — wir liefern zu,
entscheiden aber nicht.

## Mitgestaltung ohne Weisungsrecht

Standards des Manufacturing Engineering (DME): Wir wirken über Analytics und Insights
auf die Standards ein, verantworten sie aber nicht.

## Betriebsmodell

Global standardisiert, regional ausgeführt — **Europe · Americas (Nord + Süd) ·
Asia**, verteiltes Team, gemeinsame Standards, lokale Umsetzung.

## Stakeholder

| Stakeholder | Erwartung | Modus |
|---|---|---|
| OPEX / Operational Excellence | verwertbare technische Artefakte je Use Case | Empfänger unserer Leistung (siehe Übergabeverträge) |
| IT | Toolwahl, Systemintegration, Lizenzen | Tandem bei Roadmap-Themen |
| Cybersecurity | Sicherheitsanforderungen erfüllt | Konsultation, Freigabe bei OT-Anbindung |
| Werke / Facilities | Probleme werden gelöst, nicht nur erfasst | Kunde |
| DME / Manufacturing Engineering | Standards bleiben konsistent | Mitgestaltung ohne Entscheidungsrecht |
`;

const strategy = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: Review mit IT und OPEX im Quartals-Strategie-Round
source-of-truth: Abteilungsstrategie (Confluence) + IT-Roadmap-Abgleich
---

# Strategy — die Architektur der Wahl

## Annahmen (mit Ablauf)

- OPEX bleibt der primäre Abnehmer unserer Artefakte (gültig bis 2026-12-31 — bei
  Reorg neu zu prüfen).
- OT-Konnektivität ist der Engpass, nicht die Analytik: mehr Wert entsteht aus mehr
  verbundenen Assets als aus tieferen Modellen (Review je Quartal).
- Regionen akzeptieren globale Standards, solange die lokale Umsetzung frei bleibt.

## Wetten (mit Stopp-Kriterium)

- **Standardisierung vor Skalierung.** Wir bauen die Referenzarchitektur, bevor wir
  in die Breite gehen. *Stopp, wenn* die Standardabdeckung nach zwei Quartalen unter
  80 % bleibt — dann ist der Standard nicht benutzbar, nicht die Umsetzung zu langsam.
- **Tandem mit IT statt Zuständigkeitsstreit.** Roadmap-Themen laufen gemeinsam.
  *Stopp, wenn* die Übergabequote unter 90 % fällt — dann ist die Naht falsch gelegt.

## Nicht-Wetten (bewusst nicht verfolgt)

- Kein eigenes Tool-Portfolio — wir betreiben keine Tools, wir spezifizieren sie.
- Keine plantweiten Rollouts vor bewiesenem Nutzen in einer Referenz-Facility.
- Keine Analytics-Tiefe, deren Datenbasis noch nicht verbunden ist.
`;

const objectives = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
---

# Objectives — nach oben verdrahtet

| Ziel | Zahlt ein auf (Unternehmensziel) | Gemessen an | Typ |
|---|---|---|---|
| Konnektivität in allen Referenz-Facilities | Data-driven Operations | Connectivity-Throughput je Region | Change |
| Referenzarchitektur OT etabliert | Standardisierung Fertigung | Standardabdeckung > 90 % | Change |
| Übergaben an OPEX ohne technische Rückfrage | Time-to-Value Digitalisierung | Übergabequote 100 % | Hold |
| Blocking Points sichtbar und alt-arm | Steuerbarkeit Portfolio | Median Blocker-Alter < 30 Tage | Change |
`;

const serviceCatalog = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
---

# Service catalog — die Lanes

Die Kette L1→L8 ist eine Abfolge mit Stage-Gates (siehe \`portfolio.md\`), nicht eine
Menge paralleler Lanes.

| Lane | Kunde | Auslöser | Definition of Done | Mensch/Agent | global/regional | Owner |
|---|---|---|---|---|---|---|
| L1 Digital Benefit Value Analysis | Werk, OPEX | Bedarf oder Roadmap-Planung | Nutzen quantifiziert, Annahmen dokumentiert | Mensch | regional | Region Lead |
| L2 Connectivity- und Legacy-Assessment | Werk | nach L1 | Bestand je Facility in \`landscape.md\` | Agent-gestützt | regional | Region Lead |
| L3 Barrieren- und Enabler-Analyse | OPEX | nach L2 | Barrieren mit Eigentümer und Klasse | Mensch | regional | Region Lead |
| L4 Roadmap und Systemintegration | IT (Tandem) | Vorhaben nicht sofort umsetzbar | abgestimmter Plan mit IT, Gate passiert | Mensch | global | Abteilungsleitung |
| L5 Sofortumsetzung (Connectivity) | Werk | Vorhaben sofort umsetzbar | Assets/Workplaces verbunden, Signale fließen | Agent-gestützt | regional | Region Lead |
| L6 Standardisierung | alle Regionen | Abweichung oder neue Technologie | Standard beschlossen, in \`standards.md\` | Mensch | global | Architektur |
| L7 Demand- und Interaktionsmanagement | Werke | laufend | Bedarf erfasst, priorisiert, beantwortet | Agent-gestützt | global | Abteilungsleitung |
| L8 Analytics und Insights | DME, Werke | laufend | Auswertung geliefert, Standardimpuls formuliert | Agent-gestützt | global | Analytics |

## Definition of Done

Eine Lane ist erst geschlossen, wenn ihr Artefakt das benannte Abnahmekriterium
erfüllt — bei übergebenden Lanes ist das der Abnahmepunkt aus \`handover-contracts.md\`.

## Durchlaufzeit & Eskalation

Regel-SLA je Lane ist eine Sprintlänge (zwei Wochen). Reißt eine Lane ihren Gate-Termin,
eskaliert der Region Lead binnen 48 h an die Abteilungsleitung; blockierende Punkte
gehen sofort ins Portfolio.
`;

const intake = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
---

# Intake — wie Arbeit hereinkommt

## Kanäle

Ein einziger Eingang: das Demand- und Interaktionsmanagement (L7). Werke melden Bedarf
über das Portal; Roadmap-Themen kommen aus dem Tandem mit IT. Zuruf und Direktkontakt
werden ins Portal übertragen, nicht daneben bearbeitet.

## Priorisierung

Nach dem bestehenden Roadmap-Kriterium: **sofort umsetzbar** (Connectivity vorhanden,
kein IT-Systembezug) vor **planungsbedürftig** (Systemintegration, Tandem mit IT).
Innerhalb der Klasse nach quantifiziertem Nutzen aus der L1-Value-Analysis.

## Was wir explizit ablehnen

- Toolbetrieb, Lizenzfragen, Cybersecurity-Verantwortung (Non-Scope — als Stakeholder
  weitergereicht).
- Use Cases ohne benannten Werks-Eigentümer.
- Sofort-Rollouts ohne Value Analysis.
`;

const operatingRhythm = `---
owner: Head of Operations Digitalization
review-cadence: monthly
last-verified: 2026-08-05
---

# Operating rhythm — die Kadenz

Geliefert wird in Sprints von zwei Wochen; Rollouts laufen in Wellen je Facility.

| Runde | Frequenz | Input | Output |
|---|---|---|---|
| Sprint-Planung | 2-wöchentlich | priorisierter Demand, offene Blocker | Sprint-Backlog, zugesagte Artefakte |
| Portfolio-Review | monatlich | Portfolio mit Stages und Blockern | Gate-Entscheidungen, Eskalationen |
| Regions-Sync | wöchentlich | regionaler Fortschritt, lokale Barrieren | abgestimmte Rollout-Wellen |
| Standard-Review | quartalsweise | Waiver-Häufungen, neue Technologien | beschlossene/abgelöste Standards |

## Eskalationsfenster & Lieferkadenz

Eskalationen werden binnen 48 h beantwortet. Die Lieferkadenz ist die Sprintlänge;
Rollout-Wellen folgen der Reihenfolge der Referenz-Facilities je Region.
`;

const metrics = `---
owner: Head of Operations Digitalization
review-cadence: monthly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: Kennzahlen-Review im monatlichen Portfolio-Review
source-of-truth: Asset-/Connectivity-Register, portfolio.md, Übergabeverträge
---

# Metrics

| Kennzahl | Formel | Quelle | Ziel | Eingriff ab |
|---|---|---|---|---|
| Connectivity-Throughput | neu verbundene Workplaces + Assets je Periode | Asset-/Connectivity-Register | Zielwert je Region | −20 % zum Plan |
| Use-Case-Integration | Use Cases mit Stage „Übergeben" / gesamt | \`portfolio.md\` | steigend je Sprint | Stagnation über 2 Sprints |
| Blocking-Point-Alter | Median Alter offener Blocker | \`portfolio.md\` | < 30 Tage | > 60 Tage |
| Übergabequote | von OPEX abgenommene Artefakte / geliefert | Übergabeverträge | 100 % | jede Ablehnung |
| Standardabdeckung | Umsetzungen nach Standard / gesamt | \`standards.md\` + Reviews | > 90 % | < 80 % oder Waiver-Häufung |
| Wiederholte Assessments | zweite Bestandsaufnahme in derselben Facility | \`landscape.md\` | 0 | ≥ 1 (Wissen ging verloren) |
`;

const decisionRights = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: RACI-Abgleich mit IT im Quartals-Strategie-Round
source-of-truth: Entscheidungsmodell (Confluence) + IT-Governance
---

# Decision rights & authority levels

| Entscheidungstyp | Rolle | gemeinsam mit | Modus | Umkehrbar | authority_level |
|---|---|---|---|---|---|
| OT-Architektur für einen Use Case | Architektur | — | eigen | teils | execute-with-approval |
| Data-Pipeline-Muster | Architektur | — | eigen | ja | execute-autonomously |
| Toolwahl | IT | Ops Digitalization | Konsultation | ja | recommend |
| Systemintegration in Bestandssysteme | IT + wir | beide | Tandem | nein | execute-with-approval |
| OT-Anbindung mit Netzwerkbezug | wir | Cybersecurity | Freigabe nötig | nein | execute-with-approval |
| Standard beschließen oder ablösen | Architektur | Regionen | Konsultation | ja | execute-with-approval |
| Abweichung vom Standard (Waiver) | Architektur | Werk | eigen, dokumentiert | ja | execute-with-approval |
`;

const risks = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
---

# Risks (lean)

| Risiko | Frühindikator | Gegenmaßnahme |
|---|---|---|
| Artefakte werden geliefert, aber nicht verwertet | Übergabequote sinkt, OPEX fragt technisch nach | Abnahmekriterium schärfen, gemeinsames Gate |
| Regionen bauen eigene Lösungen | Waiver-Häufung, Standardabdeckung sinkt | Standard-Review mit allen drei Regionen |
| Wissen bleibt in Köpfen | wiederholte Assessments derselben Facility | \`landscape.md\` als Pflichtausgabe von L2 |
| Blocker verharren bei anderen | Blocking-Point-Alter steigt | Eigentümer je Blocker, Eskalation über Demand-Management |
`;

const handoverContracts = `---
owner: Head of Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
---

# Handover contracts

| Artefakt | Empfänger | Format | Abnahmekriterium | Frist |
|---|---|---|---|---|
| Digital Benefit Value Analysis | OPEX + Werk | Bewertung mit Nutzenannahmen und Datenlage | Nutzen quantifiziert, Annahmen benannt | vor Roadmap-Gate |
| Connectivity- und Legacy-Bestand | OPEX, IT | Bestandsaufnahme je Facility | Systeme, Schnittstellen, Barrieren vollständig | vor Lösungsentwurf |
| Technisches Artefaktpaket je Use Case | OPEX | Architektur, Pipeline, Signal-/Datenmodell | OPEX kann daraus die Prozessimplementierung ableiten, ohne Rückfrage zur Technik | Sprintende |
| Blocking-Point-Meldung | Werk, IT, OPEX | strukturierter Eintrag im Portfolio | Blocker benannt, Eigentümer zugeordnet | sofort |

> Das Abnahmekriterium der dritten Zeile ist die wichtigste Zeile des ganzen
> Dokuments: Sie definiert, wann *ihr* fertig seid.
`;

const standards = `---
owner: Architektur — Operations Digitalization
review-cadence: quarterly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: Standard-Review mit allen drei Regionen
source-of-truth: standards.md + Architektur-Board-Beschlüsse
---

# Standards

| Standard | Geltungsbereich | Status | Waiver / Ausnahmeverfahren | Owner | gültig bis |
|---|---|---|---|---|---|
| Referenzarchitektur OT | global | gültig | Architektur-Board, dokumentiert je Werk | Architektur | 2026-12-31 |
| Data-Pipeline-Muster | global | gültig | nur mit begründetem Antrag | Architektur | 2026-12-31 |
| Infrastruktur-Baseline Facility | global | Entwurf | — (noch nicht bindend) | Architektur | 2026-09-30 |
| Signal- und Datenmodell Shopfloor | global | gültig | Waiver je Use Case, befristet | Analytics | 2026-12-31 |

## Unified Namespace

Der Namespace ist eine **vereinbarte Grammatik**, kein Broker. Der Broker ist
austauschbar; die Grammatik ist der Standard. Deshalb steht die Konvention in
\`registry/uns.md\` unter Versionskontrolle und wird auf \`/landscape\` gerendert.

| Standard | Geltungsbereich | Status | Waiver / Ausnahmeverfahren | Owner | gültig bis |
|---|---|---|---|---|---|
| STD-UNS-01 Namespace-Wurzel und Werkskürzel | global | gültig | keiner — Werkskürzel sind der Vertrag | Architektur | 2026-12-31 |
| STD-UNS-02 Bereichs- und Linien-Segmente | global | gültig | Architektur-Board, je Werk befristet | Ops IT Region | 2026-12-31 |
| STD-UNS-03 Zellen- und Asset-Segmente | global | Entwurf | — (noch nicht bindend) | Ops IT Region | 2026-09-30 |
| STD-UNS-04 Payload und Einheiten je Signal | global | Entwurf | — (noch nicht bindend) | Architektur | 2026-09-30 |
| STD-UNS-05 Auftragskontext am Topic | global | Entwurf | — (noch nicht bindend) | Architektur | 2026-09-30 |

## Warum „Entwurf" hier ehrlich ist

Ein Standard, der überall vereinbart und nirgends publiziert ist, ist eine Strategie,
kein Standard. \`/landscape\` zeigt beides getrennt: wie viele Segmente **agreed**
sind und wie viele tatsächlich **published**. Der Abstand zwischen beiden Zahlen ist
die Roadmap.
`;

const systemsOfRecord = `---
owner: Architektur — IT/OT Integration
review-cadence: quarterly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: Abgleich mit \`registry/landscape.md\` und den Werks-Interviews
source-of-truth: registry/landscape.md + registry/uns.md
---

# Systems of record

Für jedes Datenobjekt genau eine führende Quelle. Zwei Quellen für ein Objekt sind
der sicherste Weg zu einer falschen Antwort — und für einen Agenten, der handeln
soll, der Unterschied zwischen einer Entscheidung und einem Ratespiel.

Der Unified Namespace ändert daran nichts: er ist kein zweites Datenhaltungssystem,
sondern die **Verteilung** der führenden Quelle an alle Konsumenten. Wer in den
Namespace publiziert, bleibt der Owner des Datums.

| Datenobjekt | Führende Quelle (System) | Schreibrecht / Data Owner | Aktualität | UNS-Topic |
|---|---|---|---|---|
| Auftrag / Fertigungsauftrag | ERP (SAP) | Corporate IT | stündlich | \`rehau/<site>/order\` |
| Auftragsfortschritt | MES | Ops IT Region | live | \`rehau/<site>/<area>/<line>/order\` |
| Maschinenzustand | SPS über SCADA | Ops IT Region | live | \`rehau/<site>/<area>/<line>/state\` |
| Prozesswerte (Ist) | Historian | Ops IT Region | live | \`rehau/<site>/<area>/<line>/<asset>/<signal>\` |
| Sollwerte / Rezept | MES | Fertigungstechnik | je Auftrag | \`rehau/<site>/<area>/<line>/setpoint\` |
| Qualitätsmessung inline | Messsystem | Qualität | live | \`rehau/<site>/<area>/<line>/gauge\` |
| Stammdaten Material | ERP (SAP) | Corporate IT | täglich | \`rehau/<site>/material\` |
| Anlagenstammdaten | Asset-Register | Instandhaltung | wöchentlich | \`rehau/<site>/asset\` |

## Wo die Kette heute reißt

Wo die Spalte „Führende Quelle" ein System nennt, das in
\`registry/landscape.md\` \`Interface = none\` trägt, ist die führende Quelle
**nicht lesbar**. Das ist kein Dokumentationsproblem, sondern genau der K.-o. K2.2
des Prozess-Funnels: der Prozess kann nicht optimiert werden, weil die Diagnose
nicht möglich ist. Diese Systeme stehen im UNS-Rückstand auf \`/landscape\`.
`;

const landscape = `---
owner: Region Leads (Europe · Americas · Asia)
review-cadence: quarterly
last-verified: 2026-08-05
valid-until: 2026-12-31
verification-method: Werksbegehung + tatsächlich gezogener Datenauszug je System
source-of-truth: registry/landscape.md
---

# Landscape (per facility)

Der Bestand je Werk — was steht, auf welcher ISA-95-Ebene, und wie weit die Daten
in Richtung Namespace gekommen sind. Die Tabelle wird **nicht hier** gepflegt: sie
lebt zeilenweise in \`registry/landscape.md\` und wird auf \`/landscape\` gerendert.
Dieser Abschnitt sagt, wie sie zu lesen ist und was daraus folgt.

Der Zweck ist Wiederverwendung: die nächste Bestandsaufnahme im selben Werk ist
verlorene Zeit. Deshalb ist „Wiederholte Assessments" eine Kennzahl mit Zielwert 0
(\`metrics.md\`).

| Facility | Region | Rolle | Konnektivität (Reifegrad) | Legacy / Barriere | Owner |
|---|---|---|---|---|---|
| DE-ALD Aldingen | Europe | lead | Namespace modelliert, L0–L4 durchgängig | Beschichtungslinie: Anbieter-Blackbox, kein Leseinterface | Ops IT Europe |
| DE-VIE Viechtach | Europe | wave-1 | Broker fehlt, nur Direktzugriffe | Extrusionslinie 1: S7-300 ohne OPC-UA, Ersatzteilrisiko | Ops IT Europe |
| SK-PUC Púchov | Europe | wave-1 | Punkt-zu-Punkt, kein Historian | Eigenentwicklung MES ohne dokumentierte API | Ops IT Europe |
| PL-BAR Baranowo | Europe | wave-2 | Nächtlicher CSV-Abzug | Kein MES — Auftragssteuerung auf Laufkarten | Ops IT Europe |
| US-GRV Grove City | Americas | lead | Broker steht, Topic-Baum nicht normkonform | Modellierung nach STD-UNS-02 offen | Ops IT Americas |
| BR-SAO São Paulo | Americas | wave-2 | Kein MES, OEM-verriegelte Linie | Keine Datenklausel im Anlagenvertrag | Ops IT Americas |
| CN-SUZ Suzhou | Asia | lead | Punkt-zu-Punkt, kein Historian | Extrusionslinie 7: Netzsegment nicht routbar | Ops IT Asia |
| CN-FOS Foshan | Asia | wave-1 | CSV-Abzug | SCADA ohne dokumentierte Schnittstelle, Anbieter reagiert nicht | Ops IT Asia |
| IN-PUN Pune | Asia | wave-2 | Kein MES — Greenfield-Kandidat | Chance: ohne Altlast direkt auf den Standard | Ops IT Asia |

## Wie eine Barriere den Funnel erreicht

Eine Barriere in dieser Liste ist kein Ticket, sondern ein **Multiplikator**. Zweig
\`Z1b\` des Ablaufs sagt es ausdrücklich: eine nicht ausleitbare Schnittstelle
„zahlt per Compounding auf jeden weiteren Prozess am selben System ein". Deshalb
wird der UNS-Rückstand nicht nach Werk priorisiert, sondern danach, **wie viele
Prozesse ein System freigibt** — höhere ISA-95-Ebene zuerst.
`;

const portfolio = `---
owner: Head of Operations Digitalization
review-cadence: monthly
last-verified: 2026-08-05
---

# Portfolio — die Pipeline mit Stage-Gates

## Stages & Gates

\`Erfasst\` → *Gate: Nutzen plausibel* → \`Bewertet (L1)\` → *Gate: technisch machbar* →
\`Assessed (L2/L3)\` → *Gate: sofort oder Roadmap* → \`Geplant / In Umsetzung\` →
*Gate: Artefakt abgenommen* → \`Übergeben an OPEX\` → \`Wirksam\`

## Vorhaben

| Use Case | Facility / Region | Stage | Business Case | Blocking Point (Eigentümer, Klasse) | Übergabestatus |
|---|---|---|---|---|---|
| Presswerk-Konnektivität | Werk Nord / Europe | In Umsetzung | −18 % ungeplante Stopps | Netzfreigabe offen (Cybersecurity, Entscheidung) | offen |
| Scrap-Attribution Analytics | Werk Süd / Americas | Assessed (L2/L3) | Ausschuss −5 % | Legacy-Signal fehlt (IT, Technik) | offen |
| Energiedaten Pipeline | Werk Ost / Asia | Übergeben an OPEX | Energie-Transparenz je Linie | — | abgenommen |
| Rüstzeit-Transparenz | Werk West / Europe | Bewertet (L1) | Rüstzeit −10 % | Ressourcen Region (Ressourcen) | offen |
`;

/** The Operations Digitalization example, keyed by section file name. */
const OPERATIONS_DIGITALIZATION: Record<string, string> = {
  charter,
  strategy,
  objectives,
  "service-catalog": serviceCatalog,
  intake,
  "operating-rhythm": operatingRhythm,
  metrics,
  "decision-rights": decisionRights,
  risks,
  "handover-contracts": handoverContracts,
  standards,
  portfolio,
  // Module sections — the IT/OT axis. `systems-of-record` is critical in the
  // grammar (`model.ts`), and `landscape` is the section the /landscape surface
  // renders from `registry/landscape.md`.
  "systems-of-record": systemsOfRecord,
  landscape,
};

const SEED: Record<string, Record<string, string>> = {
  "operations-digitalization": OPERATIONS_DIGITALIZATION,
};

/** The slugs the bundled seed provides. */
export function bundledDepartments(): string[] {
  return Object.keys(SEED);
}

/** The bundled section files for a department, or undefined if it isn't seeded. */
export function bundledDepartment(slug: string): Record<string, string> | undefined {
  return SEED[slug];
}

/** The framework document, surfaced read-only on the org overview. */
export function bundledFramework(): string {
  return FRAMEWORK;
}

// ---------------------------------------------------------------- seeded lane

const laneAgentBrief = `---
owner: Region Lead — Europe
review-cadence: quarterly
last-verified: 2026-08-05
---

# Connectivity Assessment — Agent brief

## Scope
Assess one facility's connectivity and legacy landscape after an L1 value analysis:
inventory assets, interfaces and known barriers into \`landscape.md\`. NOT the solution
design (that is L4/L5) and NOT tool procurement.

## Authority level
\`recommend\` — the agent compiles the inventory and proposes the barrier list; a human
Region Lead accepts it before it becomes the basis for a roadmap decision.

## Rights per data object
Read: asset register, connectivity register, MES interfaces. Write: \`landscape.md\` for
this facility only. No write access to systems of record.

## Guardrails
Never contact a plant system directly; read exports only. Never mark a barrier resolved
— only a human closes a barrier.

## Escalation
Any barrier classified as a network/OT-security risk is escalated to Cybersecurity the
same day, before it is written up.
`;

const lanePlaybook = `---
owner: Region Lead — Europe
review-cadence: quarterly
last-verified: 2026-08-05
---

# Connectivity Assessment — Playbook

| Step | Human / Agent / both | Action | Output |
|---|---|---|---|
| 1 | agent | Pull asset & connectivity registers for the facility | raw inventory |
| 2 | both | Map interfaces and legacy systems | interface map |
| 3 | agent | Draft the barrier list with owner and class | draft barriers |
| 4 | human | Review and accept the barrier list | accepted \`landscape.md\` |

## Exceptions / error paths
Register export missing or stale → fall back to the last facility survey and flag the
gap; do not infer connectivity from age of equipment.

## Wait states
While waiting on a facility contact, the agent prepares the interface map from exports
so the human review starts from a draft, not a blank page.

## Handovers
The accepted \`landscape.md\` is handed to L3 (barrier & enabler analysis) — acceptance
criterion: every barrier has an owner and a class.

## Control points & rework rule
A barrier without an owner is sent back to step 3; the assessment is not "done" until
\`landscape.md\` lists no ownerless barrier.
`;

const laneSkills = `---
owner: Region Lead — Europe
review-cadence: quarterly
last-verified: 2026-08-05
---

# Connectivity Assessment — Skills, tools & interfaces

## Skills
Reading OT/IT interface documentation; classifying connectivity barriers (tech / IT /
resources / decision).

## Tools
The asset-register export tool; the connectivity dashboard (read-only); the
\`landscape.md\` template.

## Interfaces / systems
Asset register (read), connectivity register (read), MES interface catalogue (read).
`;

const laneTasks = `---
owner: Region Lead — Europe
review-cadence: quarterly
last-verified: 2026-08-05
---

# Connectivity Assessment — Recurring tasks

| Task | Trigger | Template | Owner |
|---|---|---|---|
| Open a facility assessment | L1 value analysis accepted | assessment checklist | Region Lead |
| Compile barrier list | interface map complete | barrier-list table | agent |
| Escalate OT-security barrier | a network-risk barrier found | Cybersecurity escalation note | agent |
`;

const laneMetrics = `---
owner: Region Lead — Europe
review-cadence: monthly
last-verified: 2026-08-05
---

# Connectivity Assessment — Lane metrics

| Metric | Formula | Source (system + field) | Target |
|---|---|---|---|
| Assessment lead time | accepted date − opened date | lane tracker | < 10 working days |
| Ownerless barriers at handover | count of barriers with no owner | \`landscape.md\` | 0 |
| Re-assessment rate | second assessment of same facility / total | \`landscape.md\` | 0 |
`;

const CONNECTIVITY_ASSESSMENT: Record<string, string> = {
  playbook: lanePlaybook,
  skills: laneSkills,
  tasks: laneTasks,
  metrics: laneMetrics,
  "agent-brief": laneAgentBrief,
};

/** Bundled lanes, keyed by department slug → lane slug → { file key → markdown }. */
const SEED_LANES: Record<string, Record<string, Record<string, string>>> = {
  "operations-digitalization": { "connectivity-assessment": CONNECTIVITY_ASSESSMENT },
};

/** The lane slugs the seed provides for a department. */
export function bundledLaneSlugs(deptSlug: string): string[] {
  return Object.keys(SEED_LANES[deptSlug] ?? {});
}

/** The bundled lane-pack files for a department's lane, or undefined if not seeded. */
export function bundledLane(deptSlug: string, laneSlug: string): Record<string, string> | undefined {
  return SEED_LANES[deptSlug]?.[laneSlug];
}

const FRAMEWORK = `# Department OS — the framework

A department is not a brand: a brand is a *state* ("this is who we are"), a department
is a *process* ("this is how we decide and deliver"). Department OS is the declarative
context layer that writes that process down — so the portal's tools know the org behind
the demands and processes they run, and so an agent can accept work, close it, and know
how far it may go on its own.

## Why a context layer

A context layer is not made useful by containing everything — it is made useful by every
field carrying a decision. Deliberately left out: org charts and role descriptions (age
fast, carry no steering knowledge), BPMN maps (high effort, low value as LLM context —
playbooks do the same usably), meeting minutes (belong in the decision log), skill
matrices, market analysis (belong to the brand/product), and probability×impact risk
matrices (false precision — the early indicator does more).

## The core — twelve files

Every department with a healthy process can fill these, coaching-supported, in about a
day. A department handbook falls out of them.

- **charter** — mandate, scope, the load-bearing non-scope, stakeholders, and the
  relationships where you shape without deciding.
- **strategy** — the architecture of choice: assumptions (with expiry), the bets (with a
  stop criterion), and the non-bets that stop every good idea from becoming work.
- **objectives** — goals wired upward to a company goal, each with how it is measured.
- **service-catalog** — the lanes: trigger + Definition of Done are the minimum for an
  agent to accept and close work, not just assist.
- **intake** — the channels, the prioritisation rule, and what is explicitly rejected.
- **operating-rhythm** — the rounds, each with a named input and output, plus the
  delivery cadence and escalation window.
- **metrics** — formula + source, so a number can be fetched, judged, and alerted on.
- **decision-rights** — decision types with role, reversibility, and the five-rung
  \`authority_level\` — the difference between a department and a queue in front of the boss.
- **risks** — lean: each risk's single watchable early indicator.
- **handover-contracts** — where your work ends in another department: the acceptance
  criterion that lets an agent CLOSE work instead of re-delivering endlessly.
- **standards** — the standards themselves, with status and a written waiver path.
- **portfolio** — for a department that is also a portfolio: the pipeline with
  stage-gates and, above all, the blocking points — the real steering signal.

## Beyond presence: freshness and validity

- **Freshness (every section):** \`review-cadence\` + \`last-verified\` make ageing
  measurable — the same logic a fleet audit uses to find drift.
- **Validity (critical sections — strategy, metrics, decision-rights, standards):**
  \`valid-until\`, \`verification-method\`, \`source-of-truth\`. \`last-verified\` says when
  someone looked; validity says whether the assumption still holds and how you would
  check. An agent acting on an expired assumption does so with full conviction.

## The five authority levels

\`read-only\` → \`draft\` → \`recommend\` → \`execute-with-approval\` → \`execute-autonomously\`.
Set per lane, not per department: autonomy is raised one lane at a time, only after that
lane's context is written down.

## The order is meant literally

1. One pilot department, not all.
2. Fill the core (coaching-supported) — human work, and where the real insight is.
3. Generate the handbook and check whether the core holds. Where it doesn't, you see
   immediately which field is missing.
4. Equip a single lane with its full pack and raise autonomy there — read-only → draft → …
5. Only then the second lane.

Whoever starts with automation gets agents executing rules nobody wrote down.
`;
