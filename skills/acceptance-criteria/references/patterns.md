# Acceptance-criteria patterns by archetype

Each pattern is a Given/When/Then skeleton you fill with the demand's specifics. Keep
one assertion per line so each is independently tickable during PoC/pilot.

## Descriptive analytics / BI

- Given the agreed metric definition, when the dashboard shows it, then it reconciles
  to the source of truth within [tolerance].
- Given the intended decision, when the user opens the view, then the signal needed
  is visible without drilling.
- Given a data-freshness requirement of [X], when the view loads, then it states its
  data recency and it is within [X].

## Prediction / anomaly detection

- Given a back-test on held-out history, when evaluated, then the model beats the
  [current baseline] by ≥ [margin] on [metric].
- Given a flagged event, when shown, then the top [n] contributing drivers are visible.
- Given a false-alarm budget of [X]/week, when run over [period], then alerts do not
  exceed it.

## Computer vision

- Given a labelled test set held out from training, when scored, then false-accept ≤
  [X]% and false-reject ≤ [Y]%.
- Given a product variant absent from training, when run, then the system flags low
  confidence rather than guessing.

## GenAI assistant / RAG

- Given a question answerable from the corpus, when asked, then the answer is correct
  and cites the source passage.
- Given a question outside the corpus, when asked, then the assistant says it doesn't
  know rather than inventing an answer.
- Given a user without rights to a document, when they ask about it, then it is not
  revealed.

## Automation / workflow

- Given a valid case, when it enters, then it is processed end-to-end with no manual
  touch and a logged trail.
- Given an invalid/exceptional case, when detected, then it is routed to a human, not
  force-processed.
- Given the same case delivered twice, when processed, then it is not double-processed.

## Optimization / decision support

- Given a real scenario, when optimised, then the plan respects every hard constraint
  and improves [objective] vs. today's practice.
- Given an operator override, when applied, then the system re-optimises around it.

## Integration / data platform

- Given a source record, when it flows through, then it appears correctly in the
  target with lineage, or is quarantined with a reason.
- Given a duplicate or late record, when processed, then no double-count or gap results.

## IoT / connected monitoring

- Given an instrumented asset, when it reports, then its state is visible within
  [latency] and retained per [policy].
- Given a connectivity drop, when it recovers, then buffered data backfills without
  loss or duplication.

## Self-service / portal

- Given a first-time user with no training, when they attempt the core task, then they
  complete it unaided.
- Given a submitted request, when accepted, then it reaches the system of record with
  no re-keying.

## Data foundation / governance

- Given the first downstream use case, when it consumes the foundation, then it gets
  correct, governed, documented data.
- Given a data-quality rule, when violated, then it is detected and reported to the
  domain owner.

## Good vs. bad

| Bad (untickable) | Good (tickable) |
|---|---|
| "The model is accurate." | "On the held-out set, recall ≥ 0.8 at ≤ 5 false alarms/week." |
| "Answers are trustworthy and fast and cited." | Three lines: correct+cited / abstains when unsupported / p95 < 3 s. |
| "Users like the portal." | "A first-time user completes a leave request unaided in < 3 min." |
