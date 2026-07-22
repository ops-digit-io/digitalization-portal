---
name: s1-intake
description: Capture a demand as a markdown page in the central intake repo through a fixed, AI-guided conversation with a deterministic result.
skills: [intake-conversation, demand-classification]
checkpoints: [confirm-understanding, confirm-demand]
---

# s1-intake

The S1 front door. Turns a person's problem into a **demand** — one markdown page
in the central `du-demands` repository (`docs/ARCHITECTURE-intake.md`). AI-guided
so a non-technical requester can just describe the problem; **deterministic in its
output** so the same answers always produce the same artifact. No repository is
created here — a demand earns its own repo only at the PoC stage.

## Contract

- **Same output, always.** The assistant elicits and normalises answers; it never
  writes the artifact. `buildDemand` (`lib/demand.ts`) renders the page from the
  captured answers — the same sections in the same order every time, empty fields
  filled with a stable placeholder. The conversation may vary; the demand may not.
- **AI drafts, humans decide.** Nothing here passes a gate. The demand opens with
  G1 `open`; a human accepts it at triage. The assistant may *propose* a lane; it
  never *assigns* one.

## Steps

1. **Elicit** (`intake-conversation`). Walk the fixed intake script — the ordered
   questions in `INTAKE_FIELDS`:
   1. In one line, what is the demand?
   2. What is the problem you are seeing?
   3. How is it handled today, and what does that cost?
   4. What would good look like?
   5. Which process is affected, and who feels it?
   6. How often does it happen, and at what scale?
   7. Any systems, data, or prior attempts we should know about?
   8. Which plant does this concern?
   9. Which domain?
   10. Who is raising it?

   Ask in the requester's own language; keep the answers as their words. Do not
   invent detail — an unanswered optional question stays empty, not interpolated.

2. **Checkpoint · confirm-understanding** (human). Play back the captured answers
   and the proposed lane/domain from `demand-classification`. The requester
   corrects anything wrong. Do not proceed until they confirm the understanding is
   right. The proposed lane is a suggestion for triage, not a decision.

3. **Render** (deterministic, no model). Call `buildDemand` with the confirmed
   answers. This is pure code — the artifact is a function of the answers, not of
   the conversation.

4. **Checkpoint · confirm-demand** (human). Show the rendered markdown page exactly
   as it will be saved. Save only on explicit confirmation.

5. **Save** (`draft` authority). Write the page to the central `du-demands` repo
   (`saveDemand`). It now shows on the demands list and the board at S1 with G1
   open, awaiting triage acceptance (G1) — a human act, never this playbook.

## Guarantees

- The artifact is byte-for-byte reproducible from the captured answers.
- No repository is created at intake; the PoC builder creates the `uc-*` repo later.
- Runs under the invoking user's authority; a session lacking `draft` is refused
  with the reason. Live model when configured, deterministic offline classifier
  otherwise — the output shape is identical either way.
