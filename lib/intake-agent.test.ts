import { describe, expect, it } from "vitest";
import { startIntake, submitAnswer, detectIntent, type IntakeState } from "./intake-agent.js";
import { INTAKE_FIELDS } from "./demand.js";

/** A substantial answer so the thin-answer nudge doesn't fire in flow tests. */
const RICH = "This is a detailed answer with enough substance.";

/** Drive a whole conversation, giving a rich answer to each required question. */
function runConversation(): { state: IntakeState; turns: number } {
  let { state } = startIntake();
  let turns = 0;
  while (!state.done) {
    state = submitAnswer(state, RICH).state;
    if (++turns > 60) throw new Error("did not terminate");
  }
  return { state, turns };
}

describe("detectIntent", () => {
  it("classifies commands only when they are the whole message", () => {
    expect(detectIntent("back")).toBe("back");
    expect(detectIntent("go back")).toBe("back");
    expect(detectIntent("skip")).toBe("skip");
    expect(detectIntent("why?")).toBe("meta");
    expect(detectIntent("")).toBe("empty");
  });
  it("does not hijack a real answer that merely contains a command word", () => {
    expect(detectIntent("the back office process is affected")).toBe("answer");
    expect(detectIntent("why it matters: it stops the line")).toBe("answer");
  });
});

describe("intake-agent", () => {
  it("opens with an intro and the first question, not done", () => {
    const { state, messages } = startIntake();
    expect(state.step).toBe(0);
    expect(state.done).toBe(false);
    expect(state.nudged).toEqual([]);
    expect(messages[1]!.text).toContain(INTAKE_FIELDS[0]!.question);
  });

  it("records an answer and advances", () => {
    const { state } = startIntake();
    const r = submitAnswer(state, "Predictive scrap alerts");
    expect(r.state.step).toBe(1);
    expect(r.state.answers.title).toBe("Predictive scrap alerts");
  });

  it("goes back to the previous question on 'back'", () => {
    let { state } = startIntake();
    state = submitAnswer(state, "A title").state; // now on step 1 (problem)
    const r = submitAnswer(state, "back");
    expect(r.state.step).toBe(0);
    expect(r.messages[0]!.text.toLowerCase()).toContain("revisit");
    expect(r.messages[0]!.text).toContain("A title"); // shows what they had
  });

  it("explains a meta-question and re-asks without advancing", () => {
    const { state } = startIntake();
    const r = submitAnswer(state, "why do you ask");
    expect(r.state.step).toBe(0);
    expect(r.messages[0]!.text).toContain(INTAKE_FIELDS[0]!.hint);
  });

  it("nudges once on a thin required answer, then accepts", () => {
    let { state } = startIntake();
    state = submitAnswer(state, "Scrap").state; // title (not a section field) — advances to problem
    const thin = submitAnswer(state, "bad"); // problem is required + section → thin
    expect(thin.state.step).toBe(state.step); // did not advance
    expect(thin.state.nudged).toContain("problem");
    expect(thin.messages[0]!.text.toLowerCase()).toContain("a bit more");
    const accepted = submitAnswer(thin.state, "more");
    expect(accepted.state.step).toBe(state.step + 1); // advanced now
    expect(accepted.state.answers.problem).toContain("bad"); // kept the first, appended
  });

  it("does not nudge when the answer carries a number", () => {
    let { state } = startIntake();
    state = submitAnswer(state, "Scrap").state;
    const r = submitAnswer(state, "6h/mo"); // short but has a digit
    expect(r.state.step).toBe(state.step + 1); // accepted, no nudge
  });

  it("re-asks a required question left blank; skips an optional one", () => {
    const { state } = startIntake(); // title required
    expect(submitAnswer(state, "").state.step).toBe(0);
    // advance to the first optional field, then skip it
    let s = state;
    while (INTAKE_FIELDS[s.step]!.required) s = submitAnswer(s, RICH).state;
    const optional = INTAKE_FIELDS[s.step]!;
    const r = submitAnswer(s, "skip");
    expect(r.state.step).toBe(s.step + 1);
    expect(r.state.answers[optional.key]).toBe("");
  });

  it("ends after all questions and is deterministic", () => {
    const a = runConversation();
    const b = runConversation();
    expect(a.state.done).toBe(true);
    expect(a.state.answers).toEqual(b.state.answers);
    expect(a.turns).toBe(b.turns);
  });

  it("never mutates a done state", () => {
    const { state } = runConversation();
    const r = submitAnswer(state, "extra");
    expect(r.state).toBe(state);
    expect(r.messages).toHaveLength(0);
  });
});
