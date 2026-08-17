/**
 * The production AI portfolio, and the refusal that is its point.
 *
 * A register of "AI use cases" is easy and says nothing. What this asserts is
 * that a row claiming to move a machine, without saying what stops it, is
 * REFUSED — with a reason, by the same guardrail the Department OS uses, and not
 * by a copy of it living here.
 */

import { describe, it, expect } from "vitest";
import {
  parseAiPortfolio,
  evaluate,
  refusals,
  controlLoops,
  byStage,
  safetyOf,
  summariseAi,
  MODEL_STAGES,
} from "./ai-portfolio.js";

const HEAD =
  "| ID | Use case | Plant | Domain | Model class | Stage | Authority | Control surface | Envelope | Fallback | Abort condition | Human owner | Demand |\n" +
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";

const ai = (
  id: string,
  stage: string,
  authority: string,
  surface: string,
  safety: [string, string, string] = ["", "", ""],
  owner = "Fertigungstechnik",
): string =>
  `| ${id} | uc | DE-ALD | quality | ml-forecast | ${stage} | ${authority} | ${surface} | ${safety[0]} | ${safety[1]} | ${safety[2]} | ${owner} | UC-1 |\n`;

const SAFE: [string, string, string] = ["±3 K", "recipe setpoint", "gauge offline 60 s"];

describe("parseAiPortfolio", () => {
  it("reads a well-formed row", () => {
    const rows = parseAiPortfolio(HEAD + ai("AI-1", "live", "recommend", "advice"));
    expect(rows[0]).toMatchObject({ id: "AI-1", stage: "live", authority: "recommend", surface: "advice", needsAttention: false });
  });

  it("never throws on absent, empty or table-less input", () => {
    expect(parseAiPortfolio(undefined)).toEqual([]);
    expect(parseAiPortfolio("")).toEqual([]);
    expect(parseAiPortfolio("# Prose only")).toEqual([]);
  });

  it("keeps and marks an unreadable stage, authority or surface", () => {
    const rows = parseAiPortfolio(HEAD + ai("AI-1", "nearly-done", "sort-of", "the machine"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues).toHaveLength(3);
  });

  it("marks a row with no named human — the ladder's rule, not softened for models", () => {
    const rows = parseAiPortfolio(HEAD + ai("AI-1", "live", "recommend", "advice", ["", "", ""], ""));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues.join(" ")).toContain("named human");
  });

  it("covers every declared stage", () => {
    expect(MODEL_STAGES).toContain("shadow");
    expect(MODEL_STAGES).toContain("assisted");
  });
});

describe("safetyOf", () => {
  it("counts a cell with text as written and a blank one as missing", () => {
    const [full] = parseAiPortfolio(HEAD + ai("AI-1", "live", "execute-with-approval", "setpoint", SAFE));
    expect(safetyOf(full!)).toEqual({ envelope: true, fallback: true, abortCondition: true });
    const [empty] = parseAiPortfolio(HEAD + ai("AI-2", "live", "execute-with-approval", "setpoint"));
    expect(safetyOf(empty!)).toEqual({ envelope: false, fallback: false, abortCondition: false });
  });
});

describe("evaluate — the refusal", () => {
  it("REFUSES an acting rung on a setpoint with no safety case, and says why", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-5", "concept", "execute-with-approval", "setpoint")))[0]!;
    expect(v.ok).toBe(false);
    expect(v.physical).toBe(true);
    expect(v.kind).toBe("semi-autonomous control loop");
    expect(v.reason).toContain("bounded envelope");
    expect(v.reason).toContain("does not by itself earn a machine");
  });

  it("REFUSES an autonomous loop with no safety case", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-12", "concept", "execute-autonomously", "setpoint")))[0]!;
    expect(v.ok).toBe(false);
    expect(v.kind).toBe("autonomous control loop");
  });

  it("PERMITS the same row once envelope, fallback and abort condition are written", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-4", "shadow", "execute-with-approval", "setpoint", SAFE)))[0]!;
    expect(v.ok).toBe(true);
    expect(v.kind).toBe("semi-autonomous control loop");
  });

  it("PERMITS an operator assistance system without a safety case — it recommends, it does not act", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-3", "assisted", "recommend", "setpoint")))[0]!;
    expect(v.ok).toBe(true);
    expect(v.kind).toBe("operator assistance system");
  });

  it("PERMITS an acting rung on a non-physical surface", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-6", "live", "execute-with-approval", "ticket")))[0]!;
    expect(v.ok).toBe(true);
    expect(v.physical).toBe(false);
  });

  it("refuses to judge a row whose authority or surface cannot be read", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-1", "live", "whatever", "advice")))[0]!;
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("readable");
  });

  it("refuses a physical acting row with no named human, on the ladder's grounds", () => {
    const v = evaluate(parseAiPortfolio(HEAD + ai("AI-1", "live", "execute-with-approval", "setpoint", SAFE, "")))[0]!;
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("agent brief must be complete");
  });
});

describe("refusals + controlLoops", () => {
  const rows = parseAiPortfolio(
    HEAD +
      ai("AI-1", "live", "recommend", "advice") +
      ai("AI-3", "assisted", "recommend", "setpoint") +
      ai("AI-4", "shadow", "execute-with-approval", "setpoint", SAFE) +
      ai("AI-12", "concept", "execute-autonomously", "setpoint"),
  );
  const v = evaluate(rows);

  it("surfaces only the rows that may not act", () => {
    expect(refusals(v).map((x) => x.row.id)).toEqual(["AI-12"]);
  });

  it("lists physical rows most authoritative first", () => {
    expect(controlLoops(v).map((x) => x.row.id)).toEqual(["AI-12", "AI-4", "AI-3"]);
  });

  it("leaves non-physical rows out of the loop list entirely", () => {
    expect(controlLoops(v).map((x) => x.row.id)).not.toContain("AI-1");
  });
});

describe("byStage + summariseAi", () => {
  const rows = parseAiPortfolio(
    HEAD +
      ai("AI-1", "live", "recommend", "advice") +
      ai("AI-4", "shadow", "execute-with-approval", "setpoint", SAFE) +
      ai("AI-12", "concept", "execute-autonomously", "setpoint"),
  );

  it("spreads the portfolio across the model lifecycle", () => {
    const s = Object.fromEntries(byStage(rows).map((x) => [x.stage, x.count]));
    expect(s).toMatchObject({ concept: 1, shadow: 1, live: 1, retired: 0 });
  });

  it("counts the physical rows, the acting ones, and the refusals", () => {
    expect(summariseAi(rows)).toMatchObject({
      models: 3,
      live: 1,
      physical: 2,
      actingOnMachines: 2,
      refused: 1,
      needsAttention: 0,
    });
  });
});
