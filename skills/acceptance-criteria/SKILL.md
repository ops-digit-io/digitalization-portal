---
name: acceptance-criteria
description: Write acceptance criteria that are individually checkable during a PoC or pilot — one concrete, observable Given/When/Then per criterion, testable, and tied to a threshold where the archetype demands one.
capabilities: [draft]
tools: []
---

# acceptance-criteria

Acceptance criteria are not decoration — in this portal they become the **checkboxes a
human ticks off during a PoC or pilot**. So each one must be independently verifiable:
a reviewer should be able to look at it and say "yes, proven" or "no, not yet" without
interpreting a paragraph.

## The form

One observable statement per criterion, in **Given / When / Then**:

> **Given** [a precondition or context], **when** [an action or event], **then**
> [an observable, checkable result].

- **Given** grounds it in a real situation.
- **When** is the trigger.
- **Then** is what an observer can confirm happened — ideally measurable.

## Rules for checkable criteria

1. **One assertion per criterion.** If it contains "and" joining two testable things,
   split it — each becomes its own tickable line.
2. **Observable, not aspirational.** "the system is fast" → "the result appears within
   2 seconds for the 95th-percentile request".
3. **Thresholds where the archetype needs them.** Prediction → beat the baseline by an
   agreed margin on a back-test; vision → false-accept ≤ X%, false-reject ≤ Y% on a
   held-out set; RAG → answer cites its source and abstains when unsupported;
   automation → invalid cases are routed to a human, not force-processed.
4. **Include the negative / degraded case.** The most valuable criteria often test what
   happens when things go wrong: bad input, missing data, no rights, low confidence.
5. **No solution smuggled in.** Criteria describe the *outcome to observe*, not the
   implementation.

## Coverage per user story

For each must-have story, aim to cover:

- the **happy path** (the core outcome, with its threshold);
- at least one **edge / failure path** (degraded gracefully, not wrongly);
- where relevant, a **guardrail** (security, access, confidence-state visible).

## Anti-patterns

- Vague: "works well", "is accurate", "is user-friendly" — untickable.
- Compound: three assertions in one bullet — can't be half-ticked.
- Restating the story as a criterion — adds no test.
- Threshold-free where the shape lives or dies on a number (any ML/vision use case).

## References

- `references/patterns.md` — ready acceptance-criteria patterns per archetype, with
  good/bad examples.
