import { describe, it, expect } from "vitest";
import { retagPlant } from "./plant-reassign.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

function demand(plant: string): string {
  const base = buildDemand(
    { id: "UC-2026-0200", createdOn: "2026-06-01", lane: "data_ai" },
    { ...EMPTY_ANSWERS, title: "T", plant, domain: "quality", problem: "x", currentPain: "y", desiredOutcome: "z" },
  );
  // Advance it so we can prove gates/history survive the retag.
  return base
    .replace("| G1 Intake accepted | open | | | |", "| G1 Intake accepted | passed | 2026-06-05 | champ@ex.com | ok |")
    .replace("- **Stage:** S1", "- **Stage:** S2");
}

const opts = { actor: "admin@ex.com", date: "2026-07-28" };

describe("retagPlant", () => {
  it("moves a demand from the matching plant, recording history, keeping stage & gates", () => {
    const r = retagPlant(demand("DE-ALD"), "DE-ALD", "SK-PUC", opts);
    expect(r.changed).toBe(true);
    if (!r.changed) return;
    const p = parseUseCase(r.markdown);
    expect(p.state.plant).toBe("SK-PUC");
    expect(p.state.stage).toBe("S2"); // untouched
    expect(p.gates.find((g) => g.id === "G1")?.status).toBe("passed"); // untouched
    expect(r.markdown).toContain("2026-07-28 — plant reassigned DE-ALD → SK-PUC by admin@ex.com");
  });

  it("matches the source plant case-insensitively", () => {
    const r = retagPlant(demand("DE-ALD"), "de-ald", "US-GRV", opts);
    expect(r.changed).toBe(true);
  });

  it("leaves a demand on a different plant untouched", () => {
    const r = retagPlant(demand("SK-PUC"), "DE-ALD", "US-GRV", opts);
    expect(r.changed).toBe(false);
  });

  it("leaves a demand with no plant untouched", () => {
    const r = retagPlant(demand(""), "DE-ALD", "US-GRV", opts);
    expect(r.changed).toBe(false);
  });
});
