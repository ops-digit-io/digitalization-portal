---
name: risk-assumptions
description: Build the risk, assumption, open-question, and out-of-scope register for a digital use case — seeded by the archetype's characteristic failure modes — so the biggest uncertainties are visible before commitment, not discovered mid-PoC.
capabilities: [draft]
tools: []
---

# risk-assumptions

Good analysis makes the **uncertainty explicit**. Four registers do that; keep them
distinct — conflating them hides the thing that matters.

## The four registers

- **Assumptions** — what must be TRUE for the plan to hold, stated so it can be
  checked. ("The MES defect labels are consistent enough to learn from.") An
  assumption that fails becomes a risk.
- **Risks** — what could go WRONG, and why it matters. Seed these from the archetype's
  **characteristic failure modes** (`usecase-archetypes`) — not generic boilerplate.
  Note likelihood/impact qualitatively and, where possible, a mitigation.
- **Open questions** — what we don't yet KNOW and must find out. Every invented number
  avoided in `value-sizing`/`problem-framing` lands here. Seed from the archetype's
  **feasibility questions**.
- **Out of scope** — what we are deliberately NOT doing now, so scope stays honest and
  the "while we're at it" requests have a home.

## How to populate

1. Take the archetype's characteristic risks → risk register (tailored to the demand).
2. Take the archetype's feasibility questions → open questions.
3. Turn each data/technical prerequisite into an assumption to confirm.
4. Park everything beyond the first problem (from `problem-framing`) into out-of-scope,
   naming where it will be handled (e.g. "roll-out to other sites — scale stage S6").

## What good looks like

- Risks are **specific and consequential** ("too few defect images to trust the score",
  not "the model might be wrong"), each with a mitigation or a test.
- The **top risk is named** — the one most likely to kill it. Often it belongs in the
  PoC's first test.
- Assumptions are **falsifiable**; open questions are **answerable** by a named party.
- Out-of-scope is **explicit**, so scope creep has to argue its way back in.

## Guardrails

- Don't launder an open question into an assumption to look more certain. If you don't
  know it, it's an open question.
- A risk with no mitigation and no test is just anxiety — give it one, or escalate it
  as a gate concern.
- These are a draft for humans to challenge at the review checkpoint, not a decision.
