import { describe, expect, it } from "vitest";
import {
  MAX_MANUAL_WEIGHT,
  mergeOverride,
  parseOverrides,
  parseRiskAdjustments,
  readToolPatch,
  serialiseOverrides,
  serialiseRiskAdjustments,
  validateRiskAdjustment,
  type ToolOverride,
} from "./adjustments.js";

describe("tool edits, as an overlay", () => {
  const md = `# Tool edits

| Tool | Name | Vendor | Capability | Domain | Scope | Hosting | Lifecycle | Integration | Business owner | IT owner | Users | Criticality | Annual cost | Notes | By | Date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| APP-001 |  |  |  |  |  |  |  |  |  |  |  |  | 1450000 |  | me@example.com | 2026-08-19 |
| uns-broker-hivemq | HiveMQ broker |  |  |  |  |  | tolerate |  |  | Ops IT | 12 |  |  |  | ops@example.com | 2026-08-19 |
`;

  it("reads only the cells that are set — a blank cell means unchanged", () => {
    const o = parseOverrides(md);
    expect([...o.keys()]).toEqual(["app-001", "uns-broker-hivemq"]);
    expect(o.get("app-001")!.patch).toEqual({ annualCost: 1450000 });
    expect(o.get("app-001")!.fields).toEqual(["Annual cost"]);
    expect(o.get("uns-broker-hivemq")!.patch).toEqual({ tool: "HiveMQ broker", lifecycle: "tolerate", itOwner: "Ops IT", users: 12 });
  });

  it("treats an em dash as an explicit clear, not as a value", () => {
    const o = parseOverrides(`| Tool | IT owner | Annual cost |\n|---|---|---|\n| APP-002 | — | — |\n`);
    expect(o.get("app-002")!.patch).toEqual({ itOwner: "", annualCost: null });
  });

  it("drops a value it cannot read rather than writing nonsense into the register", () => {
    const o = parseOverrides(`| Tool | Lifecycle | Users |\n|---|---|---|\n| APP-003 | banana | many |\n`);
    expect(o.get("app-003")!.patch).toEqual({ lifecycle: "", users: null });
  });

  it("never throws on rubbish, and skips a row that names no tool", () => {
    expect(parseOverrides(undefined).size).toBe(0);
    expect(parseOverrides("not a table").size).toBe(0);
    expect(parseOverrides(`| Tool | Notes |\n|---|---|\n|  | orphan |\n`).size).toBe(0);
  });

  it("round-trips through the writer", () => {
    const back = parseOverrides(serialiseOverrides([...parseOverrides(md).values()], "# Tool edits"));
    expect(back.get("app-001")!.patch).toEqual({ annualCost: 1450000 });
    expect(back.get("uns-broker-hivemq")!.patch.tool).toBe("HiveMQ broker");
  });

  it("merges a new patch onto the old one, so a one-field edit stays one field", () => {
    const first: ToolOverride = { tool: "APP-001", patch: { annualCost: 100 }, fields: ["Annual cost"], by: "a", date: "d1" };
    const second: ToolOverride = { tool: "APP-001", patch: { itOwner: "Corporate IT" }, fields: ["IT owner"], by: "b", date: "d2" };
    const merged = mergeOverride(first, second);
    expect(merged.patch).toEqual({ annualCost: 100, itOwner: "Corporate IT" });
    expect(merged.fields.sort()).toEqual(["Annual cost", "IT owner"]);
    expect(merged.by).toBe("b");
  });

  it("reads a submitted patch, ignoring the fields the form did not touch", () => {
    const { patch, fields } = readToolPatch({ annualCost: "18 000", lifecycle: "tolerate", vendor: "", notes: undefined });
    expect(patch).toEqual({ annualCost: 18000, lifecycle: "tolerate" });
    expect(fields).toEqual(["Lifecycle", "Annual cost"]);
  });

  it("takes the new NAME from `name`, never from `tool` — that key addresses the row", () => {
    // A patch is addressed by tool: `{ tool: "APP-001", annualCost: … }`. Reading
    // the name from `tool` renamed every edited tool to its own id.
    const { patch, fields } = readToolPatch({ tool: "APP-001", annualCost: "310000" });
    expect(patch).toEqual({ annualCost: 310000 });
    expect(fields).toEqual(["Annual cost"]);
    expect(readToolPatch({ tool: "APP-001", name: "Power BI" }).patch).toEqual({ tool: "Power BI" });
  });
});

describe("risk decisions", () => {
  it("reads accepted and added rows, clamping a runaway weight", () => {
    const a = parseRiskAdjustments(
      `| Tool | Action | Factor | Weight | Reason | By | Date |\n|---|---|---|---|---|---|---|\n` +
        `| APP-009 | accept | island | | Monthly export by design | hr@example.com | 2026-08-19 |\n` +
        `| APP-009 | add | Out of support 2027 | 900 | Vendor EOL | it@example.com | 2026-08-19 |\n`,
    );
    expect(a).toHaveLength(2);
    expect(a[0]).toMatchObject({ action: "accept", factor: "island", weight: 0 });
    expect(a[1]!.weight).toBe(MAX_MANUAL_WEIGHT);
  });

  it("skips a row with no tool, no factor or an unreadable action", () => {
    expect(parseRiskAdjustments(`| Tool | Action | Factor |\n|---|---|---|\n| | accept | island |\n| APP-1 | shrug | island |\n| APP-1 | accept | |\n`)).toEqual([]);
    expect(parseRiskAdjustments(undefined)).toEqual([]);
  });

  it("round-trips through the writer", () => {
    const one = { tool: "APP-009", action: "accept" as const, factor: "island", weight: 0, reason: "Fine", by: "me", date: "2026-08-19" };
    expect(parseRiskAdjustments(serialiseRiskAdjustments([one], "# Risk"))).toEqual([one]);
  });

  it("requires a reason — an accepted risk with no reason is a hidden risk", () => {
    const r = validateRiskAdjustment({ tool: "APP-009", action: "accept", factor: "island" }, "me", "2026-08-19");
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("reason");
  });

  it("requires a weight on a hand-added risk, and caps it", () => {
    expect(validateRiskAdjustment({ tool: "T", action: "add", factor: "EOL", reason: "why" }, "me", "d").ok).toBe(false);
    expect(validateRiskAdjustment({ tool: "T", action: "add", factor: "EOL", reason: "why", weight: 99 }, "me", "d").errors.join(" ")).toContain("at most");
    const ok = validateRiskAdjustment({ tool: "T", action: "add", factor: "EOL", reason: "why", weight: 20 }, "me", "2026-08-19");
    expect(ok.ok).toBe(true);
    expect(ok.adjustment).toMatchObject({ action: "add", weight: 20, by: "me", date: "2026-08-19" });
  });

  it("keeps an accept row's weight at zero whatever was submitted", () => {
    const r = validateRiskAdjustment({ tool: "T", action: "accept", factor: "island", reason: "known", weight: 30 }, "me", "d");
    expect(r.adjustment!.weight).toBe(0);
  });
});
