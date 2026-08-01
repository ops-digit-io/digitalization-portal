/**
 * The persona library. Two things carry the weight and are tested hardest:
 * the markdown round-trip (the file is the system of record, so a save must not
 * quietly lose a field), and id allocation (a requirement written last year still
 * cites P-03 and must keep resolving to the same person).
 */

import { describe, it, expect } from "vitest";
import {
  citePersona, completePersona, isPersonaId, nextPersonaId, parsePersona, personasForDomain,
  renderPersona, resolvePersona, unknownPersonaRefs, validatePersona, type Persona,
} from "./persona-library";

const full: Persona = {
  id: "P-03",
  name: "Maintenance Planner",
  kind: "user",
  authority: "uses",
  domains: ["maintenance"],
  plants: ["Hamburg"],
  summary: "Plans the weekly maintenance window and answers for machine availability.",
  goals: ["Fill the window without stopping production", "Know which spares are on site"],
  frictions: ["Spare-part stock lives in a spreadsheet nobody trusts", "Two systems disagree on run hours"],
  systems: ["SAP PM", "Excel"],
  successLooksLike: ["Plans a week in one sitting instead of three"],
  triggers: ["A missed window that cost a shift"],
  objections: ["Another login is another thing that goes stale"],
  quote: "I plan around the spreadsheet, not the system.",
  sourcedFrom: "Interview, 12 June, Hamburg",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("ids", () => {
  it("recognises the id format", () => {
    expect(isPersonaId("P-01")).toBe(true);
    expect(isPersonaId("P-103")).toBe(true);
    expect(isPersonaId("P1")).toBe(false);
    expect(isPersonaId("")).toBe(false);
  });

  it("allocates the next id, and never reuses a retired one", () => {
    expect(nextPersonaId([])).toBe("P-01");
    expect(nextPersonaId(["P-01", "P-02"])).toBe("P-03");
    // P-02 deleted: the number stays spent, because a story may still cite it.
    expect(nextPersonaId(["P-01", "P-03"])).toBe("P-04");
  });

  it("survives junk in the existing list", () => {
    expect(nextPersonaId(["", "nonsense", "P-07"])).toBe("P-08");
  });
});

describe("markdown round-trip", () => {
  it("renders and parses back without losing a field", () => {
    expect(parsePersona(renderPersona(full))).toEqual(full);
  });

  it("round-trips a sparse persona — empty lists stay empty, not undefined", () => {
    const sparse = completePersona({ name: "Shift Lead", summary: "Runs the shift.", goals: ["Start on time"] }, "P-09");
    const back = parsePersona(renderPersona(sparse));
    expect(back).toEqual(sparse);
    expect(back.frictions).toEqual([]);
    expect(back.quote).toBeUndefined();
  });

  it("puts the citable heading first — the file is readable without the portal", () => {
    expect(renderPersona(full).split("\n")[0]).toBe("# P-03 · Maintenance Planner");
  });

  it("falls back to safe defaults on an unknown kind or authority", () => {
    const md = renderPersona(full).replace("**Kind:** user", "**Kind:** wizard").replace("**Authority:** uses", "**Authority:** vibes");
    const p = parsePersona(md);
    expect(p.kind).toBe("user");
    expect(p.authority).toBe("uses");
  });

  it("keeps a multi-word list item intact, dashes and all", () => {
    const p = completePersona({ name: "X", summary: "s", goals: ["Cut hand-offs — from four to one"] }, "P-01");
    expect(parsePersona(renderPersona(p)).goals).toEqual(["Cut hand-offs — from four to one"]);
  });
});

describe("validation", () => {
  it("passes a complete persona with no warnings", () => {
    const v = validatePersona(full);
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
  });

  it("requires a name, a summary and at least one goal — a story needs all three", () => {
    const v = validatePersona({});
    expect(v.ok).toBe(false);
    expect(v.errors).toHaveLength(3);
  });

  it("warns rather than blocks on the softer gaps — a forced form invents content", () => {
    const v = validatePersona({ name: "X", summary: "s", goals: ["g"] });
    expect(v.ok).toBe(true);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("flags a buyer nobody has heard say no", () => {
    const v = validatePersona({ name: "Plant Manager", summary: "s", goals: ["g"], kind: "buyer", objections: [] });
    expect(v.warnings.join(" ")).toMatch(/objection/i);
  });
});

describe("selection", () => {
  const org = completePersona({ name: "Works Council", kind: "influencer", summary: "s", goals: ["g"] }, "P-10");
  const domainUser = completePersona({ name: "Planner", kind: "user", domains: ["maintenance"], summary: "s", goals: ["g"] }, "P-02");
  const domainBuyer = completePersona({ name: "Plant Manager", kind: "buyer", domains: ["maintenance"], summary: "s", goals: ["g"] }, "P-05");
  const other = completePersona({ name: "Buyer", kind: "user", domains: ["logistics"], summary: "s", goals: ["g"] }, "P-06");
  const all = [other, org, domainBuyer, domainUser];

  it("puts the domain's own personas first, user before buyer", () => {
    expect(personasForDomain(all, "maintenance").map((p) => p.id)).toEqual(["P-02", "P-05", "P-10"]);
  });

  it("excludes personas belonging to another domain", () => {
    expect(personasForDomain(all, "maintenance").map((p) => p.id)).not.toContain("P-06");
  });

  it("is deterministic — the same demand renders the same document twice", () => {
    expect(personasForDomain(all, "maintenance")).toEqual(personasForDomain([...all].reverse(), "maintenance"));
  });

  it("matches the domain case-insensitively", () => {
    expect(personasForDomain(all, "Maintenance").map((p) => p.id)).toContain("P-02");
  });
});

describe("citation and resolution", () => {
  const all = [full];

  it("cites as id · name", () => {
    expect(citePersona(full)).toBe("P-03 · Maintenance Planner");
  });

  it("resolves a citation, a bare id, or a plain name", () => {
    expect(resolvePersona(all, "P-03 · Maintenance Planner")?.id).toBe("P-03");
    expect(resolvePersona(all, "P-03")?.id).toBe("P-03");
    // documents written before the library existed still link up
    expect(resolvePersona(all, "maintenance planner")?.id).toBe("P-03");
    expect(resolvePersona(all, "nobody")).toBeUndefined();
  });

  it("names the personas a document leans on but nobody has described", () => {
    expect(unknownPersonaRefs(all, ["P-03", "shift lead", "P-99", "shift lead"])).toEqual(["P-99", "shift lead"]);
  });
});

// ── the standardization payoff: requirements written in the governed vocabulary ──

describe("requirements written against the library", () => {
  const lib = [
    completePersona({ name: "Maintenance Planner", kind: "user", domains: ["maintenance"], summary: "Plans the window.", goals: ["Fill the window"], frictions: ["Stock lives in a spreadsheet"] }, "P-02"),
    completePersona({ name: "Plant Manager", kind: "buyer", domains: ["maintenance"], authority: "approves budget", summary: "Signs the spend.", goals: ["Fewer stoppages"], objections: ["Another licence to renew"] }, "P-05"),
  ];
  const answers = {
    title: "Spare-part visibility", problem: "Planners cannot see stock", currentPain: "3 hours per week",
    desiredOutcome: "Stock visible in the planning view", plant: "Hamburg", domain: "maintenance",
  } as never;

  it("cites the library instead of a bare role name", async () => {
    const { analyseIntake } = await import("./requirements.js");
    const { requirements } = analyseIntake(answers, lib);
    expect(requirements.stories[0]!.persona).toBe("P-02 · Maintenance Planner");
  });

  it("writes stories from the user's side — a buyer is not the subject of 'As a…'", async () => {
    const { analyseIntake } = await import("./requirements.js");
    const { requirements } = analyseIntake(answers, lib);
    expect(requirements.stories.every((s) => !s.persona.startsWith("P-05"))).toBe(true);
  });

  it("spells the citations out in the document, objections included", async () => {
    const { analyseIntake, buildAnalysisMarkdown } = await import("./requirements.js");
    const { analysis } = analyseIntake(answers, lib);
    const md = buildAnalysisMarkdown({ id: "UC-1", title: "T", generatedAt: "2026-08-01" } as never, analysis);
    expect(md).toContain("### Persona profiles");
    expect(md).toContain("#### P-05 · Plant Manager");
    // the half of a business case that otherwise arrives late and expensive
    expect(md).toContain("Another licence to renew");
  });

  it("falls back to the baseline roles when no library is supplied", async () => {
    const { analyseIntake } = await import("./requirements.js");
    const { analysis, requirements } = analyseIntake(answers);
    expect(analysis.personaProfiles).toBeUndefined();
    expect(requirements.stories[0]!.persona).not.toMatch(/^P-\d/);
  });

  it("every cited persona resolves — that is what standardization means here", async () => {
    const { analyseIntake } = await import("./requirements.js");
    const { requirements } = analyseIntake(answers, lib);
    expect(unknownPersonaRefs(lib, requirements.stories.map((s) => s.persona))).toEqual([]);
  });
});
