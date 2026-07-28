# Problem-framing techniques (worked)

## Separate problem from solution — before / after

| Demand as raised (solution-shaped) | Reframed as a problem (outcome-shaped) |
|---|---|
| "We need a Power BI dashboard for scrap." | "Shift leads can't see scrap trending up until the batch is already lost; they need the signal in time to adjust." |
| "We want an AI chatbot for HR." | "Employees can't find answers to routine HR questions without emailing HR, who answer the same 40 questions repeatedly." |
| "Automate the invoice process with RPA." | "Invoice matching takes 3 FTE and delays payment; ~80% of invoices are rule-matchable, 20% need judgement." |
| "Put sensors on the pumps." | "Pump failures stop the line with no warning; we don't know which failures are predictable from what signal." |

The right-hand column is analysable; the left-hand column pre-commits the shape.

## Jobs-to-be-done phrasing

> When **[situation]**, I want to **[motivation]**, so I can **[expected outcome]**.

- "When a batch starts drifting out of spec, I want an early warning, so I can adjust
  before scrapping the batch."

This maps directly to a user story: *As a shift quality lead, I want an early defect
warning, so that I can correct the batch before it's scrapped.*

## Five whys — stop at the controllable cause

- Defects reach the customer → *why?* caught only at final inspection → *why?* no
  in-process check → *why?* the signal exists in MES but nobody watches it in time →
  **worth solving here.** → *why isn't it watched?* no alerting → this is the demand.

Stop when the next "why" leaves the sponsor's authority (e.g. "because the industry
has thin margins"): that's context, not a solvable problem for this demand.

## Definition-of-solved → acceptance seed

Frame "solved" as something observable, and it becomes the E1 must-have acceptance
criterion:

- Solved = "a drifting batch is flagged with ≥30 min lead time in ≥80% of cases" →
  *Given a batch trending out of spec, when it crosses the early threshold, then the
  shift lead is alerted with ≥30 min before scrap.*

## Checklist

- [ ] Job to be done stated without naming a technology.
- [ ] Symptom is observable (a person could point at it).
- [ ] Baseline quantified, or explicitly flagged unquantified (never invented).
- [ ] "Solved" is measurable.
- [ ] The *first* problem is isolated; the rest is parked to out-of-scope.
