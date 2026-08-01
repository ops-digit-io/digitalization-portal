import { describe, it, expect } from "vitest";
import { enhanceDemand, enhanceOffline } from "./intake-enhance.js";
import { EMPTY_ANSWERS, type DemandAnswers } from "../demand.js";
import type { ModelProvider, CompletionRequest, ModelResponse } from "./provider.js";

const vague: DemandAnswers = {
  ...EMPTY_ANSWERS,
  title: "scrap issue",
  problem: "too much scrap",
  currentPain: "operators lose real time sorting scrap by hand",
  desiredOutcome: "less scrap",
  plant: "DE-ALD",
};

/** A fake live provider returning a fixed reply, to exercise the JSON path. */
function fakeProvider(reply: string): ModelProvider {
  return {
    name: "anthropic",
    live: true,
    async complete(_req: CompletionRequest): Promise<ModelResponse> {
      return { text: reply, toolCalls: [], content: [{ type: "text", text: reply }], stopReason: "end_turn", truncated: false, usage: { input: 0, output: 0 } };
    },
  };
}

describe("enhanceOffline", () => {
  it("flags weak signal and asks quantifying questions", () => {
    const res = enhanceOffline(vague);
    expect(res.live).toBe(false);
    expect(res.provider).toBe("offline");
    expect(res.playbook).toBe("s1-intake-enhance");
    expect(res.assessment.score).toBe("weak");
    expect(res.openQuestions.length).toBeGreaterThan(0);
    // currentPain has no number → gap flagged.
    const pain = res.fields.find((f) => f.key === "currentPain");
    expect(pain?.gap).toMatch(/number/i);
  });

  it("only produces fields for answers that were given", () => {
    const res = enhanceOffline(vague);
    expect(res.fields.some((f) => f.key === "constraints")).toBe(false); // empty → omitted
    expect(res.fields.some((f) => f.key === "problem")).toBe(true);
  });
});

describe("enhanceDemand (live path)", () => {
  it("parses a JSON reply and proposes sharpened fields", async () => {
    const reply = JSON.stringify({
      fields: {
        problem: "Scrap on line 3 exceeds target during night shifts.",
        desiredOutcome: "Scrap rate held under 2% across all shifts.",
      },
      openQuestions: ["What is the current scrap rate?"],
      assessment: { score: "adequate", summary: "Clear but unquantified." },
    });
    const res = await enhanceDemand(vague, fakeProvider(reply));
    expect(res.live).toBe(true);
    expect(res.provider).toBe("anthropic");
    const problem = res.fields.find((f) => f.key === "problem");
    expect(problem?.enhanced).toMatch(/line 3/);
    expect(problem?.changed).toBe(true);
    expect(res.openQuestions).toContain("What is the current scrap rate?");
    expect(res.assessment.score).toBe("adequate");
  });

  it("does not invent fields the requester never provided", async () => {
    // Model tries to add a constraints field that was empty in the input.
    const reply = JSON.stringify({
      fields: { constraints: "Uses SAP and an MES the model made up." },
      openQuestions: [],
      assessment: { score: "weak", summary: "x" },
    });
    const res = await enhanceDemand(vague, fakeProvider(reply));
    // constraints was empty → never surfaced, even if the model returned it.
    expect(res.fields.some((f) => f.key === "constraints")).toBe(false);
  });

  it("degrades to offline when the model reply is not JSON", async () => {
    const res = await enhanceDemand(vague, fakeProvider("Sorry, I can't do that."));
    expect(res.live).toBe(true); // provider was live…
    expect(res.fields.length).toBeGreaterThan(0); // …but fields came from the offline pass
    const problem = res.fields.find((f) => f.key === "problem");
    expect(problem).toBeTruthy();
  });

  it("uses the offline pass when no live provider is configured", async () => {
    const offline: ModelProvider = {
      name: "offline",
      live: false,
      async complete() { throw new Error("should not be called"); },
    };
    const res = await enhanceDemand(vague, offline);
    expect(res.live).toBe(false);
  });
});
