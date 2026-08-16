/**
 * The rollout engine, and above all THE INVARIANT: a wave may only scale a
 * technology in the `adopt` ring.
 *
 * That rule is the reason the evaluation register exists. Without it, "we
 * evaluate technologies and decide what goes into rollout" is a sentence rather
 * than a control — anything trialled anywhere could quietly appear in a plant.
 */

import { describe, it, expect } from "vitest";
import {
  parseTechnology,
  parseRollout,
  unadoptedWaves,
  declined,
  byRing,
  waveProgress,
  adoptionByPlant,
  summariseRollout,
} from "./rollout.js";

const T_HEAD =
  "| ID | Technology | Layer | Status | Trialled at | Evidence | Decision | Decided on | Decided by | Supersedes |\n" +
  "|---|---|---|---|---|---|---|---|---|---|\n";

const tech = (id: string, status: string, decision = "because", by = "Board"): string =>
  `| ${id} | ${id} name | L3 | ${status} | DE-ALD | UC-1 | ${decision} | 2026-01-01 | ${by} | |\n`;

const W_HEAD =
  "| Wave | Capability | Technology | Plant | State | Gate | Owner | Start | Live | Blocker |\n" +
  "|---|---|---|---|---|---|---|---|---|---|\n";

const wave = (w: string, techId: string, plant: string, state: string, blocker = ""): string =>
  `| ${w} | cap | ${techId} | ${plant} | ${state} | G5 | Ops IT | | | ${blocker} |\n`;

