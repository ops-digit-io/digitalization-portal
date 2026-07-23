import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";
import { loadPlaybook, loadSkill } from "./skills.js";
import { simulateValueTool } from "./tools/simulate-value.js";

describe("parseFrontmatter", () => {
  it("reads key: value and list syntax", () => {
    const { meta, body } = parseFrontmatter(
      `---\nname: portfolio-analysis\ndescription: "Summarise the portfolio"\ncapabilities: [view_board, draft]\n---\nGuidance body here.`,
    );
    expect(meta.name).toBe("portfolio-analysis");
    expect(meta.description).toBe("Summarise the portfolio");
    expect(meta.capabilities).toEqual(["view_board", "draft"]);
    expect(body).toBe("Guidance body here.");
  });

  it("returns the whole doc as body when there is no frontmatter, never throws", () => {
    const { meta, body } = parseFrontmatter("# Just markdown\n\nno frontmatter");
    expect(meta).toEqual({});
    expect(body).toContain("Just markdown");
    expect(() => parseFrontmatter("")).not.toThrow();
  });
});

describe("loadSkill / loadPlaybook", () => {
  it("loads a skill's typed metadata and body", () => {
    const skill = loadSkill(
      `---\nname: duplicate-detection\ndescription: Find likely duplicates\ncapabilities: [view_all]\ntools: [portfolio-query]\n---\nHow to detect duplicates...`,
    );
    expect(skill.name).toBe("duplicate-detection");
    expect(skill.capabilities).toEqual(["view_all"]);
    expect(skill.tools).toEqual(["portfolio-query"]);
    expect(skill.body).toContain("How to detect");
  });

  it("loads a playbook with checkpoints", () => {
    const pb = loadPlaybook(
      `---\nname: s1-intake\ndescription: Conversational intake\nskills: [intake-conversation, demand-classification]\ncheckpoints: [confirm-demand, confirm-classification]\n---\nSteps...`,
    );
    expect(pb.name).toBe("s1-intake");
    expect(pb.skills).toHaveLength(2);
    expect(pb.checkpoints).toEqual(["confirm-demand", "confirm-classification"]);
  });

  it("falls back to a default name for an unnamed skill", () => {
    expect(loadSkill("no frontmatter", "fallback").name).toBe("fallback");
  });
});

describe("simulate-value worked example (additive tool)", () => {
  async function runSim() {
    return simulateValueTool.run(
      {
        baseAnnualGross: 180000,
        assumptions: [
          { name: "proportional rework reduction", sensitivity: 0.4, tested: false },
          { name: "loaded rate", sensitivity: 0.05, tested: true },
        ],
      },
      { session: { user: "d@example.com", roles: ["requester"], scopes: [] } },
    );
  }

  it("never yields a committed figure", async () => {
    const out = await runSim();
    expect(out.confidence).toBe("indicative");
  });

  it("produces an ordered downside band and a draft section", async () => {
    const out = await runSim();
    expect(out.p10).toBeLessThan(out.p90);
    expect(out.p90).toBe(180000);
    expect(out.drivers[0]?.tested).toBe(false); // untested driver ranked first
    expect(out.draftSection).toContain("## Simulation");
    expect(out.draftSection).toContain("Review before merging");
  });
});
