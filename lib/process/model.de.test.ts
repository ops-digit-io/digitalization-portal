/**
 * The German overlay is keyed by id against verbatim English ports, so the way it
 * breaks is by OMISSION: someone adds a section and the German reader silently
 * gets an English one. The completeness checks below are the point of this file.
 *
 * The second half covers the score model's sentences, which are not stored text
 * but codes rendered at display time — the part most likely to fall back
 * unnoticed to English.
 */

import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_GROUPS } from "./sections";
import { ADVISORY } from "./advisory";
import { DIMENSIONS, KNOCK_OUTS, scoreProfile, trafficLight } from "./score-model";
import { SECTIONS_DE, STAGES_DE, ADVISORY_DE, SCORE_DIMENSIONS_DE, KNOCK_OUTS_DE } from "./model.de";
import * as C from "./content";

describe("the German overlay is complete", () => {
  it("covers all fourteen sections, label and description", () => {
    for (const s of SECTIONS) {
      const de = SECTIONS_DE[s.key];
      expect(de, `no German for section ${s.key}`).toBeDefined();
      expect(de!.label.length).toBeGreaterThan(0);
      expect(de!.description.length).toBeGreaterThan(0);
    }
  });

  it("carries a German gate question for every section that has one", () => {
    for (const s of SECTIONS.filter((x) => x.gateQuestion)) {
      expect(SECTIONS_DE[s.key]?.gateQuestion, `no German gate question for ${s.key}`).toBeTruthy();
    }
  });

  it("covers the five stages, the four advisory passes, the five dimensions and the three knock-outs", () => {
    for (const g of SECTION_GROUPS) expect(STAGES_DE[g.id], g.id).toBeDefined();
    for (const a of ADVISORY) expect(ADVISORY_DE[a.key], a.key).toBeDefined();
    for (const d of DIMENSIONS) expect(SCORE_DIMENSIONS_DE[d.key], d.key).toBeDefined();
    for (const k of KNOCK_OUTS) expect(KNOCK_OUTS_DE[k.key], k.key).toBeDefined();
  });

  it("does not leave a German entry sitting on its English original", () => {
    for (const s of SECTIONS) expect(SECTIONS_DE[s.key]!.label, s.key).not.toBe(s.label);
    for (const d of DIMENSIONS) expect(SCORE_DIMENSIONS_DE[d.key], d.key).not.toBe(d.label);
  });
});

describe("resolving text by locale", () => {
  const section = SECTIONS.find((s) => s.key === "profile")!;

  it("English reads the port itself — there is no second English copy to drift", () => {
    const t = C.sectionText("en", section);
    expect(t.label).toBe(section.label);
    expect(t.description).toBe(section.description);
    expect(t.gateQuestion).toBe(section.gateQuestion);
  });

  it("German reads the overlay", () => {
    expect(C.sectionText("de", section).label).toBe("Prozessprofil");
    expect(C.stageText("de", SECTION_GROUPS[0]!).label).toBe("Erfassung");
    expect(C.advisoryText("de", ADVISORY[0]!).label).toBe("Kritische Rückfragen");
    expect(C.scoreDimLabel("de", "visibility", "Visibility")).toBe("Sichtbarkeit");
    expect(C.koLabel("de", "spoke", "Responsible spoke")).toBe("Verantwortlicher Spoke");
  });

  it("an id the overlay does not know falls back to the source string, never to blank", () => {
    const made = { key: "invented", label: "Invented", description: "…", gateQuestion: "?" };
    expect(C.sectionText("de", made).label).toBe("Invented");
    expect(C.scoreDimLabel("de", "invented", "Invented")).toBe("Invented");
  });
});

describe("the score model's sentences in German", () => {
  const all = (v: number) =>
    Object.fromEntries(SECTIONS.map((s) => [s.key, v])) as Record<string, number>;

  /** Every branch of the light, so no reason code goes unrendered. */
  const cases: { name: string; profile: ReturnType<typeof scoreProfile> }[] = [
    { name: "grey (nothing filled)", profile: scoreProfile({}, {}) },
    { name: "grey (too thin)", profile: scoreProfile({ profile: 80 }, {}) },
    { name: "red (knock-out failed)", profile: scoreProfile(all(95), { profile: false }) },
    { name: "red (two dimensions down)", profile: scoreProfile(all(20), {}) },
    {
      name: "amber (blockers remain)",
      profile: scoreProfile(all(75), { profile: true, diagnostics: true, toolchain: true }),
    },
    {
      name: "green",
      profile: scoreProfile(all(95), { profile: true, diagnostics: true, toolchain: true }),
    },
  ];

  for (const c of cases) {
    it(`${c.name}: reason and drivers come out German, not English`, () => {
      const light = trafficLight(c.profile);
      const de = C.explainLight("de", light);
      expect(de.length, c.name).toBeGreaterThan(0);
      expect(de, c.name).not.toBe(light.reason);
      // The tell-tale: none of the engine's English phrasing survives.
      expect(de).not.toMatch(/Knock-out failed|Not assessed|Work to do|dimensions below/);

      const drivers = C.lightDrivers("de", light);
      expect(drivers.length).toBe(light.drivers.length);
      for (const d of drivers) expect(d.length).toBeGreaterThan(0);
    });
  }

  it("English is the engine's own prose, untouched", () => {
    const light = trafficLight(scoreProfile(all(20), {}));
    expect(C.explainLight("en", light)).toBe(light.reason);
    expect(C.lightDrivers("en", light)).toEqual(light.drivers);
  });

  it("renders every knock-out note in German", () => {
    // One profile per note code: cleared by verdict, unassessed, and weak evidence.
    for (const p of [scoreProfile({}, {}), scoreProfile({ profile: 10 }, {}), scoreProfile(all(95), { profile: true })]) {
      for (const k of p.knockOuts) {
        const de = C.koNote("de", k);
        expect(de.length).toBeGreaterThan(0);
        expect(de).not.toMatch(/not assessed|scored|recorded verdict/);
      }
    }
  });

  it("a code the overlay has never seen still shows the English sentence", () => {
    const light = {
      reason: "Something the engine knows and the overlay does not.",
      drivers: ["a driver"],
      reasonCode: { code: "light.inventedByAFutureRule" },
      driverCodes: [{ code: "driver.alsoInvented" }],
    };
    expect(C.explainLight("de", light)).toBe(light.reason);
    expect(C.lightDrivers("de", light)).toEqual(light.drivers);
  });
});
