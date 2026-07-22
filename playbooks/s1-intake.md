---
name: s1-intake
description: Capture a demand as a markdown page in the central intake repo through a fixed, AI-guided conversation with a deterministic result.
skills: [intake-conversation, demand-classification]
checkpoints: [review-demand]
---

# s1-intake

The S1 front door, run as a **chat**. The agent turns a person's problem into a
**demand** — one markdown page in the central `du-demands` repository
(`docs/ARCHITECTURE-intake.md`) — through a short conversation. AI-guided so a
non-technical requester can just talk; **deterministic in its output** so the same
answers always produce the same artifact. No repository is created here — a demand
earns its own repo only at the PoC stage.

The agent is implemented deterministically in `lib/intake-agent.ts` (the offline
agent and the on-script core behind any live phrasing); this playbook is its
protocol. The interview questions, intent, and nudges live in the
`intake-conversation` skill's [interview guide](../skills/intake-conversation/references/interview.md).

## Three tools, one output

The intake offers **three separate tools**, and the requester picks one:

- **Chat** — the AI interview this playbook drives, one question at a time.
- **Form** — a plain form; the requester fills the fields directly.
- **Markdown** — the demand page written as markdown, from the template.

They are different ways in, **not** different outputs. Chat and Form collect
`DemandAnswers`; the Markdown tool is parsed back to `DemandAnswers`
(`parseDemandToAnswers`). All three then render through the **same** `buildDemand`,
so the saved demand page is byte-identical regardless of the tool. This playbook
governs the **Chat** tool; the interview it runs is below.

## Conversational protocol (how the agent must behave)

- **One question per turn.** Ask the next question and wait. Never recite the list
  of upcoming questions or "step N of M" in the chat — the requester is being
  interviewed, not handed a form. The order is fixed (`INTAKE_FIELDS`); the agent
  walks it. (The side view showing the artifact is fine — that is the demand taking
  shape, not a roadmap of questions.)
- **The requester's words.** Keep answers verbatim (tidy grammar only). Do not
  invent detail — an optional question the requester skips stays empty, and the
  renderer fills it with a stable placeholder. An empty section is honest.
- **Required vs optional.** A required question left blank is re-asked, once, in
  plain terms — the conversation does not advance until it is answered. An optional
  question may be skipped ("skip" / empty).
- **AI drafts, humans decide.** Nothing here passes a gate. The agent may *propose*
  a lane; it never *assigns* one.

## The interview (asked one at a time, never listed)

1. In one line, what is the demand?
2. What is the problem you are seeing?
3. How is it handled today, and what does that cost?
4. What would good look like?
5. Which process is affected, and who feels it?  *(optional)*
6. How often does it happen, and at what scale?  *(optional)*
7. Any systems, data, or prior attempts we should know about?  *(optional)*
8. Which plant does this concern?
9. Which domain?  *(optional)*
10. Who is raising it?  *(optional)*

## Steps

1. **Open** (`intake-conversation`). Greet, explain briefly, ask question 1.
2. **Converse.** For each answer, acknowledge and ask the next question, following
   the protocol above, until every question has been asked. The demand view updates
   live alongside.
3. **Render** (deterministic, no model). `buildDemand` renders the page from the
   captured answers; `classifyDemand` proposes the lane/domain. Pure code — the
   artifact is a function of the answers, not of the conversation.
4. **Review + confirm** (human). The demand view shows the page exactly as it will
   be saved, with the proposed lane. This is the single `review-demand` checkpoint —
   the requester built the demand answer by answer. Save only on explicit
   confirmation; "Start over" restarts the interview.
5. **Save** (`draft` authority). Write the page to the central `du-demands` repo
   (`saveDemand`). It now shows on the demands list and the board at S1 with G1
   open, awaiting triage acceptance — a human act, never this playbook.

## Guarantees

- The artifact is byte-for-byte reproducible from the captured answers; the two
  views (chat/markdown/form) never disagree because they share those answers.
- The chat never recites the question list; upcoming questions stay in the interview.
- No repository is created at intake; the PoC builder creates the `uc-*` repo later.
- Runs under the invoking user's authority; a session lacking `draft` is refused
  with the reason. Live model when configured, deterministic offline agent
  otherwise — the output shape is identical either way.
