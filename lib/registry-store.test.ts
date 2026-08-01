import { describe, expect, it } from "vitest";
import { hasRegistryMirror } from "./testing/mirror";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRegistry, newFileTemplate, saveEntry, readEntryFile, ENTRY_FILE } from "./registry-store.js";

describe.skipIf(!hasRegistryMirror)("registry store — bundles (read)", () => {
  it("reads skill bundles with their file tree", async () => {
    const { skills } = await listRegistry();
    const poc = skills.find((s) => s.name === "poc-builder");
    expect(poc?.bundle).toBe(true);
    expect(poc?.files[0]).toBe(ENTRY_FILE); // entry file first
    expect(poc?.files).toContain("references/artifact-kinds.md");
    expect(poc?.files).toContain("templates/spec-outline.md");
    expect(poc?.tools).toContain("start-poc");
  });

  it("reads a specific file within a bundle, and the entry file by default", async () => {
    const skillMd = await readEntryFile("skill", "portfolio-analysis");
    expect(skillMd).toMatch(/name: portfolio-analysis/);
    const ref = await readEntryFile("skill", "portfolio-analysis", "references/metrics.md");
    expect(ref).toMatch(/Metric definitions/);
    expect(await readEntryFile("skill", "portfolio-analysis", "nope.md")).toBeUndefined();
  });

  it("still reads single-file playbooks", async () => {
    const { playbooks } = await listRegistry();
    const pb = playbooks.find((p) => p.name === "poc-build");
    expect(pb?.bundle).toBe(false);
    expect(pb?.checkpoints).toContain("approve-spec");
  });

  it("does not treat a directory without SKILL.md as a skill", async () => {
    const { skills } = await listRegistry();
    // every listed skill bundle has SKILL.md
    for (const s of skills.filter((x) => x.bundle)) expect(s.files).toContain(ENTRY_FILE);
  });
});

describe("registry store — multi-file save (direct)", () => {
  it("templates a new SKILL.md and a supporting reference", () => {
    expect(newFileTemplate("skill", "x", ENTRY_FILE)).toMatch(/name: x/);
    expect(newFileTemplate("skill", "x", "references/notes.md")).toMatch(/Reference material/);
  });

  it("saves multiple bundle files to the working tree (no PR)", async () => {
    const base = mkdtempSync(join(tmpdir(), "reg-"));
    const r = await saveEntry(
      {
        type: "skill",
        name: "demo-skill",
        bundle: true,
        files: [
          { path: ENTRY_FILE, content: newFileTemplate("skill", "demo-skill", ENTRY_FILE) },
          { path: "references/notes.md", content: "# notes\n" },
        ],
      },
      { baseDir: base },
    );
    expect(r.host).toBe("local");
    expect(r.target).toBe("working tree");
    expect(r.paths).toEqual(["skills/demo-skill/SKILL.md", "skills/demo-skill/references/notes.md"]);
    // Files really landed on disk.
    expect(await readFile(join(base, "skills/demo-skill/SKILL.md"), "utf8")).toMatch(/name: demo-skill/);
    expect(await readFile(join(base, "skills/demo-skill/references/notes.md"), "utf8")).toMatch(/notes/);
  });
});
