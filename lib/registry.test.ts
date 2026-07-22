import { describe, expect, it } from "vitest";
import { parseRegistryIndex } from "./registry.js";

const INDEX = `# Portfolio registry

Last sync: 2026-07-22T09:14:00Z

| ID | Title | Stage | Lane | Status | Plant | Domain | Level | Heat | Sponsor | Value (proj) | Value (real) | Since |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UC-2026-0041 | Scrap attribution | S4 | transform | active | DE-ALD | quality | L2 | medium | s@example.com | 180000 | — | 2026-04-02 |
| UC-2026-0042 | Tender copilot | S3 | data_ai | active | ALL | procurement | L1 | high | s2@example.com | 240000 | — | 2026-04-11 |
| UC-2026-0033 | Cause code harmonization | S8 | transform | active | DE-ALD | quality | L2 | low | s3@example.com | 60000 | 71000 | 2026-01-30 |
`;

describe("parseRegistryIndex", () => {
  const rows = parseRegistryIndex(INDEX);

  it("reads all rows with typed fields", () => {
    expect(rows).toHaveLength(3);
    const uc = rows.find((r) => r.id === "UC-2026-0041");
    expect(uc?.stage).toBe("S4");
    expect(uc?.lane).toBe("transform");
    expect(uc?.level).toBe("L2");
    expect(uc?.heat).toBe("medium");
    expect(uc?.valueProjected).toBe(180000);
    expect(uc?.valueRealized).toBeUndefined(); // "—" → undefined
  });

  it("parses realized value where present", () => {
    expect(rows.find((r) => r.id === "UC-2026-0033")?.valueRealized).toBe(71000);
  });

  it("returns [] for markdown with no table, without throwing", () => {
    expect(parseRegistryIndex("# Empty\n\n_no rows_")).toEqual([]);
    expect(() => parseRegistryIndex("")).not.toThrow();
  });

  it("keeps a row with a bad enum but leaves the field undefined", () => {
    const bad = parseRegistryIndex(
      `| ID | Stage |\n|---|---|\n| UC-1 | S99 |`,
    );
    expect(bad).toHaveLength(1);
    expect(bad[0]?.stage).toBeUndefined();
  });
});
