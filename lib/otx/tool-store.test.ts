import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  addTool,
  editTool,
  removeTool,
  decideRisk,
  undecideRisk,
  listManualTools,
  listOverrides,
  listRiskAdjustments,
  FILE,
  OVERRIDES_FILE,
  RISK_FILE,
} from "./tool-store.js";
import { parseTools } from "./toolscape.js";

let dir: string;
const env = { ...process.env };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "otx-tools-"));
  process.env.LANDSCAPE_DATA_DIR = dir;
  // The local path is the one under test; GitHub credentials would take the other.
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_TOKEN;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  process.env = { ...env };
});

describe("tools added by hand in the portal", () => {
  it("reads as empty before anything is added — never throws on a missing file", async () => {
    expect(await listManualTools()).toEqual([]);
  });

  it("records a tool and reads it back through the register's own parser", async () => {
    const res = await addTool({
      tool: "Miro",
      vendor: "Miro",
      capability: "Whiteboarding",
      domain: "engineering",
      scope: "local",
      hosting: "saas",
      lifecycle: "tolerate",
      integration: "isolated",
      businessOwner: "Engineering",
      itOwner: "Corporate IT",
      users: "45",
      criticality: "standard",
      annualCost: "18000",
      notes: "Bought on a team card.",
    });
    expect(res.ok).toBe(true);
    expect(res.tool!.id).toBe("APP-001");

    const back = await listManualTools();
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ id: "APP-001", tool: "Miro", capability: "Whiteboarding", users: 45, annualCost: 18000, lifecycle: "tolerate" });
    // It is markdown in git, in the same shape as the shipped master.
    const md = await readFile(join(dir, FILE), "utf8");
    expect(md).toContain("| ID | Tool | Vendor |");
    expect(parseTools(md)).toEqual(back);
  });

  it("keeps ids clear of the shipped master's", async () => {
    const res = await addTool({ tool: "Miro", capability: "Whiteboarding" }, ["APP-041", "APP-042"]);
    expect(res.tool!.id).toBe("APP-043");
  });

  it("refuses a tool with no name or no capability — the two things a finding needs", async () => {
    expect((await addTool({ capability: "Whiteboarding" })).errors[0]).toContain("name");
    const noCap = await addTool({ tool: "Miro" });
    expect(noCap.ok).toBe(false);
    expect(noCap.errors.join(" ")).toContain("capability");
    expect(await listManualTools()).toEqual([]);
  });

  it("records a half-known tool and carries the warnings with the row", async () => {
    const res = await addTool({ tool: "Some vendor portal", capability: "Procurement" });
    expect(res.ok).toBe(true);
    expect(res.warnings.join(" ")).toContain("shadow IT");
    expect(res.warnings.join(" ")).toContain("unbudgeted");
    const back = await listManualTools();
    expect(back[0]!.needsAttention).toBe(true);
  });

  it("refuses the same tool twice", async () => {
    await addTool({ tool: "Miro", capability: "Whiteboarding" });
    const again = await addTool({ tool: "  miro ", capability: "Whiteboarding" });
    expect(again.ok).toBe(false);
    expect(again.errors[0]).toContain("already recorded");
    expect(await listManualTools()).toHaveLength(1);
  });

  it("cannot break the table with a pipe or a newline in a cell", async () => {
    await addTool({ tool: "Odd | name", capability: "Reporting", notes: "line one\nline two" });
    const rows = await listManualTools();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tool).toBe("Odd / name");
    expect(rows[0]!.notes).toBe("line one line two");
  });

  it("survives a corrupt file by reading what it can, never by throwing", async () => {
    await mkdir(join(dir, "landscape"), { recursive: true });
    await writeFile(join(dir, FILE), "# not a table at all\n\njust prose\n");
    expect(await listManualTools()).toEqual([]);
  });
});

const actor = { by: "me@example.com", date: "2026-08-19" };

