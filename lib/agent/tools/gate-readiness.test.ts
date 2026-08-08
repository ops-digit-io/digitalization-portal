import { describe, it, expect } from "vitest";
import { gateReadinessTool } from "./gate-readiness.js";
import { createDefaultRegistry } from "../registry.js";
import { DEMO_SESSION } from "../../seed.js";

const ctx = { session: DEMO_SESSION };

/** Minimal but real use-case README with a controllable stage + gate ladder. */
function readme(opts: {
  stage: string;
  passed: string[]; // gate ids passed, e.g. ["G1","G2"]
  sponsor?: string;
  valueOwner?: string;
  requester?: string;
}): string {
  const labels: Record<string, string> = {
    G1: "Intake accepted", G2: "Prioritized", G3: "Business case", G4: "POC proven/stop",
    G5: "Pilot proven", G6: "Scale readiness", G7: "Rollout complete",
  };
  const gateRows = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"]
    .map((g) => {
      const status = opts.passed.includes(g) ? "passed" : "pending";
      const date = opts.passed.includes(g) ? "2026-01-01" : "";
      const by = opts.passed.includes(g) ? "approver@example.com" : "";
      return `| ${g} ${labels[g]} | ${status} | ${date} | ${by} | |`;
    })
    .join("\n");
  const peopleRows = [
    `| Requester | ${opts.requester ?? "req@example.com"} |`,
    ...(opts.sponsor ? [`| Sponsor | ${opts.sponsor} |`] : []),
    ...(opts.valueOwner ? [`| Value owner | ${opts.valueOwner} |`] : []),
  ].join("\n");
  return `# UC-2026-0001 · Test case

## State

- **Stage:** ${opts.stage}
- **Lane:** transform
- **Status:** active
- **Plant:** DE-ALD
- **Domain:** quality
- **Created:** 2026-01-01

## People

| Role | Person |
|---|---|
${peopleRows}

## Gates

| Gate | Status | Date | By | Note |
|---|---|---|---|---|
${gateRows}
`;
}

const businessCase = (verified: boolean) => `# Business case · UC-2026-0001

## State

- **Confidence:** indicative

## Baseline

**Metric.** scrap rate
**Verified.** ${verified ? "Yes" : "No"}

## Value

**Category.** cost_savings
**Annual gross.** €100,000
**Basis.** test
`;

describe("gate-readiness tool", async () => {
  it("registers in the default registry (passes the no-forbidden-capability invariant)", async () => {
    const names = createDefaultRegistry().all().map((t) => t.name);
    expect(names).toContain("gate-readiness");
  });

  it("reports READY when a case at S3 has its predecessor passed and sponsor + value owner named", async () => {
    const out = await gateReadinessTool.run(
      { readme: readme({ stage: "S3", passed: ["G1", "G2"], sponsor: "s@example.com", valueOwner: "vo@example.com" }) },
      ctx,
    );
    expect(out.stage).toBe("S3");
    expect(out.targetGate).toBe("G3");
    expect(out.permitted).toBe(true);
    expect(out.blockingReason).toBeUndefined();
    // Every criterion for G3 is met.
    expect(out.checklist.every((c) => c.status !== "missing")).toBe(true);
    expect(out.checklist.find((c) => c.criterion === "Value owner named")?.status).toBe("met");
  });

  it("reports NOT READY with the value owner flagged when it is missing before G3", async () => {
    const out = await gateReadinessTool.run(
      { readme: readme({ stage: "S3", passed: ["G1", "G2"], sponsor: "s@example.com" }) },
      ctx,
    );
    expect(out.permitted).toBe(false);
    expect(out.blockingReason).toMatch(/value owner/i);
    expect(out.checklist.find((c) => c.criterion === "Value owner named")?.status).toBe("missing");
    // Sponsor is still shown as met — the checklist is the FULL picture, not just the first blocker.
    expect(out.checklist.find((c) => c.criterion === "Sponsor named")?.status).toBe("met");
  });

  it("flags a missing predecessor gate", async () => {
    const out = await gateReadinessTool.run(
      { readme: readme({ stage: "S3", passed: ["G1"], sponsor: "s@example.com", valueOwner: "vo@example.com" }) },
      ctx,
    );
    expect(out.permitted).toBe(false);
    expect(out.checklist.find((c) => c.criterion === "G2 passed")?.status).toBe("missing");
  });

  it("requires a verified baseline before G5 and reads it from the business case", async () => {
    const base = { stage: "S5", passed: ["G1", "G2", "G3", "G4"], sponsor: "s@example.com", valueOwner: "vo@example.com" };
    const notReady = await gateReadinessTool.run({ readme: readme(base), businessCase: businessCase(false) }, ctx);
    expect(notReady.targetGate).toBe("G5");
    expect(notReady.permitted).toBe(false);
    expect(notReady.checklist.find((c) => c.criterion === "Baseline verified")?.status).toBe("missing");

    const ready = await gateReadinessTool.run({ readme: readme(base), businessCase: businessCase(true) }, ctx);
    expect(ready.checklist.find((c) => c.criterion === "Baseline verified")?.status).toBe("met");
    expect(ready.permitted).toBe(true);
  });

  it("returns a fix-the-state report for an unreadable case, never throwing", async () => {
    const out = await gateReadinessTool.run({ readme: "# broken\n\nno state section here" }, ctx);
    expect(out.permitted).toBe(false);
    expect(out.checklist[0]?.criterion).toBe("State is readable");
    expect(out.summary).toMatch(/state/i);
  });

  it("says a terminal S8 case has no further gate", async () => {
    const out = await gateReadinessTool.run(
      { readme: readme({ stage: "S8", passed: ["G1", "G2", "G3", "G4", "G5", "G6", "G7"] }) },
      ctx,
    );
    expect(out.targetGate).toBeUndefined();
    expect(out.permitted).toBe(false);
    expect(out.summary).toMatch(/completed|no further gate/i);
  });
});
