import { describe, it, expect } from "vitest";
import { hasRegistryMirror } from "./testing/mirror";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRegistry, newFileTemplate, saveEntry, readEntryFile } from "./registry-store.js";
import { loadGoverning } from "./agent/governing.js";
import { loadPersonaGuideline } from "./agent/persona-guideline.js";
import { loadBusinessCaseGuideline } from "./agent/business-case-guideline.js";
import { loadAnalystGuideline } from "./agent/analyst-guideline.js";

describe.skipIf(!hasRegistryMirror)("contracts as a first-class, file-managed governance type", () => {
  it("listRegistry surfaces the bundled contracts", async () => {
    const { contracts } = await listRegistry();
    const names = contracts.map((c) => c.name);
    for (const expected of ["analyst", "persona", "business-case", "requirements", "intake"]) {
      expect(names).toContain(expected);
    }
    expect(contracts.every((c) => c.type === "contract" && c.bundle === false)).toBe(true);
  });

  it("readEntryFile reads a contract from the contracts/ dir", async () => {
    const md = await readEntryFile("contract", "persona");
    expect(md).toBeDefined();
    expect(md!).toMatch(/never rank, compare, or single out individuals/i);
  });

  it("loadGoverning('contract', …) resolves the bundled contract", async () => {
    const md = await loadGoverning("contract", "business-case");
    expect(md).toMatch(/never invent a value figure/i);
  });

  it("templates a new contract", () => {
    expect(newFileTemplate("contract", "my-agent", "my-agent.md")).toMatch(/OPERATING CONTRACT/);
    expect(newFileTemplate("contract", "my-agent", "my-agent.md")).toMatch(/name: my-agent/);
  });

  it("saves a contract to contracts/<name>.md (not playbooks/)", async () => {
    const base = mkdtempSync(join(tmpdir(), "contract-"));
    const r = await saveEntry(
      { type: "contract", name: "demo-contract", bundle: false, files: [{ path: "demo-contract.md", content: "=== OPERATING CONTRACT ===\n- draft only\n" }] },
      { baseDir: base },
    );
    expect(r.paths).toEqual(["contracts/demo-contract.md"]);
    expect(await readFile(join(base, "contracts/demo-contract.md"), "utf8")).toMatch(/draft only/);
  });
});

describe.skipIf(!hasRegistryMirror)("guidelines compose their file-managed contract", () => {
  it("persona guideline exposes and composes the contract", async () => {
    const g = await loadPersonaGuideline();
    expect(g.contract).toMatch(/OPERATING CONTRACT/);
  });
  it("business-case guideline exposes the contract", async () => {
    const g = await loadBusinessCaseGuideline();
    expect(g.contract).toMatch(/never invent a value figure/i);
  });
  it("analyst guideline exposes the contract", async () => {
    const g = await loadAnalystGuideline();
    expect(g.contract).toMatch(/ranks or compares individual people/i);
  });
});
