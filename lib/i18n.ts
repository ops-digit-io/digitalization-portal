/**
 * Minimal i18n. English is the default; German is provided as the second locale
 * (interface language DE + EN, NFR-9). Adding a language later is one more entry
 * in `DICT` plus a row in `LOCALES` — no code change.
 *
 * Keys resolve against the active locale, then fall back to English, then to the
 * key itself. English strings live mostly in the component/data as defaults, so
 * only translations that differ need a DICT entry.
 */

export type Locale = "en" | "de";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];

export const DEFAULT_LOCALE: Locale = "en";

type Strings = Record<string, string>;

const EN: Strings = {
  "app.tagline": "Your front door to change demand — capture, analyse, decide, and build. Pick a tool.",
  "search.placeholder": "Search tools…",
  "search.empty": "No tools match.",
  "search.open": "Search tools",
  "theme.toggle": "Toggle theme",
  "lang.label": "Language",
  "tile.soon": "soon",
};

const DE: Strings = {
  "app.tagline": "Ihr zentraler Eingang für Veränderungsbedarf — erfassen, analysieren, entscheiden, bauen. Wählen Sie ein Tool.",
  "search.placeholder": "Tools suchen…",
  "search.empty": "Keine Tools gefunden.",
  "search.open": "Tools suchen",
  "theme.toggle": "Design umschalten",
  "lang.label": "Sprache",
  "tile.soon": "bald",

  // Categories
  "cat.Demand & intake": "Bedarf & Erfassung",
  "cat.Analyse & value": "Analyse & Wert",
  "cat.Portfolio & steering": "Portfolio & Steuerung",
  "cat.Build & deliver": "Bauen & Liefern",
  "cat.Govern & operate": "Steuern & Betreiben",

  // Tiles — title / subtitle
  "tile.assistant.title": "KI-Assistent",
  "tile.assistant.subtitle": "Erfassen, simulieren, analysieren",
  "tile.board.title": "Portfolio-Board",
  "tile.board.subtitle": "Alle Bedarfe nach Phase",
  "tile.attention.title": "Aufmerksamkeit nötig",
  "tile.attention.subtitle": "Unlesbar oder blockiert",
  "tile.new.title": "Neuer Bedarf",
  "tile.new.subtitle": "Ein Problem beschreiben",
  "tile.analysis.title": "Umsetzungsanalyse",
  "tile.analysis.subtitle": "Aufwand vs. Wert",
  "tile.value.title": "Wert-Cockpit",
  "tile.value.subtitle": "Pipeline · zugesagt · realisiert",
  "tile.simulate.title": "Business-Case-Simulation",
  "tile.simulate.subtitle": "P10 / P50 / P90 Bänder",
  "tile.review.title": "Wertüberprüfung",
  "tile.review.subtitle": "Abweichung zum Business Case",
  "tile.funnel.title": "Use-Case-Funnel",
  "tile.funnel.subtitle": "Phasenfluss, Kill-Rate je Gate",
  "tile.triage.title": "Triage",
  "tile.triage.subtitle": "Klassifizieren & zuweisen",
  "tile.backlog.title": "Backlog",
  "tile.backlog.subtitle": "Priorisieren (S2)",
  "tile.roadmap.title": "Roadmap",
  "tile.roadmap.subtitle": "Meilensteine & Gates",
  "tile.champions.title": "Digital Champions",
  "tile.champions.subtitle": "Werksportfolio",
  "tile.poc.title": "Agentischer PoC-Builder",
  "tile.poc.subtitle": "Repo · Spec · Artefakt",
  "tile.handovers.title": "Übergaben",
  "tile.handovers.subtitle": "Run-Lane & G7",
  "tile.compliance.title": "EU AI Act",
  "tile.compliance.subtitle": "Klassifizierung & Register",
  "tile.docs.title": "Spezifikation",
  "tile.docs.subtitle": "Governance & Datenmodell",
  "tile.catalog.title": "Skills & Playbooks",
  "tile.catalog.subtitle": "Agenten-Fähigkeiten",
  "tile.traces.title": "Agenten-Traces",
  "tile.traces.subtitle": "Wiederholbare KI-Läufe",
  "tile.digest.title": "Review-Digest",
  "tile.digest.subtitle": "Fällige Termine & Stillstand",
  "tile.settings.title": "Administration",
  "tile.settings.subtitle": "Rollen, Skills, Playbooks",
};

const DICT: Record<Locale, Strings> = { en: EN, de: DE };

/** Translate a key for a locale; falls back to English, then to `fallback`, then the key. */
export function translate(locale: Locale, key: string, fallback?: string): string {
  return DICT[locale]?.[key] ?? DICT.en[key] ?? fallback ?? key;
}
