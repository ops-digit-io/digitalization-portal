import { describe, expect, it } from "vitest";
import { assembleBoard } from "./board.js";
import { boardVisibility, canSeeRestricted } from "./visibility.js";
import type { RegistryRow } from "./registry.js";
import type { Session } from "./rbac.js";

const rows: RegistryRow[] = [
  { id: "UC-1", title: "Scrap attribution", stage: "S4", lane: "transform", plant: "DE-ALD", domain: "quality", heat: "medium", sponsor: "s@example.com", since: "2026-04-02" },
  { id: "UC-2", title: "Tender copilot", stage: "S3", lane: "data_ai", plant: "ALL", domain: "procurement", heat: "high", since: "2026-04-11" },
  { id: "UC-3", title: "M&A workflow", stage: "S2", lane: "innovation", plant: "DE-ALD", confidential: true, since: "2026-05-01" },
  { id: "UC-4", title: "Broken record", lane: "transform", plant: "SK-PUC", needsAttention: true, since: "2026-05-05" },
];

const requester: Session = { user: "r@example.com", roles: ["requester"], scopes: [] };
const forum: Session = { user: "f@example.com", roles: ["portfolio_forum"], scopes: [] };
const nobody: Session = { user: "g@example.com", roles: [], scopes: [] };
const NOW = "2026-05-19T00:00:00Z";

describe("assembleBoard", () => {
  it("columns cards by stage and computes days-in-stage", () => {
    const board = assembleBoard(rows, forum, NOW);
    expect(board.columns.S4.map((c) => c.id)).toEqual(["UC-1"]);
    expect(board.columns.S3.map((c) => c.id)).toEqual(["UC-2"]);
    // 2026-04-02 → 2026-05-19 is 47 days.
    expect(board.columns.S4[0]?.daysInStage).toBe(47);
  });

  it("hides confidential use cases from non-view_all sessions", () => {
    const asRequester = assembleBoard(rows, requester, NOW);
    const ids = Object.values(asRequester.columns).flat().map((c) => c.id);
    expect(ids).not.toContain("UC-3");
  });

  it("shows confidential use cases to view_all sessions", () => {
    const asForum = assembleBoard(rows, forum, NOW);
    expect(asForum.columns.S2.map((c) => c.id)).toContain("UC-3");
  });

  it("never places restricted fields on a card", () => {
    const board = assembleBoard(rows, forum, NOW);
    const card = board.columns.S4[0] as unknown as Record<string, unknown>;
    expect(card.sponsor).toBeUndefined();
    expect(card.valueProjected).toBeUndefined();
  });

  it("carries the derived next-gate readiness onto the card", () => {
    const withReadiness: RegistryRow[] = [
      { id: "UC-R", title: "ready case", stage: "S3", targetGate: "G3", nextGateReady: true, since: "2026-05-01" },
      { id: "UC-N", title: "not ready", stage: "S3", targetGate: "G3", since: "2026-05-01" },
    ];
    const board = assembleBoard(withReadiness, forum, NOW);
    const ready = board.columns.S3.find((c) => c.id === "UC-R");
    const notReady = board.columns.S3.find((c) => c.id === "UC-N");
    expect(ready?.nextGateReady).toBe(true);
    expect(ready?.targetGate).toBe("G3");
    expect(notReady?.nextGateReady).toBeUndefined();
  });

  it("surfaces needs-attention use cases separately, even with no stage", () => {
    const board = assembleBoard(rows, forum, NOW);
    expect(board.needsAttention.map((c) => c.id)).toContain("UC-4");
  });

  it("returns an empty board for a non-member", () => {
    const board = assembleBoard(rows, nobody, NOW);
    expect(Object.values(board.columns).flat()).toHaveLength(0);
  });

  it("applies filters (plant)", () => {
    const board = assembleBoard(rows, forum, NOW, { plant: "DE-ALD" });
    const ids = Object.values(board.columns).flat().map((c) => c.id);
    expect(new Set(ids)).toEqual(new Set(["UC-1", "UC-3"]));
  });
});

describe("visibility", () => {
  it("restricted content is visible to view_all and to named individuals only", () => {
    const row = rows[0]!;
    expect(canSeeRestricted(forum, row)).toBe(true); // view_all
    expect(canSeeRestricted(requester, row)).toBe(false);
    expect(canSeeRestricted(requester, row, { sponsor: "r@example.com" })).toBe(true); // named
  });

  it("confidential board rows are hidden to non-view_all", () => {
    expect(boardVisibility(requester, rows[2]!)).toBe("hidden");
    expect(boardVisibility(forum, rows[2]!)).toBe("shown");
  });
});
