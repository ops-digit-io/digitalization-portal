/**
 * Interface i18n coverage — "100% in every language" as a checked fact.
 *
 * English is the master key set. Every other locale must carry EXACTLY those keys:
 * a missing one is an untranslated string reaching a user; an extra one is a key
 * nobody renders. Either fails the build. It also ties the dictionary to the real
 * surface it serves — every launchpad tile and category must have its keys — so a
 * new tool cannot ship without being translated into all four languages.
 */

import { describe, it, expect } from "vitest";
import { DICTIONARIES, LOCALES, DEFAULT_LOCALE, translate, isLocale, type Locale } from "./i18n.js";
import { LAUNCHPAD } from "./launchpad.js";

const NON_DEFAULT = LOCALES.map((l) => l.code).filter((c) => c !== DEFAULT_LOCALE);
const enKeys = Object.keys(DICTIONARIES.en).sort();

describe("every locale covers the English master 100%", () => {
  it("English is the default and is non-empty", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(enKeys.length).toBeGreaterThan(50);
  });

  for (const code of NON_DEFAULT) {
    it(`${code} has every English key — none missing`, () => {
      const keys = new Set(Object.keys(DICTIONARIES[code]));
      const missing = enKeys.filter((k) => !keys.has(k));
      expect(missing, `${code} is missing ${missing.length} keys`).toEqual([]);
    });

    it(`${code} has no keys English lacks — nothing orphaned`, () => {
      const extra = Object.keys(DICTIONARIES[code]).filter((k) => !DICTIONARIES.en[k]);
      expect(extra, `${code} has ${extra.length} keys not in English`).toEqual([]);
    });

    it(`${code} leaves no value blank`, () => {
      const blank = Object.entries(DICTIONARIES[code]).filter(([, v]) => v.trim() === "").map(([k]) => k);
      expect(blank).toEqual([]);
    });

    it(`${code} is actually translated, not a copy of English`, () => {
      // A handful of proper nouns are legitimately identical across languages
      // (e.g. "Backlog", "Triage", "Digital Champions", "Roadmap"). Anything
      // beyond a small share means a locale was stubbed with English.
      const identical = enKeys.filter((k) => DICTIONARIES[code][k] === DICTIONARIES.en[k]);
      expect(identical.length / enKeys.length).toBeLessThan(0.2);
    });
  }
});

describe("the dictionary matches the surface it serves", () => {
  const tiles = LAUNCHPAD.flatMap((g) => g.tiles);
  const categories = LAUNCHPAD.map((g) => g.category);

  it("every launchpad tile has a title and subtitle key in English", () => {
    const missing: string[] = [];
    for (const t of tiles) {
      if (!DICTIONARIES.en[`tile.${t.id}.title`]) missing.push(`tile.${t.id}.title`);
      if (!DICTIONARIES.en[`tile.${t.id}.subtitle`]) missing.push(`tile.${t.id}.subtitle`);
    }
    expect(missing).toEqual([]);
  });

  it("every launchpad category has a key in English", () => {
    const missing = categories.filter((c) => !DICTIONARIES.en[`cat.${c}`]);
    expect(missing).toEqual([]);
  });
});

describe("translate() resolution", () => {
  it("returns the locale value when present", () => {
    expect(translate("de", "lang.label")).toBe("Sprache");
    expect(translate("es", "lang.label")).toBe("Idioma");
    expect(translate("zh", "lang.label")).toBe("语言");
  });

  it("falls back to English, then the caller fallback, then the key", () => {
    expect(translate("de", "does.not.exist", "fb")).toBe("fb");
    expect(translate("en", "totally.unknown.key")).toBe("totally.unknown.key");
  });

  it("isLocale guards the four supported codes", () => {
    for (const c of ["en", "de", "es", "zh"] as Locale[]) expect(isLocale(c)).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
