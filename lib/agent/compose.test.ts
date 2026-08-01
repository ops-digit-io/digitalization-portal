/**
 * The composition engine. The three properties that matter are the failure ones:
 * a missing skill is REPORTED (never silently dropped), a cycle terminates, and
 * resolution is deterministic — the same library composes the same prompt twice.
 *
 * Governance is read from disk through `loadGoverning`, so these tests stub that
 * module and drive the resolver against a synthetic library.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const library = new Map<string, string>();

vi.mock("./governing.js", async () => {
  const actual = await vi.importActual<typeof import("./governing.js")>("./governing.js");
  return {
    ...actual,
    loadGoverning: async (type: string, name: string) => library.get(`${type}:${name}`) ?? "",
  };
});

const { resolveGovernance, composeSystemPrompt, governedBy } = await import("./compose.js");

const playbook = (name: string, skills: string[], body = "do the thing") =>
  `---\nname: ${name}\nskills: [${skills.join(", ")}]\n---\n\n${body}`;
const skill = (name: string, body: string, skills: string[] = []) =>
  `---\nname: ${name}\n${skills.length ? `skills: [${skills.join(", ")}]\n` : ""}---\n\n${body}`;

beforeEach(() => library.clear());

describe("resolving a playbook's skills", () => {
  it("loads the playbook and the skills it names, in declaration order", async () => {
    library.set("playbook:p", playbook("p", ["alpha", "beta"]));
    library.set("skill:alpha", skill("alpha", "A body"));
    library.set("skill:beta", skill("beta", "B body"));

    const g = await resolveGovernance("p");
    expect(g.playbookFound).toBe(true);
    expect(g.skills.map((s) => s.name)).toEqual(["alpha", "beta"]);
    expect(g.missing).toEqual([]);
    expect(g.playbookBody).toBe("do the thing"); // frontmatter stripped
  });

  it("a SKILL can call skills of its own — that is what makes it reusable", async () => {
    library.set("playbook:p", playbook("p", ["method"]));
    library.set("skill:method", skill("method", "M", ["evidence-standards"]));
    library.set("skill:evidence-standards", skill("evidence-standards", "E"));

    const g = await resolveGovernance("p");
    expect(g.skills.map((s) => s.name)).toEqual(["method", "evidence-standards"]);
    // The chain is kept, so a reader can see WHY a skill is in the prompt.
    expect(g.skills[1]!.via).toEqual(["method"]);
  });

  it("emits a shared skill once, at its first mention", async () => {
    library.set("playbook:p", playbook("p", ["one", "two"]));
    library.set("skill:one", skill("one", "1", ["shared"]));
    library.set("skill:two", skill("two", "2", ["shared"]));
    library.set("skill:shared", skill("shared", "S"));

    const g = await resolveGovernance("p");
    expect(g.skills.map((s) => s.name)).toEqual(["one", "shared", "two"]);
  });

  it("is deterministic — the same library composes the same prompt twice", async () => {
    library.set("playbook:p", playbook("p", ["a", "b"]));
    library.set("skill:a", skill("a", "A", ["c"]));
    library.set("skill:b", skill("b", "B"));
    library.set("skill:c", skill("c", "C"));

    const first = await resolveGovernance("p");
    const second = await resolveGovernance("p");
    expect(composeSystemPrompt("R", first)).toBe(composeSystemPrompt("R", second));
  });
});

describe("failure modes", () => {
  it("REPORTS a missing skill rather than skipping it quietly", async () => {
    library.set("playbook:p", playbook("p", ["present", "absent"]));
    library.set("skill:present", skill("present", "P"));

    const g = await resolveGovernance("p");
    expect(g.skills.map((s) => s.name)).toEqual(["present"]);
    expect(g.missing).toEqual(["absent"]);
    // …and the agent is TOLD, because a silent half-governed run still looks governed.
    expect(composeSystemPrompt("R", g)).toContain("MISSING GOVERNANCE");
    expect(composeSystemPrompt("R", g)).toContain("absent");
    expect(governedBy(g).healthy).toBe(false);
  });

  it("terminates on a cycle and records the chain that closed it", async () => {
    library.set("playbook:p", playbook("p", ["x"]));
    library.set("skill:x", skill("x", "X", ["y"]));
    library.set("skill:y", skill("y", "Y", ["x"]));

    const g = await resolveGovernance("p");
    expect(g.skills.map((s) => s.name)).toEqual(["x", "y"]);
    expect(g.cycles).toEqual([["x", "y", "x"]]);
    expect(governedBy(g).healthy).toBe(false);
  });

  it("a missing playbook is a stated fact, not an empty prompt", async () => {
    const g = await resolveGovernance("nope");
    expect(g.playbookFound).toBe(false);
    expect(composeSystemPrompt("R", g)).toContain("playbook unavailable");
    expect(governedBy(g).healthy).toBe(false);
  });

  it("a missing contract degrades to a refusal note, not silence", async () => {
    library.set("playbook:p", playbook("p", []));
    const g = await resolveGovernance("p", { contract: "ethics" });
    expect(g.contractFound).toBe(false);
    expect(composeSystemPrompt("R", g)).toContain("contract unavailable");
  });
});

describe("the composed prompt", () => {
  beforeEach(() => {
    library.set("playbook:p", playbook("p", ["m"], "PLAYBOOK BODY"));
    library.set("skill:m", skill("m", "SKILL BODY"));
    library.set("contract:c", "---\nname: c\n---\n\n=== OPERATING CONTRACT ===\nCONTRACT BODY");
  });

  it("puts the contract last — the last thing in a system prompt weighs most", async () => {
    const out = composeSystemPrompt("You are the Analyst.", await resolveGovernance("p", { contract: "c" }));
    expect(out.indexOf("PLAYBOOK BODY")).toBeLessThan(out.indexOf("SKILL BODY"));
    expect(out.indexOf("SKILL BODY")).toBeLessThan(out.indexOf("CONTRACT BODY"));
    expect(out.startsWith("You are the Analyst.")).toBe(true);
  });

  it("reports what governs a run, for a route or a UI to show", async () => {
    const g = await resolveGovernance("p", { contract: "c" });
    expect(governedBy(g)).toEqual({ playbook: "p", skills: ["m"], contract: "c", missing: [], healthy: true });
  });

  it("accepts caller-supplied extra skills alongside the playbook's own", async () => {
    library.set("skill:extra", skill("extra", "X"));
    const g = await resolveGovernance("p", { extraSkills: ["extra"] });
    expect(g.skills.map((s) => s.name)).toEqual(["m", "extra"]);
  });
});
