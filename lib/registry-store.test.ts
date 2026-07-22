import { describe, expect, it } from "vitest";
import { listRegistry, newEntryTemplate, proposeChange, readEntry } from "./registry-store.js";

describe("registry store — read (live skills/playbooks)", () => {
  it("lists the shipped skills and playbooks with parsed metadata", async () => {
    const { skills, playbooks } = await listRegistry();
    expect(skills.length).toBeGreaterThan(0);
    expect(playbooks.length).toBeGreaterThan(0);
    const poc = skills.find((s) => s.name === "poc-builder");
    expect(poc?.description).toBeTruthy();
    expect(poc?.tools).toContain("start-poc");
  });

  it("reads a specific entry's raw markdown", async () => {
    const md = await readEntry("playbook", "poc-build");
    expect(md).toMatch(/checkpoints:/);
    expect(await readEntry("skill", "does-not-exist")).toBeUndefined();
  });

  it("does not list README files", async () => {
    const { skills } = await listRegistry();
    expect(skills.some((s) => /readme/i.test(s.name))).toBe(false);
  });
});

describe("registry store — templates + propose", () => {
  it("templates carry frontmatter and the draft-only guarantee", () => {
    expect(newEntryTemplate("skill", "x")).toMatch(/never pass a gate/);
    expect(newEntryTemplate("playbook", "y")).toMatch(/checkpoint/);
  });

  it("proposeChange opens a PR (local workspace) and never merges", async () => {
    const r = await proposeChange({
      type: "skill",
      name: "test-skill",
      content: newEntryTemplate("skill", "test-skill"),
      message: "add test skill",
    });
    expect(r.host).toBe("local");
    expect(r.path).toBe("skills/test-skill.md");
    expect(r.pullRequest.number).toBeGreaterThan(0);
    expect(r.pullRequest.base).toBe("main");
  });
});
