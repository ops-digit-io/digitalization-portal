---
name: usecase-archetypes
description: Classify a digital use case by its SOLUTION SHAPE (analytics, prediction, computer vision, GenAI/RAG, automation, optimization, integration, IoT, self-service, data foundation) and apply that archetype's analysis lens — feasibility questions, data prerequisites, load-bearing NFRs, and characteristic failure modes.
capabilities: [draft]
tools: []
---

# usecase-archetypes

The archetype is the **second grounding axis** (the first is the business domain). It
is what lets one Analyst reason well about *any* digital use case: the domain tells
you the context, the archetype tells you *how to analyse this kind of thing*.

## Why archetype, not just domain

Two demands in the same domain can be completely different engineering problems — a
maintenance dashboard (descriptive analytics) versus maintenance failure-prediction
(a model). Two demands in different domains can be the *same* problem — a
quality-defect predictor and a sales-churn predictor share the same feasibility
questions, data needs, and failure modes. Classify the shape and you inherit the
right questions to ask.

## How to classify

Read the demand for the verb of the desired outcome:

- *see / track / compare what happened* → **descriptive analytics**
- *predict / forecast / flag an anomaly* → **prediction / anomaly detection**
- *detect / read / inspect from an image* → **computer vision**
- *ask / draft / summarise / answer from documents* → **GenAI assistant / RAG**
- *do the steps automatically / reduce manual work* → **automation / workflow**
- *choose the best plan under constraints* → **optimization / decision support**
- *move / reconcile data between systems* → **integration / data platform**
- *instrument physical assets / stream their state* → **IoT / connected monitoring**
- *let users run the workflow themselves* → **self-service application / portal**
- *establish trustworthy shared data* → **data foundation / governance**

If several fit, pick the most decision-relevant. If none is clear, default to
**descriptive analytics** — making the problem visible is the safe first step, and
you can escalate to prediction/optimization once the data is understood.

## What to do with the archetype

Once classified, pull its lens from `references/catalog.md` and let it drive the
analysis:

1. **Feasibility questions** become the first open questions.
2. **Data prerequisites** become enhancement asks and assumptions to confirm.
3. **Load-bearing NFRs** get added to the NFR set (these are the ones that decide
   success for this shape — e.g. groundedness for RAG, false-accept/reject bounds for
   vision, idempotency for automation).
4. **Characteristic risks** seed the risk register with the ways this shape actually
   fails — not generic risk boilerplate.
5. **Comparable patterns** point the design at proven solutions and away from the
   anti-patterns.

## Guardrails

- The archetype is a lens, not a straitjacket — a real case can blend two (e.g. a
  GenAI assistant *over* an integration layer). Name the primary shape and note the
  secondary.
- Never let the archetype invent facts about the demand. It supplies *questions* to
  ask and *risks* to check, which the human answers.

## References

- `references/catalog.md` — the full archetype catalogue: for each shape, its
  feasibility questions, data prerequisites, load-bearing NFRs, characteristic risks,
  acceptance-criteria patterns, comparable patterns, and the shapes it's confused with.
