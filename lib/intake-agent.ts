/**
 * The intake conversation agent (governed by the playbook `s1-intake`).
 *
 * This is the deterministic implementation of the intake agent's guideline — the
 * offline agent, and the on-script fallback behind any live model. The PLAYBOOK is
 * the behavioural spec; this module encodes it: how the agent reads each kind of
 * chat input and how it responds. It does more than march through questions —
 * it handles "go back", "why do you ask?", skips, thin answers (nudge once), and
 * corrections, all from what the requester types.
 *
 * When a model is configured, the same playbook is loaded into the agent's system
 * prompt (`lib/agent/intake-guideline.ts`), so the live agent behaves the same way
 * by instruction rather than by this code. Either path hands answers to the
 * deterministic `buildDemand`, so the demand page is identical. This agent writes
 * no state and passes no gate — it only elicits.
 */

import { INTAKE_FIELDS, EMPTY_ANSWERS, type DemandAnswers, type DemandField } from "./demand.js";

export interface IntakeState {
  answers: DemandAnswers;
  /** Index of the question currently awaiting an answer. */
  step: number;
  /** True once every question has been asked — the point the demand is shown. */
  done: boolean;
  /** Field keys already nudged once, so we nudge at most once per field. */
  nudged: string[];
}

export interface ChatMessage {
  role: "assistant" | "user";
  text: string;
}

/** What the requester's message means — the agent branches on this. */
export type Intent = "answer" | "skip" | "back" | "meta" | "empty";

const INTRO =
  "Hi — I'll help you turn this into a demand. Just describe things in your own words and I'll ask a few short questions. You can say \"skip\" for anything optional, \"back\" to change a previous answer, or ask why I need something.";

const OUTRO =
  "Thanks — that's everything I need. I've written the demand page from what you told me; it's below. Have a read, and save it when it looks right.";

// Index-based (not random) so a given step always gets the same acknowledgement.
const ACKS = ["Got it.", "Thanks.", "Understood.", "Noted.", "Makes sense.", "Okay.", "Right."];
function ack(step: number): string {
  return ACKS[step % ACKS.length]!;
}

/** The assistant's phrasing for a field's question, with an optional-skip hint. */
function ask(field: DemandField): string {
  return field.required ? field.question : `${field.question} (optional — say "skip" to pass)`;
}
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Classify a message as a command or an answer. Commands must be the WHOLE message
 * (anchored) so a real answer that merely contains "back" or "why" is not hijacked.
 */
export function detectIntent(text: string): Intent {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (t === "") return "empty";
  if (/^(back|go back|previous|prev|undo|last one|change (that|the last one))$/.test(t)) return "back";
  if (/^(skip|n\/?a|none|pass|skip it|no thanks)$/.test(t)) return "skip";
  if (/^(why|help|\?|huh|explain|what do you mean|what does that mean|why do you ask|why are you asking|like what|for example|example|meaning)$/.test(t)) return "meta";
  return "answer";
}

/** Begin a conversation: greeting plus the first question. */
export function startIntake(): { state: IntakeState; messages: ChatMessage[] } {
  const first = INTAKE_FIELDS[0]!;
  return {
    state: { answers: { ...EMPTY_ANSWERS }, step: 0, done: false, nudged: [] },
    messages: [
      { role: "assistant", text: INTRO },
      { role: "assistant", text: ask(first) },
    ],
  };
}

/** A thin required answer is one worth pressing on once (short, no number, not yet nudged). */
function isThin(field: DemandField, text: string, nudged: string[]): boolean {
  return field.required && field.section !== null && text.length < 15 && !/\d/.test(text) && !nudged.includes(field.key);
}

/**
 * Read the requester's message and produce the agent's reply, per the playbook:
 *
 *   - back  → return to the previous question so they can revise it.
 *   - meta  → explain what the question is for (its intent), then re-ask.
 *   - skip  → optional advances; required is re-asked (not skippable).
 *   - thin  → nudge once for a little more on a required field, then accept.
 *   - answer→ capture verbatim, acknowledge, ask the next.
 *
 * Deterministic: the same state + message always yields the same result.
 */
export function submitAnswer(state: IntakeState, userText: string): { state: IntakeState; messages: ChatMessage[] } {
  if (state.done) return { state, messages: [] };

  const field = INTAKE_FIELDS[state.step]!;
  const intent = detectIntent(userText);

  if (intent === "back") {
    if (state.step === 0) {
      return { state, messages: [{ role: "assistant", text: `We're at the first question — nothing before it. ${ask(field)}` }] };
    }
    const prevStep = state.step - 1;
    const prev = INTAKE_FIELDS[prevStep]!;
    const had = state.answers[prev.key];
    return {
      state: { ...state, step: prevStep },
      messages: [{ role: "assistant", text: `Sure — let's revisit that. ${prev.question}${had ? ` (you had: "${had}")` : ""}` }],
    };
  }

  if (intent === "meta") {
    return { state, messages: [{ role: "assistant", text: `${field.hint} ${ask(field)}` }] };
  }

  const skip = intent === "skip" || intent === "empty";

  if (field.required && skip) {
    return { state, messages: [{ role: "assistant", text: `I do need this one to write the demand — ${lower(field.question)}` }] };
  }

  const text = userText.trim();

  if (isThin(field, text, state.nudged)) {
    return {
      state: { ...state, answers: { ...state.answers, [field.key]: text }, nudged: [...state.nudged, field.key] },
      messages: [{ role: "assistant", text: `Thanks — can you say a bit more? ${field.hint}` }],
    };
  }

  const answers = { ...state.answers };
  if (!skip) {
    // If we nudged, the prior partial is kept — append the elaboration rather than lose it.
    const prior = state.nudged.includes(field.key) ? (state.answers[field.key] ?? "") : "";
    answers[field.key] = prior && prior !== text && !text.includes(prior) ? `${prior} ${text}`.trim() : text;
  }

  const nextStep = state.step + 1;
  if (nextStep >= INTAKE_FIELDS.length) {
    return { state: { ...state, answers, step: nextStep, done: true }, messages: [{ role: "assistant", text: OUTRO }] };
  }
  const next = INTAKE_FIELDS[nextStep]!;
  return {
    state: { ...state, answers, step: nextStep, done: false },
    messages: [{ role: "assistant", text: `${ack(state.step)} ${ask(next)}` }],
  };
}
