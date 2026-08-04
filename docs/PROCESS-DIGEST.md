# The engagement digest, without a model key

The Process Funnel's engagement page carries **two different scores**, and they
come from different places. Confusing them is the usual reason someone reports
that "the process and technology score are missing".

## Score Profile ≠ process/technology score

The **Score Profile** at the top of the Overview tab is five weighted dimensions
(`lib/process/score-model.ts`):

| Dimension | Weight | Asks |
|---|---|---|
| Visibility | 30% | Can we see what this process does, at step level, without asking anyone? |
| Shippability | 25% | Can a value increment land inside one iteration cycle? |
| Organisational carry | 20% | Will the change still be in use in six months? |
| Process health | 15% | Does the process do its job today, on a chain that does not break? |
| Addressable value | 10% | Is there enough on the other side to be worth a cycle? |

There is **no technology dimension here**. `Technologie-Push` / `Prozess-Pull`
(`anflug`) is an approach chosen when the engagement is created — it is never
scored. These five are derived from section grades and stay "not assessed" until
sections are filled or rated; that path needs no model.

The **process score** and **technology score** are the two dials inside the
**Engagement Digest** panel, further down the same tab. They are two fields of
the digest — `processScore` and `technologyScore` — and they exist only when a
digest exists.

## Why the digest used to be unreachable offline

`generate()` calls the model. With no provider configured, `llm.chat` throws
`NoKeyError`, `POST …/digest` answers `503 NO_KEY`, and the panel hides its
Generate button entirely — so the digest stayed `null` and neither dial ever
rendered.

The panel did offer **Copy prompt**, but there was no way back in: the route had
only `GET` and `POST`. The prompt could leave and the answer could never return.

## The paste-back path

`PUT /api/process/engagements/<slug>/digest` closes that loop, and the panel
exposes it as **Paste result** next to Copy prompt — in both the empty and the
filled state, with or without a key.

```bash
curl -X PUT http://127.0.0.1:3111/api/process/engagements/<slug>/digest \
  -H 'content-type: application/json' \
  -d '{"text":"<the whole model reply, fence and all>"}'
```

Send `text` (the entire reply — the JSON is found inside it, fenced or not) or
`digest` (an already-parsed object). Either way it goes through
`parseDigest`, which is a **whitelist, not a cast**: this is the one place
JSON authored outside the portal reaches the engagement store, so every field is
read individually and anything unrecognised is dropped.

What it enforces:

- `processStatement` is required — without the sentence the scores describe, two
  numbers on a dial are an assertion with no subject. Missing → `400 BAD_DIGEST`.
- A score survives only with a real number (or a string that is entirely a
  number), clamped to 0–100 and rounded. `null`, `""`, `[]` and `false` are
  **rejected rather than coerced** — they all become `0` under `Number()`, and a
  dial reading 0 is a claim about the process, not the absence of one.
- Tool rows without a name, friction items without a location or description, and
  dependency items without a process are dropped; a group whose every branch came
  back empty is omitted so the panel skips it.
- `generatedAt`, `model` and `provider` are never taken from the paste. The route
  sets them.

A pasted digest is stored with `provider: "pasted"` and the panel shows a second
badge — **PASTED — RUN OUTSIDE THE PORTAL** — beside the standing *derived — not
a finding* marker. A digest is derived either way, but one the portal generated
and one a person ran elsewhere are not the same claim, and the page says which it
is looking at.

## The shape to paste

```json
{
  "processStatement": "Downtime reasons are captured, but as free text at the line.",
  "processScore": { "value": 45, "basis": "steps are known, but no step-level timestamps exist" },
  "technologyStatement": "MES holds the stoppage, Excel holds the reason. Nothing joins them.",
  "technologyScore": { "value": 30, "basis": "no export, no interface between the two" },
  "tools": [{ "name": "MES", "role": "records the stoppage", "velocityOfChange": "low",
              "criticalityOfTouch": "high", "demandOfTouch": "medium" }],
  "friction": { "actual": [{ "where": "morning re-key", "what": "reasons typed a second time",
                             "evidence": "shift log vs. Excel, 12 May", "cost": "~1 day/week" }] },
  "dependencies": { "influences": [{ "process": "Maintenance planning", "how": "sets the priority list" }] },
  "confidence": "low",
  "basedOn": ["flow", "toolchain"],
  "gaps": ["no timestamps at step level"]
}
```

This is the same shape `generate()` stores, so a pasted digest and a generated one
render identically and `report.ts` reads both.

## With a key configured

Nothing changes. Set `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) and the Generate /
Regenerate buttons come back; Paste result stays available as a fallback for
running the prompt in a different model than the deployment is wired to.
