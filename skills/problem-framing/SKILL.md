---
name: problem-framing
description: Turn a raw, solution-shaped demand into a crisp, testable problem statement — the job to be done, the observable symptom, the current baseline, and what "solved" measurably looks like — before any requirements are written.
capabilities: [draft]
tools: []
---

# problem-framing

Most demands arrive as a **solution in search of a problem** ("we need a dashboard",
"we want AI"). The Analyst's first job is to recover the real problem, because
requirements written on a mis-framed problem are precise and wrong.

## The frame

Produce four things before anything else:

1. **Job to be done.** What is the person actually trying to accomplish, independent
   of any tool? ("Catch a defect before a batch is scrapped" — not "build a model".)
2. **Observable symptom.** What concretely happens today that shouldn't, where, and to
   whom? Anchored in observable reality, not opinion.
3. **Current baseline.** How is it handled today and what does it cost — time, scrap,
   money, risk? A number if one exists; an explicit "unquantified" if not (that
   becomes an enhancement ask, never an invented figure).
4. **Definition of solved.** What would you observe or measure if it worked? This is
   the seed of the acceptance criteria and the value case.

## Techniques

- **Separate problem from solution.** If the demand names a technology, restate it as
  the outcome that technology is meant to deliver, then ask whether that's the best
  shape (that's the archetype skill's job). "We want a chatbot" → "people can't find
  answers in our documents fast enough".
- **Five whys**, lightly. Push past the first symptom to the cause that's worth
  solving — but stop when it leaves the sponsor's control.
- **Jobs-to-be-done phrasing.** "When [situation], I want to [motivation], so I can
  [outcome]." This maps straight onto user stories later.
- **First principles on feasibility.** Ask whether the outcome is even achievable in
  principle from what's available — don't defer every hard question to delivery.

## Anti-patterns to catch

- **Solution lock-in** — the demand prescribes the how; you never revisit the what.
- **Boil-the-ocean scope** — "while we're at it". Name the *first* problem worth
  solving; push the rest to out-of-scope.
- **Unfalsifiable goals** — "improve efficiency". If you can't state how you'd know it
  worked, it isn't framed yet.

## Output

A refined problem statement (feeds `analysis.md`'s "Refined problem") and the
definition-of-solved that seeds the E1 epic and the must-have acceptance criteria.

## References

- `references/techniques.md` — worked framing techniques and before/after examples.
