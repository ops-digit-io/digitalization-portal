import { describe, expect, it } from "vitest";
import { startIntake, submitAnswer, type IntakeState } from "./intake-agent.js";
import { INTAKE_FIELDS } from "./demand.js";

/** Drive a whole conversation from a map of field-key → answer. */
function runConversation(answers: Partial<Record<string, string>>): { state: IntakeState; asked: number } {
  let { state } = startIntake();
  let asked = 1; // first question asked by startIntake
  while (!state.done) {
    const field = INTAKE_FIELDS[state.step]!;
    const reply = submitAnswer(state, answers[field.key] ?? "");
    // If it re-asked (required + empty), supply a value so the test terminates.
    if (reply.state.step === state.step && !reply.state.done) {
      state = submitAnswer(state, "fallback").state;
    } else {
      state = reply.state;
    }
    asked++;
    if (asked > 50) throw new Error("conversation did not terminate");
  }
  return { state, asked };
}

describe("intake-agent", () => {
  it("opens with an intro and the first question, not done", () => {
    const { state, messages } = startIntake();
    expect(state.step).toBe(0);
    expect(state.done).toBe(false);
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("assistant");
    expect(messages[1]!.text).toContain(INTAKE_FIELDS[0]!.question);
  });

  it("records an answer and advances to the next question", () => {
    const { state } = startIntake();
    const r = submitAnswer(state, "Predictive scrap alerts");
    expect(r.state.step).toBe(1);
    expect(r.state.answers.title).toBe("Predictive scrap alerts");
    expect(r.messages[0]!.text).toContain(INTAKE_FIELDS[1]!.question);
  });

  it("re-asks a required question left blank without advancing", () => {
    const { state } = startIntake(); // step 0 (title) is required
    const r = submitAnswer(state, "   ");
    expect(r.state.step).toBe(0);
    expect(r.state.done).toBe(false);
    expect(r.messages[0]!.text.toLowerCase()).toContain("need");
  });

  it("allows skipping an optional question", () => {
    // Advance to the first optional field.
    let { state } = startIntake();
    while (INTAKE_FIELDS[state.step]!.required) {
      state = submitAnswer(state, "answer").state;
    }
    const optional = INTAKE_FIELDS[state.step]!;
    const r = submitAnswer(state, "skip");
    expect(r.state.step).toBe(state.step + 1);
    expect(r.state.answers[optional.key]).toBe("");
  });

  it("ends the conversation once all questions are answered", () => {
    const { state } = runConversation({
      title: "t", problem: "p", currentPain: "c", desiredOutcome: "d", plant: "DE-ALD",
    });
    expect(state.done).toBe(true);
    expect(state.answers.title).toBe("t");
  });

  it("is deterministic — the same answers yield the same final state", () => {
    const a = runConversation({ title: "t", problem: "p", currentPain: "c", desiredOutcome: "d", plant: "X" });
    const b = runConversation({ title: "t", problem: "p", currentPain: "c", desiredOutcome: "d", plant: "X" });
    expect(a.state.answers).toEqual(b.state.answers);
    expect(a.asked).toBe(b.asked);
  });

  it("never advances past the end or mutates a done state", () => {
    const { state } = runConversation({ title: "t", problem: "p", currentPain: "c", desiredOutcome: "d", plant: "X" });
    const r = submitAnswer(state, "extra");
    expect(r.state).toBe(state);
    expect(r.messages).toHaveLength(0);
  });
});
