/**
 * The intake conversation agent (playbook `s1-intake`).
 *
 * A deterministic conversational driver: it walks the fixed intake script one
 * question at a time, the way a chat assistant would, and never shows the whole
 * roadmap. The requester just talks; the agent asks the next thing. When every
 * required answer is in, the conversation ENDS and only then is the demand page
 * rendered (by `buildDemand`, elsewhere).
 *
 * Why a state machine and not a free-running model: the intake's contract is that
 * the SAME answers always produce the SAME demand. Keeping the conversation
 * on-script — fixed questions, fixed order — is what guarantees that. A live model
 * may soften the wording, but it can never change which questions are asked or the
 * artifact they produce. This module is that on-script core; it is pure and
 * unit-tested, and it is the offline agent as well as the fallback behind any live
 * phrasing. It writes no state and passes no gate — it only elicits.
 */

import { INTAKE_FIELDS, EMPTY_ANSWERS, type DemandAnswers, type DemandField } from "./demand.js";

export interface IntakeState {
  answers: DemandAnswers;
  /** Index of the question currently awaiting an answer. */
  step: number;
  /** True once every question has been asked — the point the demand is shown. */
  done: boolean;
}

export interface ChatMessage {
  role: "assistant" | "user";
  text: string;
}

const INTRO =
  "Hi — I'll help you turn this into a demand. Just describe things in your own words and I'll ask a few short questions. When we're done I'll show you the demand page I've written from your answers. You can say \"skip\" for anything optional.";

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

function isSkip(text: string): boolean {
  const t = text.trim();
  return t === "" || /^(skip|n\/?a|none|pass)$/i.test(t);
}

/** Begin a conversation: greeting plus the first question. */
export function startIntake(): { state: IntakeState; messages: ChatMessage[] } {
  const first = INTAKE_FIELDS[0]!;
  return {
    state: { answers: { ...EMPTY_ANSWERS }, step: 0, done: false },
    messages: [
      { role: "assistant", text: INTRO },
      { role: "assistant", text: ask(first) },
    ],
  };
}

/**
 * Record the requester's answer to the current question and produce the agent's
 * reply. A required question left blank is re-asked without advancing; an optional
 * one may be skipped. Returns the new state and the assistant message(s) to append.
 * Deterministic: the same state + input always yields the same result.
 */
export function submitAnswer(state: IntakeState, userText: string): { state: IntakeState; messages: ChatMessage[] } {
  if (state.done) return { state, messages: [] };

  const field = INTAKE_FIELDS[state.step]!;
  const skip = isSkip(userText);

  if (field.required && skip) {
    const lead = field.question.charAt(0).toLowerCase() + field.question.slice(1);
    return { state, messages: [{ role: "assistant", text: `I do need this one to write the demand — ${lead}` }] };
  }

  const answers = { ...state.answers };
  if (!skip) answers[field.key] = userText.trim();

  const nextStep = state.step + 1;
  if (nextStep >= INTAKE_FIELDS.length) {
    return { state: { answers, step: nextStep, done: true }, messages: [{ role: "assistant", text: OUTRO }] };
  }
  const next = INTAKE_FIELDS[nextStep]!;
  return {
    state: { answers, step: nextStep, done: false },
    messages: [{ role: "assistant", text: `${ack(state.step)} ${ask(next)}` }],
  };
}
