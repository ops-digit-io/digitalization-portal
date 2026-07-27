# Feasibility checklist & red-flags

Score each item green / amber / red with a one-line reason. Missing evidence = amber
(and an open question), never green.

## Data readiness

- [ ] The required data exists and is identified (system + field level).
- [ ] Access is permitted (owner, security, privacy) and reachable.
- [ ] Coverage includes the rare/important cases (the defect, the failure, the fraud).
- [ ] Quality and granularity are adequate for the decision.
- [ ] History is deep enough (for learning shapes) and representative of the future.
- [ ] Inputs are available at the time of use — no after-the-fact leakage.
- [ ] There is an objective way to evaluate quality (labels / held-out set / graded Qs).

## Technical readiness

- [ ] Systems to integrate expose stable APIs (not screen-scraping).
- [ ] Latency / volume / scale targets are achievable at acceptable cost.
- [ ] A proven pattern exists for this shape (else flag as novel / higher-risk).
- [ ] Security and data-residency constraints are satisfiable in the target environment.

## Operational readiness

- [ ] A named owner will run it after go-live.
- [ ] The intended users are identified and the change fits their workflow.
- [ ] The underlying process is sound (not a broken process being automated).
- [ ] Governance (access, retention, compliance) is achievable.

## Red-flags by archetype

- **Prediction:** no labelled history of the rare outcome → likely *not yet feasible*;
  target only knowable after the fact → leakage risk; unstable process → drift.
- **Computer vision:** too few images of the defect class; uncontrolled capture
  conditions; a task a human can't do from the same image.
- **GenAI/RAG:** the knowledge isn't written down; no way to grade answers; access
  control can't be enforced at retrieval; high cost of a wrong answer with no reviewer.
- **Automation:** high exception rate needing judgement; only UI integration
  available; unclear ownership of failures.
- **Optimization:** objective/constraints can't be agreed; state data untrustworthy;
  decision owner won't cede control.
- **Integration:** moving/owner-less schemas; no agreed source of truth on conflict.
- **IoT:** unreliable field connectivity/power; no device security/lifecycle plan.
- **Self-service / data foundation:** no committed consumer / a broken underlying
  process → build stalls or goes unused.

## Verdict template

> **Feasibility:** Feasible with conditions.
> **Data:** amber — MES has the tags but defect labels are inconsistent (enhancement).
> **Technical:** green — MES exposes an API; latency target easily met.
> **Operational:** amber — no named owner for the alert response yet.
> **Blocking prerequisites:** consistent defect labelling; an owner for alert triage.
