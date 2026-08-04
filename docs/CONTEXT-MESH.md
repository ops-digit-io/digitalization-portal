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

`- <target> — <relation>, <note>`

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

### Relations are typed; the rest of the note is not

The note stays free prose, but its **first phrase** is worth typing. The portal's
central promise is that a demand is captured once, and "this is a duplicate of
UC-2026-0033" has to be answerable by a query across the funnel — it cannot be if
the only record of it is a sentence.

`duplicate of` · `supersedes` · `superseded by` · `depends on` · `blocks` ·
`part of` · `related`

This is where the spec's own example already pointed: *"related, shares cause-code
taxonomy"* is exactly `<relation>, <note>`. The vocabulary is a suggestion, not a
schema — a note opening with anything else is still a perfectly good reference that
simply has no relation. And a note is only split when the phrase is followed by
punctuation or ends the note, so *"related work stopped in March"* keeps its first
word.

Asymmetric relations are **inverted when read from the other end**. If A says it
supersedes B, then on B's page the neighbour A reads *superseded by* — stating it
the other way round would assert the opposite of what was written.

### Building a reference from a kind and an id

Use `targetFor(kind, id)`. Do **not** assemble `` `${kind}:${id}` `` and hand it to
`parseTarget`: a demand's markdown prefix is `uc`, not `demand`, so
`"demand:UC-2026-0001"` names no kind and is silently dropped. That bug shipped once
and cost every reference a requester flagged at intake, which is why the safe path
is now a function and the trap has a test.

## Authored and derived edges

Half the mesh is written by people. The other half the portal already knew:

| Edge | Where it comes from | Source |
|---|---|---|
| demand → process diagnosis | written into the demand when the diagnosis is disassembled | authored |
| process diagnosis → demand | the engagement's own `demands` list | derived |
| demand → champion | the row's requester / sponsor, matched to the register | derived |
| process → champion | the engagement's owner / champion | derived |
| demand → requirements | the case's artifact list | derived |
| demand → demand | the requester's answer to the duplicate check at intake | authored |
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

## Capture is where the mesh is earned

The duplicate check at intake asks the requester a real question — *"possibly
already captured, open one instead of duplicating?"* — and until now it offered only
a link. Someone who looked, judged "related but not the same", and filed anyway had
that judgement thrown away. Nothing in the funnel remembered the two demands had
ever been compared, so the next person to look started from scratch. On the portal's
own terms that is a direct loss: capturing once depends on the comparison sticking.

The match list now carries the two answers worth recording — **Duplicate** and
**Related** — and they travel with the demand into its `## Related` section on save.
Choosing neither is a first-class outcome: silence is not a claim, and an unrecorded
comparison beats a wrong edge.

The API whitelists what arrives (`coerceReferences`): unknown relations are dropped
rather than invented, notes are bounded, and duplicate targets collapse. The
capture's `dedupKey` includes the references, so two captures that differ only in
what they link to are not treated as the same submission.

## Reading it from a client or an agent

`GET /api/mesh?id=UC-2026-0001` — or with an explicit `kind=` when the id's shape
does not name one (a process slug, a skill name). Returns the same neighbourhood
`loadNeighbourhood` gives a server page, scoped to `view_board`.

It exists because the mesh has more than one consumer: server pages call the loader
directly, but client pages (the process engagement view) and agent tools cannot, and
all three want the same answer. Read-only by construction — writing an edge goes
through the artifact that owns it, never through the API.

## Ensuring the corpus really reads as a graph

Everything above describes how an edge is written and read. None of it guarantees
the **corpus as a whole** is a graph — and a per-artifact view structurally cannot
tell you, because it only ever sees one neighbourhood at a time.

The failure that matters is invisible from the inside. A `## Related` line naming
`UC2026-0002` (missing a hyphen) records **no edge at all**: the parser drops it,
the page renders exactly as if the line were never written, and the relation is
gone. Nothing inside the mesh can distinguish that from an edge nobody authored.

So the corpus is validated from outside, all of it at once.

```bash
npm run mesh:check              # report; exit 1 if the corpus is not sound
npm run mesh:check -- --json    # nodes + edges, for a graph database or a d3 view
npm run mesh:check -- --mermaid # the graph as a diagram
npm run mesh:check -- --warn    # treat warnings as failures too
```

`lib/mesh-corpus.ts` loads every artifact the mesh can name — including nodes that
hold no references of their own, because an artifact missing from the corpus is
indistinguishable from one that was deleted. `lib/mesh-graph.ts` then builds one
graph and names what is wrong with it:

| Issue | Meaning | Severity |
|---|---|---|
| `unresolved` | a line names no known artifact — a typo eating an edge | error |
| `dangling` | the target does not exist in the corpus | error |
| `contradiction` | two documents state incompatible relations about the same pair | error |
| `duplicate-line` | the same target listed twice in one document | warning |
| `asymmetric` | one end records a mutual relation, the other does not | warning |
| `unverifiable` | a whole kind is absent, so its edges cannot be judged | warning |

**Errors** mean the corpus does not read as a sound graph. **Warnings** mean it
does, but something wants a human.

`unverifiable` is the one worth explaining. Skills and playbooks live in a separate
repository a deployment may not reach. A corpus that loaded *no* nodes of a kind
cannot tell a deleted target from an unreachable store — so reporting every such
edge as dangling would be loud and wrong, and reporting none would be quiet and
wrong. The gap is named once, per kind, and those edges are left unjudged.

Contradictions are compared **from the same end** before being judged, or every
mutual pair would look like a disagreement purely because the two documents were
written from opposite sides. `A supersedes B` on one page and `B superseded by A`
on the other is agreement; `A duplicate-of B` against `B supersedes A` is not, and
triage does opposite things with each.

### It is checked on every run

`lib/mesh-corpus.test.ts` asserts soundness inside `npm test`, and CI runs
`npm run mesh:check` as its own step for the readable report. This follows
`docs-coverage.test.ts`, which keeps the generated maps honest the same way: a
property is only a fact if something checks it.

`demands/` starts empty by design, so on a clean checkout the assertions are
trivially true. They earn their keep in any tree that holds captured demands.

### Duplicate clusters

`duplicateClusters()` returns connected groups over `duplicate` edges — the query
typed relations exist for. Three demands each flagged against the next are **one
cluster of three** for triage to merge, not three unrelated pairs. Prose in a note
could never answer that.

## Rendering it

`components/portal/related-panel.tsx` takes a `Neighbourhood` and renders nothing
at all when there is nothing to show — an empty *Related* heading reads as
"checked, nothing related", which is a claim the mesh is in no position to make.

Wired onto the **demand page** (server-side, via `loadNeighbourhood`) and the
**process engagement page** (client-side, via `useMesh` over the API).

The persona and champion pages are deliberately not wired: both are *list* pages
with no per-entity route, so there is nowhere for a panel to sit. Giving them detail
pages — or a per-row "referenced by N" count, which needs a bulk mesh query rather
than a per-subject one — is the natural next step.
