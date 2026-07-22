import { describe, expect, it } from "vitest";
import { canOpenGate, validateConfidence } from "./gates.js";
import { parsePeople, parseUseCase, type ParsedUseCase } from "./parse.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../test/fixtures/${name}`, import.meta.url)), "utf8");
}

/** Build a README with a given stage and a set of passed gates. */
function makeReadme(stage: string, passed: string[]): ParsedUseCase {
  const allGates = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
  const rows = allGates
    .map((g) => `| ${g} | ${passed.includes(g) ? "passed" : "pending"} | | | |`)
    .join("\n");
  const md = `# UC-test\n\n## State\n\n- **Stage:** ${stage}\n- **Lane:** transform\n- **Status:** active\n\n## Gates\n\n| Gate | Status | Date | By | Note |\n|---|---|---|---|---|\n${rows}\n`;
  return parseUseCase(md);
}

const fullPeople = {
  requester: "req@example.com",
  sponsor: "sponsor@example.com",
  value_owner: "value@example.com",
};

describe("gate sequence", () => {
  it("permits the next gate when the predecessor is passed", () => {
    const readme = makeReadme("S2", ["G1"]);
    expect(canOpenGate("G2", { readme }).permitted).toBe(true);
  });

  it("refuses a gate whose predecessor is not passed", () => {
    const readme = makeReadme("S3", ["G1"]); // G2 not passed
    const d = canOpenGate("G3", { readme, people: fullPeople });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/G2 must be passed before G3/);
  });

  it("refuses re-opening an already-passed gate", () => {
    const readme = makeReadme("S3", ["G1", "G2"]);
    const d = canOpenGate("G2", { readme });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/already been passed/);
  });

  it("refuses a gate skip (G3 while G2 open)", () => {
    const readme = makeReadme("S2", ["G1"]);
    expect(canOpenGate("G3", { readme, people: fullPeople }).permitted).toBe(false);
  });
});

describe("role presence before G3", () => {
  it("refuses G3 without a sponsor", () => {
    const readme = makeReadme("S3", ["G1", "G2"]);
    const d = canOpenGate("G3", { readme, people: { value_owner: "v@example.com" } });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/sponsor/i);
  });

  it("refuses G3 without a value owner", () => {
    const readme = makeReadme("S3", ["G1", "G2"]);
    const d = canOpenGate("G3", { readme, people: { sponsor: "s@example.com" } });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/value owner/i);
  });

  it("permits G3 with both roles present", () => {
    const readme = makeReadme("S3", ["G1", "G2"]);
    expect(canOpenGate("G3", { readme, people: fullPeople }).permitted).toBe(true);
  });
});

describe("baseline and confidence", () => {
  it("refuses G5 when the baseline is not verified", () => {
    const readme = makeReadme("S5", ["G1", "G2", "G3", "G4"]);
    const d = canOpenGate("G5", { readme, businessCase: { baselineVerified: false } });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/baseline/i);
  });

  it("permits G5 when baseline verified", () => {
    const readme = makeReadme("S5", ["G1", "G2", "G3", "G4"]);
    expect(canOpenGate("G5", { readme, businessCase: { baselineVerified: true } }).permitted).toBe(true);
  });

  it("refuses committed confidence before S5", () => {
    const readme = makeReadme("S3", ["G1", "G2"]);
    const d = canOpenGate("G3", {
      readme,
      people: fullPeople,
      businessCase: { confidence: "committed" },
    });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/committed/i);
  });

  it("validateConfidence flags committed at S3 and allows it at S5", () => {
    expect(validateConfidence("S3", { confidence: "committed" }).permitted).toBe(false);
    expect(validateConfidence("S5", { confidence: "committed" }).permitted).toBe(true);
    expect(validateConfidence("S3", { confidence: "indicative" }).permitted).toBe(true);
  });
});

describe("value owner survives handover before G7", () => {
  it("refuses G7 with no surviving value owner", () => {
    const readme = makeReadme("S7", ["G1", "G2", "G3", "G4", "G5", "G6"]);
    const d = canOpenGate("G7", { readme, people: {} });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/value owner/i);
  });

  it("permits G7 with a handover value owner", () => {
    const readme = makeReadme("S7", ["G1", "G2", "G3", "G4", "G5", "G6"]);
    expect(canOpenGate("G7", { readme, handoverValueOwner: "v@example.com" }).permitted).toBe(true);
  });
});

describe("self-approval", () => {
  it("refuses when the actor is the requester", () => {
    const readme = makeReadme("S2", ["G1"]);
    const d = canOpenGate("G2", {
      readme,
      people: { requester: "me@example.com" },
      actor: "me@example.com",
    });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/requester may not approve/i);
  });

  it("permits when a different person approves", () => {
    const readme = makeReadme("S2", ["G1"]);
    const d = canOpenGate("G2", {
      readme,
      people: { requester: "me@example.com" },
      actor: "someone@example.com",
    });
    expect(d.permitted).toBe(true);
  });
});

describe("needs-attention use cases are not advanced", () => {
  it("refuses any gate when state is unreadable", () => {
    const readme = parseUseCase(fixture("readme-nostate.md"));
    const d = canOpenGate("G2", { readme });
    expect(d.permitted).toBe(false);
    if (!d.permitted) expect(d.reason).toMatch(/couldn't be read/i);
  });
});

describe("end-to-end against the valid fixture", () => {
  it("permits G4 (next gate) with people present", () => {
    const md = fixture("readme-valid.md");
    const readme = parseUseCase(md);
    const people = parsePeople(md);
    // G4 is open, G3 passed → permitted; people present.
    expect(canOpenGate("G4", { readme, people }).permitted).toBe(true);
  });
});