describe("editing a tool the portal cannot write at the source", () => {
  it("records a patch keyed by node id, and reads it back", async () => {
    const res = await editTool("APP-001", { annualCost: "1450000" }, actor);
    expect(res.ok).toBe(true);

    const overrides = await listOverrides();
    expect(overrides.get("app-001")!.patch).toEqual({ annualCost: 1450000 });
    expect(overrides.get("app-001")!.by).toBe("me@example.com");
    // Markdown in git, like every other artifact here.
    expect(await readFile(join(dir, OVERRIDES_FILE), "utf8")).toContain("| APP-001 |");
  });

  it("merges a second edit rather than replacing the first", async () => {
    await editTool("APP-001", { annualCost: "1450000" }, actor);
    await editTool("APP-001", { itOwner: "Corporate IT" }, actor);
    const o = (await listOverrides()).get("app-001")!;
    expect(o.patch).toEqual({ annualCost: 1450000, itOwner: "Corporate IT" });
    expect(o.fields.sort()).toEqual(["Annual cost", "IT owner"]);
  });

  it("refuses an edit that names no tool or changes nothing", async () => {
    expect((await editTool("", { annualCost: "1" }, actor)).ok).toBe(false);
    expect((await editTool("APP-001", {}, actor)).errors[0]).toContain("Nothing to change");
    expect((await listOverrides()).size).toBe(0);
  });
});

describe("risk decisions", () => {
  it("records an acceptance with its reason and who made it", async () => {
    const res = await decideRisk({ tool: "APP-009", action: "accept", factor: "island", reason: "Monthly export by design." }, actor);
    expect(res.ok).toBe(true);
    const all = await listRiskAdjustments();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ tool: "APP-009", action: "accept", factor: "island", by: "me@example.com", date: "2026-08-19" });
    expect(await readFile(join(dir, RISK_FILE), "utf8")).toContain("Monthly export by design.");
  });

  it("refuses an acceptance with no reason", async () => {
    const res = await decideRisk({ tool: "APP-009", action: "accept", factor: "island" }, actor);
    expect(res.ok).toBe(false);
    expect(await listRiskAdjustments()).toEqual([]);
  });

  it("replaces an earlier decision about the same factor rather than stacking", async () => {
    await decideRisk({ tool: "APP-009", action: "accept", factor: "island", reason: "first" }, actor);
    await decideRisk({ tool: "APP-009", action: "accept", factor: "island", reason: "second" }, actor);
    const all = await listRiskAdjustments();
    expect(all).toHaveLength(1);
    expect(all[0]!.reason).toBe("second");
  });

  it("takes a decision back, and says when there was none", async () => {
    await decideRisk({ tool: "APP-009", action: "add", factor: "EOL 2027", weight: 20, reason: "Vendor EOL" }, actor);
    expect((await undecideRisk("APP-009", "EOL 2027")).removed).toBe(1);
    expect(await listRiskAdjustments()).toEqual([]);
    expect((await undecideRisk("APP-009", "EOL 2027")).ok).toBe(false);
  });
});

describe("removing a tool the portal added", () => {
  it("takes the row, its edits and its risk decisions with it", async () => {
    const added = await addTool({ tool: "Miro", capability: "Whiteboarding" });
    const id = added.tool!.id;
    await editTool(id, { annualCost: "18000" }, actor);
    await decideRisk({ tool: id, action: "add", factor: "Trial ends 2027", weight: 10, reason: "Pilot licence" }, actor);

    const res = await removeTool(id);
    expect(res.ok).toBe(true);
    expect(res.removed).toEqual({ tool: "Miro", overrides: 1, adjustments: 1 });
    expect(await listManualTools()).toEqual([]);
    expect((await listOverrides()).size).toBe(0);
    expect(await listRiskAdjustments()).toEqual([]);
  });

  it("finds the row by name as well as by id", async () => {
    await addTool({ tool: "Miro", capability: "Whiteboarding" });
    expect((await removeTool("miro")).ok).toBe(true);
    expect(await listManualTools()).toEqual([]);
  });

  it("refuses a tool it did not write — those are retired by a lifecycle decision", async () => {
    const res = await removeTool("APP-999");
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toContain("eliminate");
  });

  it("refuses an empty id", async () => {
    expect((await removeTool("  ")).ok).toBe(false);
  });
});
