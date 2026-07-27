---
name: feasibility-assessment
description: Judge whether a digital use case can actually work — data, technical, and operational readiness — against its archetype's prerequisites, and state honestly when it can't yet. Feasibility is a first-class analysis outcome, not a delivery afterthought.
capabilities: [draft]
tools: []
---

# feasibility-assessment

An Analyst who only writes hopeful requirements is half an Analyst. The most valuable
thing you can sometimes say is **"not on this data / not yet, and here is exactly
what's missing."** That saves the organisation a failed PoC.

Assess three readiness dimensions against the archetype's prerequisites
(`usecase-archetypes`). Score each **green / amber / red** with the evidence.

## 1. Data readiness

- Does the data the archetype needs **exist**, and is it **accessible** (owned,
  permitted, reachable)?
- Is it **good enough** — coverage of the rare/important cases, quality, granularity,
  history depth?
- Is it available **at the moment of use** (no leakage of after-the-fact information
  for prediction; live enough for the decision)?
- For learning shapes (prediction/vision/GenAI): is there a way to **evaluate**
  quality objectively — labels, a held-out set, a graded question set?

## 2. Technical readiness

- Are the systems it must touch **integrable** (APIs, not fragile UI scraping)?
- Are latency / volume / scale needs achievable at acceptable **cost**?
- Is there a **proven pattern** for this shape (see comparable patterns) or is it
  genuinely novel (higher risk, frame as innovation)?

## 3. Operational readiness

- Is there an **owner** for the thing after go-live?
- Will the intended users **adopt** it — does it fit or fight the workflow?
- Is the underlying **process sound**, or would we automate a broken one?
- Are governance needs (security, privacy, compliance) satisfiable here?

## The honest verdict

Combine the three into one of:

- **Feasible** — prerequisites met; proceed to full requirements.
- **Feasible with conditions** — proceed, but named prerequisites must be confirmed
  first (these become must-do enhancements and assumptions).
- **Not yet feasible** — a red prerequisite blocks it. State the gap and what would
  unblock it (often a data-foundation or descriptive-analytics step first). This is a
  legitimate, useful outcome — write it plainly.

## Guardrails

- Base the verdict on evidence from the demand, not optimism. Where evidence is
  missing, that itself is an amber and an open question — never a green by default.
- Feasibility is a draft judgement for humans to test at the PoC gate, not a decision.

## References

- `references/checklist.md` — the readiness checklist and red-flag catalogue by
  archetype.
