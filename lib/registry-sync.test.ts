import { describe, it, expect } from "vitest";
import { listBundledEntries, syncBundledToRegistry } from "./registry-sync.js";

describe("registry sync", () => {
  it("includes the intake playbooks and skills from the bundle", async () => {
    const entries = await listBundledEntries();
    const byName = (t: string, n: string) => entries.find((e) => e.type === t && e.name === n);

    // The playbooks the intake chat + enhancer depend on.
    expect(byName("playbook", "s1-intake")).toBeTruthy();
    expect(byName("playbook", "s1-intake-enhance")).toBeTruthy();

    // The governing skills, as multi-file bundles.
    const conversation = byName("skill", "intake-conversation");
    expect(conversation?.bundle).toBe(true);
    expect(conversation?.files.some((f) => f.path === "SKILL.md")).toBe(true);
    expect(conversation?.files.some((f) => f.path === "references/interview.md")).toBe(true);

    expect(byName("skill", "demand-classification")).toBeTruthy();
  });

  it("carries real content, entry-relative paths (never invents)", async () => {
    const entries = await listBundledEntries();
    for (const e of entries) {
      expect(e.files.length).toBeGreaterThan(0);
      for (const f of e.files) {
        expect(f.path.startsWith("/")).toBe(false); // entry-relative, not absolute
        expect(f.content.trim()).not.toBe("");
      }
    }
  });

  it("offline, the registry is the bundle, so every entry is already present", async () => {
    // With no GitHub App configured, readEntryFile and saveEntry both use the local
    // tree — which is the bundle — so a sync finds everything already there.
    const report = await syncBundledToRegistry();
    expect(report.host).toBe("local");
    expect(report.added).toBe(0);
    expect(report.skipped).toBeGreaterThan(0);
  });
});
