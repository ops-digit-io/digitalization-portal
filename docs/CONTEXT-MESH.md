# The context mesh

The portal's artifacts already relate to each other. A demand is cut out of a
process diagnosis; a user story cites a persona; a champion carries a plant's
work; a business case belongs to a demand. Until now those relations lived as
**prose** ("Finding from the process diagnosis “X”") or as **one-way metadata**
(the engagement listed its demands; the demands knew nothing of the engagement).
Neither could be navigated, and neither could be inverted.

The mesh makes those relations first-class, in both directions, without adding a
database.

## Where a reference lives

In markdown, under `## Related` — the section `docs/03-data-model.md §3.5` already
specified and nothing had written until now. Design commitment #4 rules out
frontmatter in artifact repos, and it is the right constraint here: a reference
should be readable, writable and diffable by a person with a text editor and no
portal.

```markdown
## Related

- UC-2026-0033 — shares the cause-code taxonomy
- process:downtime-reason-capture — cut out of this diagnosis
- persona:P-03 — the shift lead who books the scrap
- champion:C-01 — carries this at DE-ALD
- skill:demand-classification — governed the lane proposal
```

The section sits after `## Gates` and before `## History`, because History is
append-only and anything below it drifts further from the document over time.

### The grammar

`- <target> — <note>`

- **target** is `kind:id`, or a bare id whose shape identifies it: `UC-2026-0033`
  is a demand, `P-03` a persona, `C-01` a champion. The spec's own example
  therefore parses unchanged.
- **note** is free prose after an em dash (en dash and `--` are accepted too). It
  is never parsed, and it is the reason the mesh is worth reading — *an edge
  without a stated reason is trivia*.
- Anything that names no known kind is **dropped, not fatal**. `lib/references.ts`
  follows the `lib/parse.ts` rule: an unreadable relation must never cost you the
  document that holds it.

Kinds live in one table, `REFERENCE_KINDS` — the mesh's only extension seam. A new
artifact kind is one entry; nothing else in the module knows the list.

## Authored and derived edges

Half the mesh is written by people. The other half the portal already knew:

| Edge | Where it comes from | Source |
|---|---|---|
| demand → process diagnosis | written into the demand when the diagnosis is disassembled | authored |
| process diagnosis → demand | the engagement's own `demands` list | derived |
| demand → champion | the row's requester / sponsor, matched to the register | derived |
| process → champion | the engagement's owner / champion | derived |
| demand → requirements | the case's artifact list | derived |
| anything → anything | a `## Related` line | authored |

The distinction is **shown, not smoothed over**. An authored edge has a person
behind it; a derived edge is exactly as reliable as the field it was read from, and
the panel marks it `derived` for the same reason the engagement digest marks itself
*derived — not a finding*.

When the same relation arrives twice, `dedupeEdges` keeps the authored one: it
carries the reason.

## Both directions

`neighbourhood()` splits a node's edges into **References** (what this artifact
points at) and **Referenced by** (what points here). The inbound half is the point
of the whole exercise — it is the half nobody writes down. A persona does not know
which requirements cite it; a diagnosis's demands did not know their origin.

Reciprocal pairs are collapsed **for display only** (`collapseReciprocal`), so an
artifact that both ends mention appears once, on the declared side. The graph keeps
both edges; only the panel simplifies.

## What it costs

This is the constraint that shapes `lib/mesh-store.ts`, and it is worth stating
plainly: **`getFunnelRows` is a projection.** It deliberately does not open each
demand's markdown, because at 14k cases that is precisely the read the projection
exists to avoid. A mesh that scanned every document on every page view would undo
that.

So edges are collected only from where they are already cheap — funnel rows,
engagement metas, the champion register, and the subject's own document.

The one relation that cannot be had cheaply is **authored backlinks**: finding
every *other* document whose `## Related` names this one means reading them all.
Rather than pretend otherwise, that scan is bounded by `AUTHORED_SCAN_LIMIT` (250)
and the result carries `truncated`, which the panel renders as a plain sentence
saying the mesh looked at part of the funnel and not all of it.

**The permanent fix** is to materialise authored references into the funnel
projection when a demand is saved — the same move the reconciler already makes for
state. That is a projection-schema change and is deliberately not in this first
pass; when it lands, `authoredBacklinks` is the only function that changes.

## Adding to the mesh

- **A new kind** — one entry in `REFERENCE_KINDS` (prefix, label, href, and an
  optional bare-id shape). Bare-id patterns must not overlap; a test enforces it.
- **A new derived edge** — one block in `derived()` in `lib/mesh-store.ts`, reading
  from a store that is already loaded.
- **A new writer** — call `addReference()`. It is idempotent, keeps an existing
  edge in place rather than moving it to the end, and never blanks a note a human
  improved by hand when an automated re-run supplies none.

## Rendering it

`components/portal/related-panel.tsx` takes a `Neighbourhood` and renders nothing
at all when there is nothing to show — an empty *Related* heading reads as
"checked, nothing related", which is a claim the mesh is in no position to make.

It is wired onto the demand page today. Any page with an artifact identity can take
it: pass `loadNeighbourhood({ kind, id })` into the panel.
