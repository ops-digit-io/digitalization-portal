/**
 * Lane packs — the third ring — conform to the framework, score, scaffold and round-trip.
 *
 * The framework (01-framework.md §"Was in ein Lane Pack gehört") names the pack's files
 * and what each must carry: the playbook with its error paths (not just the happy path),
 * the skills/tools/interfaces, recurring tasks with trigger + template, lane metrics, and
 * the agent-brief with scope, authority_level, guardrails, escalation and a named human.
 * These pin the grammar, prove the scaffolds satisfy it, and exercise a create→save→read.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LANE_FILES, LANE_KEYS, LANE_DIRS } from "./lane";
import { scoreSection } from "./scoring";
import { scaffoldLaneFile, scaffoldLane, authorityLevelOf } from "./scaffold";
import { createLane, saveLaneFile, saveLaneDoc, OrgWriteError } from "./authoring";
import { createDepartment } from "./authoring";
import { readLane, listLanes } from "./lane-store";

describe("lane grammar — the framework's pack files", () => {
  it("has exactly the five scored pack files", () => {
    expect([...LANE_KEYS]).toEqual(["playbook", "skills", "tasks", "metrics", "agent-brief"]);
  });

  it("keeps procedures/ and examples/ as optional directories", () => {
    expect([...LANE_DIRS]).toEqual(["procedures", "examples"]);
  });

  it("does not mark any lane file critical (validity belongs to the department's four)", () => {
    expect(LANE_FILES.some((f) => f.critical)).toBe(false);
  });

  it("makes the agent-brief the autonomy contract — authority_level is its heaviest criterion", () => {
    const brief = LANE_FILES.find((f) => f.key === "agent-brief")!;
    const heaviest = [...brief.required].sort((a, b) => b.weight - a.weight)[0]!;
    expect(heaviest.label).toMatch(/authority_level/i);
  });
});

describe("lane scaffolds satisfy their grammar's structure", () => {
  for (const def of LANE_FILES) {
    it(`${def.key}: structural criteria are already met by the skeleton`, () => {
      const s = scoreSection(def, scaffoldLaneFile(def.key, "Demo Lane"));
      const structural = s.required.filter((r) => !r.met && !/owner|table|rows|human/i.test(r.label)).map((r) => r.label);
      expect(structural, `${def.key} scaffold missing: ${structural.join(", ")}`).toEqual([]);
    });
  }

  it("the two anchor files are playbook and agent-brief", () => {
    expect(Object.keys(scaffoldLane("X")).sort()).toEqual(["agent-brief", "playbook"]);
  });
});

describe("authorityLevelOf — unambiguous only", () => {
  it("returns null for the scaffold (all five listed as a hint)", () => {
    expect(authorityLevelOf(scaffoldLaneFile("agent-brief", "X"))).toBeNull();
  });
  it("reads the level when exactly one is named", () => {
    expect(authorityLevelOf("## Authority level\nThis lane runs at `recommend`.")).toBe("recommend");
    expect(authorityLevelOf("execute-with-approval only")).toBe("execute-with-approval");
  });
  it("returns null when several are named", () => {
    expect(authorityLevelOf("between draft and recommend")).toBeNull();
  });
});

describe("lane authoring — local round trip and guards", () => {
  beforeAll(async () => {
    process.env.ORGANIZATION_MIRROR_DIR = await mkdtemp(path.join(os.tmpdir(), "lane-authoring-"));
  });

  it("creates a lane with its two anchor files and reads it back scored", async () => {
    const { slug: dept } = await createDepartment("Lane Test Dept");
    const { slug: lane } = await createLane(dept, "Connectivity Assessment");
    expect(lane).toBe("connectivity-assessment");
    const read = await readLane(dept, lane);
    expect(read).not.toBeNull();
    expect(read!.files.find((f) => f.key === "playbook")!.score.present).toBe(true);
    expect(read!.files.find((f) => f.key === "agent-brief")!.score.present).toBe(true);
    // skills/tasks/metrics not written yet → present in the pack list but scoring 0.
    expect(read!.files.find((f) => f.key === "skills")!.score.present).toBe(false);
    expect(await listLanes(dept)).toHaveLength(1);
  });

  it("saves a lane file and reflects its authority level", async () => {
    const { slug: dept } = await createDepartment("Lane Auth Dept");
    const { slug: lane } = await createLane(dept, "Immediate Rollout");
    const brief = "---\nowner: Lead\n---\n# Brief\n## Scope\ns\n## Authority level\nRuns at `execute-with-approval`.\n## Guardrails\ng\n## Escalation\ne\n";
    await saveLaneFile(dept, lane, "agent-brief", brief);
    const read = await readLane(dept, lane);
    expect(read!.authority).toBe("execute-with-approval");
  });

  it("rejects an unknown lane file key", async () => {
    await expect(saveLaneFile("lane-test-dept", "connectivity-assessment", "nope", "x")).rejects.toBeInstanceOf(OrgWriteError);
  });

  it("writes a procedures/ doc and reads it back", async () => {
    const { slug: dept } = await createDepartment("Lane Doc Dept");
    const { slug: lane } = await createLane(dept, "Rollout");
    await saveLaneDoc(dept, lane, "procedures", "Site Onboarding", "# Site Onboarding\nsteps");
    const read = await readLane(dept, lane);
    const doc = read!.docs.find((d) => d.dir === "procedures" && d.name === "site-onboarding");
    expect(doc).toBeDefined();
    expect(doc!.body).toContain("steps");
  });

  it("rejects an unknown lane directory", async () => {
    await expect(saveLaneDoc("lane-doc-dept", "rollout", "secrets", "x", "y")).rejects.toBeInstanceOf(OrgWriteError);
  });
});

describe("the bundled seeded lane scores well against its grammar", () => {
  it("Operations Digitalization has a connectivity-assessment lane, well-formed", async () => {
    const lanes = await listLanes("operations-digitalization");
    const lane = lanes.find((l) => l.slug === "connectivity-assessment");
    expect(lane).toBeDefined();
    expect(lane!.authority).toBe("recommend");
    expect(lane!.score.corePresent).toBe(LANE_FILES.length);
    expect(lane!.score.score).toBeGreaterThanOrEqual(90);
  });
});