describe("parseTechnology", () => {
  it("reads the register", () => {
    const rows = parseTechnology(T_HEAD + tech("TEC-001", "adopt"));
    expect(rows[0]).toMatchObject({ id: "TEC-001", status: "adopt", needsAttention: false });
  });

  it("never throws on absent, empty or table-less input", () => {
    expect(parseTechnology(undefined)).toEqual([]);
    expect(parseTechnology("")).toEqual([]);
    expect(parseTechnology("# Prose only")).toEqual([]);
  });

  it("keeps and marks an unreadable ring", () => {
    const rows = parseTechnology(T_HEAD + tech("TEC-001", "probably-fine"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.status).toBe("");
    expect(rows[0]!.issues.join(" ")).toContain("probably-fine");
  });

  it("flags a decided ring with nobody named — a decision with no decider is a rumour", () => {
    const rows = parseTechnology(T_HEAD + tech("TEC-001", "adopt", "because", ""));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues.join(" ")).toContain("Decided by");
  });

  it("flags a decided ring with no decision text", () => {
    const rows = parseTechnology(T_HEAD + tech("TEC-009", "hold", "", "Board"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.issues.join(" ")).toContain("no decision recorded");
  });

  it("does NOT require a decider for the undecided rings", () => {
    const rows = parseTechnology(T_HEAD + tech("TEC-011", "assess", "", "") + tech("TEC-003", "trial", "", ""));
    expect(rows.every((r) => !r.needsAttention)).toBe(true);
  });
});

describe("unadoptedWaves — the invariant", () => {
  const t = parseTechnology(
    T_HEAD + tech("TEC-002", "adopt") + tech("TEC-003", "trial") + tech("TEC-008", "hold") + tech("TEC-014", "retire"),
  );

  it("passes a wave that scales an adopted technology", () => {
    const w = parseRollout(W_HEAD + wave("W1", "TEC-002", "DE-ALD", "live"));
    expect(unadoptedWaves(w, t)).toEqual([]);
  });

  it("catches a wave scaling something merely under trial", () => {
    const w = parseRollout(W_HEAD + wave("W1", "TEC-003", "DE-ALD", "scheduled"));
    const v = unadoptedWaves(w, t);
    expect(v).toHaveLength(1);
    expect(v[0]!.status).toBe("trial");
    expect(v[0]!.reason).toContain("not \"adopt\"");
  });

  it("catches a wave scaling something explicitly declined", () => {
    const w = parseRollout(W_HEAD + wave("W2", "TEC-008", "SK-PUC", "not-started"));
    expect(unadoptedWaves(w, t)[0]!.status).toBe("hold");
  });

  it("catches a wave scaling something being retired", () => {
    const w = parseRollout(W_HEAD + wave("W2", "TEC-014", "SK-PUC", "scheduled"));
    expect(unadoptedWaves(w, t)[0]!.status).toBe("retire");
  });

  it("catches a wave naming a technology the register has never heard of", () => {
    const w = parseRollout(W_HEAD + wave("W3", "TEC-999", "IN-PUN", "not-started"));
    const v = unadoptedWaves(w, t);
    expect(v[0]!.status).toBeNull();
    expect(v[0]!.reason).toContain("not in the evaluation register");
  });

  it("does not double-report a row whose technology cell is empty — the parser already flagged it", () => {
    const w = parseRollout(W_HEAD + "| W1 | cap |  | DE-ALD | live | G5 | Ops IT | | | |\n");
    expect(w[0]!.needsAttention).toBe(true);
    expect(unadoptedWaves(w, t)).toEqual([]);
  });
});

describe("declined + byRing", () => {
  const t = parseTechnology(
    T_HEAD + tech("A", "adopt") + tech("B", "hold") + tech("C", "retire") + tech("D", "assess", "", ""),
  );

  it("counts hold and retire as decisions, not gaps", () => {
    expect(declined(t).map((x) => x.id)).toEqual(["B", "C"]);
  });

  it("groups into rings in ring order", () => {
    expect(byRing(t).map((r) => `${r.status}:${r.items.length}`)).toEqual([
      "assess:1",
      "trial:0",
      "adopt:1",
      "hold:1",
      "retire:1",
    ]);
  });
});

describe("waveProgress", () => {
  const w = parseRollout(
    W_HEAD +
      wave("W1", "T", "DE-ALD", "live") +
      wave("W1", "T", "US-GRV", "in-progress", "topic tree") +
      wave("W2", "T", "SK-PUC", "not-started") +
      wave("W2", "T", "CN-SUZ", "on-hold", "not routable"),
  );

  it("reports live share and blockers per wave", () => {
    const p = waveProgress(w);
    expect(p[0]).toMatchObject({ wave: "W1", rows: 2, live: 1, inProgress: 1, percent: 50, blocked: 1 });
    expect(p[1]).toMatchObject({ wave: "W2", rows: 2, live: 0, onHold: 1, percent: 0, blocked: 1 });
  });
});

describe("adoptionByPlant", () => {
  it("puts the least-adopted plant first — the roadmap's debt, not its wins", () => {
    const w = parseRollout(
      W_HEAD +
        wave("W1", "T", "DE-ALD", "live") +
        wave("W2", "T", "DE-ALD", "live") +
        wave("W1", "T", "CN-SUZ", "not-started", "not routable"),
    );
    const a = adoptionByPlant(w);
    expect(a[0]!.plant).toBe("CN-SUZ");
    expect(a[0]!.percent).toBe(0);
    expect(a[0]!.blockers).toEqual(["not routable"]);
    expect(a[1]).toMatchObject({ plant: "DE-ALD", percent: 100 });
  });
});

describe("summariseRollout", () => {
  it("counts adoption, decline and any violation of the invariant", () => {
    const t = parseTechnology(T_HEAD + tech("A", "adopt") + tech("B", "hold"));
    const w = parseRollout(W_HEAD + wave("W1", "A", "DE-ALD", "live") + wave("W1", "B", "SK-PUC", "scheduled"));
    expect(summariseRollout(t, w)).toMatchObject({
      technologies: 2,
      adopted: 1,
      declinedCount: 1,
      waves: 1,
      waveRows: 2,
      live: 1,
      violations: 1,
    });
  });
});
