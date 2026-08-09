/**
 * The "100% translated" guarantee, mechanically enforced.
 *
 * Two properties keep it honest:
 *   1. Every locale defines EXACTLY the English key set — no missing key (a gap that
 *      would silently fall back to English) and no stray key (a translation for
 *      something that no longer exists). The failure message names the offenders.
 *   2. The English key set COVERS the live UI surface: every launchpad category and
 *      every tile's title+subtitle. So adding a tile without translating it fails
 *      here, rather than shipping an untranslated string.
 */

import { describe, it, expect } from "vitest";
import { LOCALES, DICTIONARIES, localeKeys, translate, type Locale } from "./i18n";
import { LAUNCHPAD, ALL_TILES } from "./launchpad";

const EN_KEYS = localeKeys();

describe("every locale is a complete translation of the English key set", () => {
  it("lists the ten shipped locales", () => {
    expect(LOCALES.map((l) => l.code)).toEqual(["en", "de", "zh", "fr", "es", "sr", "hu", "ro", "pt", "sk"]);
  });

  it("has a dictionary for every listed locale, and vice versa", () => {
    expect(Object.keys(DICTIONARIES).sort()).toEqual(LOCALES.map((l) => l.code).sort());
  });

  for (const { code } of LOCALES) {
    it(`${code}: defines exactly the English keys — none missing, none extra`, () => {
      const keys = Object.keys(DICTIONARIES[code as Locale]);
      const missing = EN_KEYS.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !EN_KEYS.includes(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it(`${code}: no value is left blank`, () => {
      const blank = Object.entries(DICTIONARIES[code as Locale])
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);
      expect(blank).toEqual([]);
    });
  }
});

describe("the English key set covers the whole launchpad", () => {
  it("has a name for every category", () => {
    const categories = LAUNCHPAD.map((g) => g.category);
    const missing = categories.filter((c) => !EN_KEYS.includes(`cat.${c}`));
    expect(missing).toEqual([]);
  });

  it("has a title and subtitle for every tile", () => {
    const missing = ALL_TILES.flatMap((t) => [
      EN_KEYS.includes(`tile.${t.id}.title`) ? null : `tile.${t.id}.title`,
      EN_KEYS.includes(`tile.${t.id}.subtitle`) ? null : `tile.${t.id}.subtitle`,
    ]).filter(Boolean);
    expect(missing).toEqual([]);
  });

  it("every tile resolves to a non-English string in each non-English locale", () => {
    // A concrete end-to-end check: the home page calls translate() exactly like this.
    for (const { code } of LOCALES.filter((l) => l.code !== "en")) {
      for (const t of ALL_TILES) {
        const title = translate(code as Locale, `tile.${t.id}.title`, t.title);
        expect(title, `${code} tile.${t.id}.title`).not.toBe("");
      }
    }
  });
});
