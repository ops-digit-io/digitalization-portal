import { describe, it, expect } from "vitest";
import {
  buildRequestorProfile, buildCohortPatterns, listRequestorDirectory,
  groupByRequester, normalizeRequester, type RequestorDemandRecord,
} from "./persona.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "./demand.js";

interface RecOver {
  requester: string;
  id?: string;
  title?: string;
  createdOn?: string;
  domain?: string;
  plant?: string;
  lane?: string;
  stage?: string;
  status?: string;
  answers?: Partial<DemandAnswers>;
}

function rec(over: RecOver): RequestorDemandRecord {
  const answers: DemandAnswers = { ...EMPTY_ANSWERS, ...(over.answers ?? {}) };
  return {
    id: over.id ?? "UC-2026-0001",
    title: over.title ?? (answers.title || "T"),
    requester: over.requester,
    ...(over.createdOn ? { createdOn: over.createdOn } : {}),
    ...(over.domain ? { domain: over.domain } : {}),
    ...(over.plant ? { plant: over.plant } : {}),
    ...(over.lane ? { lane: over.lane } : {}),
    ...(over.stage ? { stage: over.stage } : {}),
    ...(over.status ? { status: over.status } : {}),
    answers,
  };
}

const alice = [
  rec({ id: "UC-1", requester: "alice@ex.com", domain: "quality", plant: "DE-ALD", stage: "S2", createdOn: "2026-01-01",
    answers: { title: "Predict defects", problem: "defects reach the customer from the coating line", currentPain: "we scrap 40 parts", desiredOutcome: "predict a defect trend early", affectedProcess: "coating line inspection", frequencyScale: "weekly" } }),
  rec({ id: "UC-2", requester: "Alice@ex.com", domain: "quality", plant: "DE-ALD", stage: "S1", createdOn: "2026-02-01",
    answers: { title: "Defect dashboard", problem: "no visibility of defects on the coating line", currentPain: "manual counting", desiredOutcome: "a dashboard of defect trends", affectedProcess: "coating line inspection" } }),
  rec({ id: "UC-3", requester: "alice@ex.com", domain: "maintenance", plant: "SK-PUC", stage: "S1", createdOn: "2026-03-01",
    answers: { title: "Pump monitoring", problem: "pumps fail without warning", currentPain: "downtime", desiredOutcome: "sensor telemetry for remote monitoring", affectedProcess: "pump maintenance" } }),
];

describe("buildRequestorProfile", () => {
  const p = buildRequestorProfile(alice);

  it("aggregates role & domain focus with shares", () => {
    expect(p.requester).toBe("alice@ex.com");
    expect(p.demandCount).toBe(3);
    expect(p.domains[0]).toMatchObject({ key: "quality", count: 2 });
    expect(p.domains[0]!.share).toBeCloseTo(2 / 3);
    expect(p.plants.map((s) => s.key)).toContain("DE-ALD");
  });

  it("reads solution-archetype needs across the demands", () => {
    const keys = p.archetypes.map((a) => a.key);
    expect(keys).toContain("Prediction / anomaly detection");
    expect(keys.some((k) => /Descriptive analytics|IoT/.test(k))).toBe(true);
  });

  it("surfaces recurring workflow themes and named processes", () => {
    expect(p.themes).toContain("defects");
    expect(p.workflows).toContain("coating line inspection");
  });

  it("reports maturity as descriptive facts, never a score", () => {
    const quant = p.maturity.find((m) => m.label === "Quantifies impact")!;
    expect(quant.detail).toMatch(/\d+ of 3/);
    // No numeric score field anywhere on the profile.
    expect(JSON.stringify(p)).not.toMatch(/"score"/i);
  });

  it("tracks first/last seen and lists demands newest-first", () => {
    expect(p.firstSeen).toBe("2026-01-01");
    expect(p.lastSeen).toBe("2026-03-01");
    expect(p.demands[0]!.createdOn).toBe("2026-03-01");
  });

  it("is deterministic", () => {
    expect(buildRequestorProfile(alice)).toEqual(p);
  });
});

describe("grouping & directory", () => {
  const bob = rec({ id: "UC-9", requester: "bob@ex.com", domain: "finance", answers: { title: "Close automation", problem: "manual month-end close", desiredOutcome: "automate reconciliation workflow" } });
  const all = [...alice, bob];

  it("groups requesters case-insensitively", () => {
    const groups = groupByRequester(all);
    expect(groups.get("alice@ex.com")!.length).toBe(3); // Alice@ex.com folded in
    expect(groups.size).toBe(2);
  });

  it("lists the directory alphabetically — never by demand volume (no leaderboard)", () => {
    const dir = listRequestorDirectory(all);
    expect(dir.map((d) => d.requester)).toEqual(["alice@ex.com", "bob@ex.com"]);
    // Alice has more demands but must not be forced to the top by volume.
    expect(dir[0]!.requester).toBe("alice@ex.com"); // alphabetical, not by count
  });

  it("normalizeRequester trims and lowercases", () => {
    expect(normalizeRequester("  Alice@EX.com ")).toBe("alice@ex.com");
  });
});

describe("buildCohortPatterns (aggregate only)", () => {
  const records = [
    ...alice, // 2 quality (alice), 1 maintenance (alice)
    rec({ id: "UC-10", requester: "carol@ex.com", domain: "quality", answers: { title: "Vision check", problem: "inspect parts with a camera for defects", desiredOutcome: "detect defects from images" } }),
    rec({ id: "UC-11", requester: "dan@ex.com", domain: "quality", answers: { title: "Quality report", problem: "no defect report", desiredOutcome: "a dashboard of defects" } }),
  ];

  it("reports a cohort only when it has ≥2 distinct requestors (privacy floor)", () => {
    const cohorts = buildCohortPatterns(records, "domain");
    const quality = cohorts.find((c) => c.key === "quality")!;
    expect(quality).toBeDefined();
    expect(quality.requestorCount).toBe(3); // alice, carol, dan
    // maintenance has only alice → dropped, never a single-person "cohort".
    expect(cohorts.find((c) => c.key === "maintenance")).toBeUndefined();
  });

  it("shows aggregate archetype needs for the cohort and names no individual", () => {
    const cohorts = buildCohortPatterns(records, "domain");
    const quality = cohorts.find((c) => c.key === "quality")!;
    expect(quality.topArchetypes.length).toBeGreaterThan(0);
    const blob = JSON.stringify(cohorts);
    for (const name of ["alice", "carol", "dan"]) expect(blob.toLowerCase()).not.toContain(name);
  });

  it("is deterministic", () => {
    expect(buildCohortPatterns(records, "domain")).toEqual(buildCohortPatterns(records, "domain"));
  });
});
