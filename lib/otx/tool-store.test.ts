import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { addTool, listManualTools, FILE } from "./tool-store.js";
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
