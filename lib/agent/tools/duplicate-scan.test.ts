import { describe, it, expect } from "vitest";
import { makeDuplicateScanTool } from "./duplicate-scan.js";
import { ToolRegistry } from "../tools.js";
import { DEMO_SESSION } from "../../seed.js";
import type { RegistryRow } from "../../registry.js";

const rows: RegistryRow[] = [
  { id: "UC-1", title: "Scrap attribution at shift granularity" },
  { id: "UC-2", title: "Shift-level scrap attribution reporting" },
  { id: "UC-3", title: "Tender preparation copilot" },
];

describe("duplicate-scan tool", () => {
  it("registers with a non-forbidden capability (view_board)", () => {
    const tool = makeDuplicateScanTool(rows);
    expect(tool.capability).toBe("view_board");
    expect(() => new ToolRegistry().register(tool)).not.toThrow();
  });

  it("returns the near-duplicate pair", async () => {
    const out = await makeDuplicateScanTool(rows).run({ threshold: 0.3 }, { session: DEMO_SESSION });
    expect(out.pairs.length).toBeGreaterThanOrEqual(1);
    expect(new Set([out.pairs[0]!.a.id, out.pairs[0]!.b.id])).toEqual(new Set(["UC-1", "UC-2"]));
  });

  it("returns no pairs on a distinct funnel", async () => {
    const out = await makeDuplicateScanTool([rows[2]!]).run({}, { session: DEMO_SESSION });
    expect(out.pairs).toEqual([]);
  });
});
