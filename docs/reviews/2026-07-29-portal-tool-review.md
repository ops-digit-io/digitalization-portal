# Portal tool review — 2026-07-29

**Author:** Digital Unit use-case responsible (weekly screening cadence)
**Build under review:** `claude/digital-unit-use-cases-jvchq6` @ HEAD, demo/offline mode
**Method:** installed deps → `npm run typecheck` (clean) → `npm test` (422/422 green
at start) → booted `next dev` → drove every launchpad route with Playwright
(screenshot + primary action) → read the backing code for each tool.
**Environment:** no OIDC, no GitHub App, no model key, no KV — i.e. exactly what a
fresh deploy shows before integrations are wired. Findings reflect that state.

> This is a screening + gap review, not a spec change. It ends with a prioritized
> backlog so the next weekly use-case batch picks itself, and records the two
> quick wins shipped in the same cycle (§7).

---

## 1. Executive summary

The portal is **structurally excellent and demonstrably healthy**: 54 test files /
422 assertions green, typecheck clean, production build succeeds credential-free,
and **every one of the ~25 launchpad routes returns 200**. The architecture
(markdown-as-record, data-driven launchpad, additive agent-tool/skill/playbook
seams, portal-side gate enforcement with a CI `guard-no-merge`) is coherent and
genuinely extensible — adding capability really is one file + one registry line.

The single biggest problem is **not a bug in any tool — it is that the tools had
nothing to act on.** `loadPortfolioRows()` deliberately has *no seed fallback*
("an empty funnel renders empty, never fabricated"), and the shipped `demands/`
funnel was empty. So out of the box:

- Board = `ACTIVE 0`, Funnel = `ENTERED 0`, Value Cockpit = `PIPELINE 0 €`,
  Demands, Analysis, Personas = empty.
- **Every board card links to `/uc/<id>`, but `/uc/<id>` 404'd** for every seeded
  id (the old `SEED_ROWS` are now used *only* by the PoC demo route, not the
  board) — so the portfolio → detail journey was a dead end in the demo.

A first-time evaluator therefore saw an empty, seemingly non-functional product.
That is a cold-start / demonstrability gap, not a code defect — and it is the
highest-leverage thing to fix. **This cycle fixed it** (§7): a real, authored
demo funnel of 7 use cases spanning S1→S8 now lights up every steering, value,
persona and detail view, and `/uc/<id>` resolves (200). Value Cockpit now reads
**PIPELINE 510.000 €** from real `business-case.md` artifacts, board shows
`ACTIVE 6`, and the funnel shows real stage flow.

**Top 5 highest-leverage moves (detail in §6):**

1. ~~Seed a demonstrable funnel so the portal shows its own value~~ — **shipped (§7).**
2. **Gate-readiness for owners** — "is this case ready to advance, and what's
   missing?" — **shipped as an agent tool this cycle (§7);** next step is a UI surface.
3. **Wire the disabled steering tiles** (Backlog, Roadmap, Digital Champions) —
   they're promised on the launchpad but route to `/board`.
4. **`/demands` default scope trap** — it defaults to *"My demands"* (scoped to the
   session email), so a fresh operator sees an empty list even when the funnel is
   full. Default to "All" (or show a hint) when "mine" is empty.
5. **Make the PoC builder act on real funnel cases**, not only the frozen
   `SEED_ROWS` — it's the one build-stage tool and it's disconnected from the funnel.

---

## 2. How each tool was exercised

Playwright drove `1400×1000` Chromium against `next dev`, screenshotting each
route and reading its rendered text. Screenshots live in the review workspace (not
committed — they are demo-session captures). Primary actions exercised: submit an
intake (form + markdown), open a use-case detail and its business-case/simulate
sub-pages, run the board filters, open triage/funnel/value/analysis/personas,
browse the catalog and skill library, and read settings/digest.

---

## 3. Test-results matrix

Status legend: **✅ works** · **◻ works but empty pre-seed** (now populated by §7)
· **🟡 stub/"soon"** · **🔗 tile routes elsewhere**.

| Tool | Route | HTTP | State | Verdict |
|---|---|---|---|---|
| Home / launchpad | `/` | 200 | ✅ | Tiles, search palette (⌘K), category grouping all render. |
| Intake (hub) | `/intake` | 200 | ✅ | Chat / form / markdown entry points present. |
| Intake · form | `/intake/form` | 200 | ✅ | Fieldset groups from `INTAKE_FIELDS`; submits to the funnel. |
| Intake · markdown | `/intake/md` | 200 | ✅ | Starts from `blankDemandMarkdown()`. |
| Intake · chat | `/intake/chat` | 200 | ✅ | Offline deterministic engine when no model key. |
| Demands | `/demands` | 200 | ◻→🟡 | Populated, but **defaults to "My demands"** → looks empty (see §4). |
| Portfolio Board | `/board` | 200 | ◻→✅ | Now `ACTIVE 6`; filters (stage/lane/plant) and KPIs work. |
| Needs Attention | `/board` | 200 | 🔗 | Same route as board; relies on unreadable-state cases. |
| Analyst | `/assistant` | 200 | ✅ | Offline analyst responds; agent tools resolve by capability. |
| Requirements | `/requirements` | 200 | ◻→✅ | Now lists cases with `requirements.md`. |
| Persona Analyst | `/personas` | 200 | ◻→✅ | Requestor cohorts now populated from real records. |
| Implementation Analysis | `/analysis` | 200 | ◻→✅ | Workload-vs-value now has rows to plot. |
| Value Cockpit | `/value` | 200 | ◻→✅ | **PIPELINE 510.000 €** + realized bucket from real BCs. |
| Business Case Simulation | `/simulate` | 200 | ✅ | P10/P50/P90 via `lib/simulation.ts`. |
| Value Review | `/analysis` | 200 | 🔗 | Aliased to analysis. |
| Use-case Funnel | `/funnel` | 200 | ◻→✅ | Stage flow / conversion / dwell now non-zero. |
| Triage | `/triage` | 200 | ◻→✅ | S1/S2 cases now available to classify. |
| Backlog | `/board` | 200 | 🟡🔗 | `disabled:true`; routes to board. |
| Roadmap | `/board` | 200 | 🟡🔗 | `disabled:true`; routes to board. |
| Digital Champions | `/board` | 200 | 🟡🔗 | `disabled:true`; routes to board. |
| Agentic PoC Builder | `/build` | 200 | 🟡 | Route works; tile `disabled:true`; acts only on `SEED_ROWS`. |
| Handovers | `/handovers` | 200 | ✅ | Run-lane / G7 records surface. |
| Specification | `/board` | 200 | 🟡🔗 | `disabled:true`; docs not surfaced in-app. |
| Skills & Playbooks | `/catalog` | 200 | ✅ | Richest page; lists skills/playbooks/contracts, create flow. |
| Categories (admin) | `/admin/categories` | 200 | ✅ | Plants/domains editable (KV) or seed read-only. |
| Skill Library | `/skill-library` | 200 | ✅ | Import reference skills (agentskills.io) surface. |
| Agent Traces | `/assistant` | 200 | 🟡🔗 | `disabled:true`; no replay UI yet. |
| Review Digest | `/digest` | 200 | ✅ | Due dates / staleness; email optional. |
| Configuration | `/settings` | 200 | ✅ | Key-free integration status; excellent operator page. |
| Use-case detail | `/uc/<id>` | 404→200 | ✅ | **Was 404 for all board ids**; resolves after §7 seeding. |
| UC · business case | `/uc/<id>/business-case` | 404→200 | ✅ | Resolves once the case exists. |
| UC · simulate | `/uc/<id>/simulate` | 404→200 | ✅ | Gated on a real `business-case.md`. |
| UC · edit | `/uc/<id>/edit` | 404→200 | ✅ | In-portal editor for editable demands. |
| UC · PoC | `/uc/<id>/poc` | 200 | 🟡 | Rendered even for non-existent ids (no existence check). |
| Login | `/login` | 200 | ✅ | Present; enforced only when OIDC is configured. |

---

## 4. Per-tool gaps & feature ideas

Effort sizing: **S** ≈ <½ day · **M** ≈ 1–2 days · **L** ≈ >2 days.

### Demand & intake
- **Intake** — *Gap:* the offline engine is deterministic but gives no "similarity"
  hint against existing demands unless a model key is set, so duplicates slip in.
  *Ideas:* (S) show top-3 similar existing demands from `intake/similar` inline as
  the user types; (M) a "this looks like UC-…, merge?" nudge; (M) attach-a-file
  first-class in the form (Blob) rather than paste-URL only.
- **Demands** — *Gap:* **defaults to `scope=mine`** keyed on the session email, so a
  fresh operator sees "no demands" while the board is full — reads as broken.
  *Ideas:* (S) default to "All" when "mine" is empty, or show "0 of N — switch to
  All"; (S) persist the last scope; (M) saved views/filters.
- **Portfolio Board** — *Gap:* value KPIs only for `view_all`; no per-column WIP or
  aging heatmap. *Ideas:* (S) stage-age color on cards; (M) WIP limits per stage
  with a warning; (M) CSV export of the current filtered view.
- **Needs Attention** — *Gap:* it's the board route, not a dedicated queue; only
  meaningful when a case has an unreadable `## State`. *Ideas:* (S) a real
  `/attention` view listing `needsAttention` + stalled (>30d) with the reason;
  (M) one-click "open the offending section".

### Analyse & value
- **Analyst** — *Gap:* offline replies are helpful but the tool palette isn't
  visible to the user (they can't see what the analyst *can* do). *Ideas:* (S)
  surface the resolved tool list + the new gate-readiness tool as suggested
  prompts; (M) "explain this case" one-click that runs archetype + gate-readiness.
- **Requirements** — *Gap:* lists cases with `requirements.md` but there's no
  coverage signal (which epics lack NFRs / acceptance criteria). *Ideas:* (M) a
  requirements-completeness score per case using the `nfr-catalog` +
  `acceptance-criteria` skills; (S) "generate stories from the problem" shortcut.
- **Persona Analyst** — *Gap:* cohorts are requestor-derived only. *Ideas:* (M)
  cluster by domain × archetype, not just requestor; (S) show each persona's open
  demand count and average dwell.
- **Implementation Analysis** — *Gap:* workload-vs-value is a static 2×2; no
  capacity input. *Ideas:* (M) a team-capacity slider that flags over-commit; (S)
  quadrant labels ("quick wins / big bets / fill-ins / money pits").
- **Value Cockpit** — *Gap:* correctly refuses to sum pipeline+committed+realized,
  but there's no time series. *Ideas:* (M) realized-value trend over quarters; (S)
  per-lane value split; (S) "value at risk" from cases stalled before G3.
- **Business Case Simulation** — *Gap:* strong engine, but assumptions are entered
  ad hoc. *Ideas:* (S) pre-load assumptions from the case's `business-case.md`;
  (M) save a simulation back as a draft section via PR.
- **Value Review** — *Gap:* aliased to `/analysis`; no dedicated variance view.
  *Ideas:* (M) a real variance page: projected (at G3) vs realized (at G7) per case.

### Portfolio & steering
- **Use-case Funnel** — *Gap:* shows conversion/dwell but not *why* cases die.
  *Ideas:* (M) kill-reason taxonomy on the funnel; (S) cohort funnel by intake month.
- **Triage** — *Gap:* classification is manual; the `demand-classification` skill
  isn't offered inline. *Ideas:* (S) suggest a lane from the keyword classifier
  with a one-click accept; (M) bulk-triage the S1 column.
- **Backlog / Roadmap / Digital Champions** — *Gap:* **promised on the launchpad
  but `disabled:true`, routing to `/board`.** *Ideas:* (M each) Backlog = a
  prioritized, drag-orderable S2 list; Roadmap = gates on a timeline; Champions =
  per-plant portfolio pivot (the data already exists in the rows).

### Build & deliver
- **Agentic PoC Builder** — *Gap:* the one build-stage tool, but it reads only the
  frozen `SEED_ROWS` (`app/api/poc/route.ts`), so it can't act on a real funnel
  case; the `/uc/<id>` page even shows it as "soon". *Ideas:* (M) point it at
  `readDemand(id)`; (L) generate a real repo + spec artifact via PR.
- **Handovers** — *Gap:* records exist but no "handover readiness" check.
  *Ideas:* (S) reuse the new gate-readiness tool for G7 (value owner survives);
  (M) a handover checklist artifact from `templates/handover.md`.

### Govern & operate
- **Skills & Playbooks catalog** — *Gap:* excellent, but no "what uses this" back-
  reference or health per entry. *Ideas:* (S) show which playbooks reference a
  skill; (M) a per-entry "last validated" and broken-frontmatter warning.
- **Categories** — *Gap:* editable only with KV; silently read-only otherwise.
  *Ideas:* (S) a banner explaining read-only mode and how to enable it.
- **Skill Library** — *Gap:* import surface is present; provenance of imported
  skills isn't shown. *Ideas:* (S) show source URL + import date on each imported
  skill; (M) a "diff against upstream" for re-import.
- **Agent Traces** — *Gap:* `disabled:true`; runs aren't replayable in-app yet
  though `lib/agent/trace.ts` exists. *Ideas:* (L) a `/traces` list + single-run
  replay view.
- **Review Digest** — *Gap:* works; email optional. *Ideas:* (S) show the next
  scheduled digest time and a "send me a test" button (guarded).
- **Configuration** — *Gap:* very good already. *Ideas:* (S) a top-level
  "readiness score" (n/8 integrations wired) and deep links to each setup doc.
- **Specification** — *Gap:* the `docs/` spec is the backbone but is `disabled:true`
  and not surfaced in-app. *Ideas:* (M) an in-app `/docs` reader rendering the
  markdown spec (the app already renders markdown everywhere else).

---

## 5. New-tool sparks (things the portal doesn't have yet)

Each names the problem and the seam it slots into (all additive — no core change).

1. **Gate-readiness checker** *(agent tool + playbook)* — "is this case ready for
   its next gate, and what's missing?" **Shipped this cycle (§7).** Next: a card on
   `/uc/<id>` and a column badge on the board.
2. **Duplicate-demand detector** *(agent tool, `view_board`)* — cluster the funnel
   by problem similarity and flag likely duplicates before triage. Seam: one file
   in `lib/agent/tools/` reusing `intake/similar`.
3. **Portfolio brief generator** *(playbook)* — a weekly one-page markdown brief
   (new intake, gate movements, stalls, value delta) drafted as a PR to a
   `briefs/` folder. Seam: playbook + existing funnel aggregates.
4. **Stall/SLA sentinel** *(agent tool, read-only)* — surface cases past their
   stage SLA with a suggested nudge; complements the digest. Seam: agent tool over
   `queryFunnel` + `lib/stages` dwell.
5. **Requirements-completeness scorer** *(skill + tool)* — score a case's
   `requirements.md` for NFR/acceptance coverage. Seam: reuse `nfr-catalog`,
   `acceptance-criteria` skills.
6. **Kill-recommendation assistant** *(agent tool, draft)* — for stalled low-heat
   cases, draft a defensible kill rationale for the forum to decide (never decides
   — constraint #2). Seam: agent tool, `draft` capability.
7. **Value-at-risk view** *(launchpad tile)* — pipeline value sitting in cases
   stalled before G3, i.e. value that will evaporate if not acted on. Seam: one
   launchpad entry + a page over existing value data.
8. **In-app spec reader** *(launchpad tile)* — render `docs/` inside the portal so
   governance is one click from every tool. Seam: one tile + a markdown route.

---

## 6. Prioritized backlog (value × effort)

Ranked for the next weekly batch. "Shipped" items are this cycle's quick wins.

| # | Item | Value | Effort | Why now |
|---|---|---|---|---|
| — | Seed a demonstrable funnel (7 UCs, S1→S8) | ★★★★★ | M | **Shipped §7** — unblocks every other view. |
| — | Gate-readiness agent tool + playbook | ★★★★☆ | S | **Shipped §7** — the owner's daily question. |
| 1 | `/demands` default-scope fix (mine→all when empty) | ★★★★☆ | S | Removes a "looks broken" first impression. |
| 2 | Gate-readiness card on `/uc/<id>` + board badge | ★★★★☆ | M | Surfaces the shipped tool where owners work. |
| 3 | Wire Digital Champions (per-plant pivot) | ★★★★☆ | M | Data already exists; promised tile. |
| 4 | Wire Backlog (orderable S2 list) | ★★★★☆ | M | The missing steering step between triage and roadmap. |
| 5 | PoC builder → real funnel cases | ★★★★☆ | M | Reconnect the one build tool to the funnel. |
| 6 | Needs-Attention as a real queue | ★★★☆☆ | S | Turns a promise into a working triage aid. |
| 7 | Duplicate-demand detector | ★★★☆☆ | M | Keeps the funnel clean as intake scales. |
| 8 | Value-at-risk view | ★★★☆☆ | S | Cheap, and it drives forum urgency. |
| 9 | In-app spec reader | ★★★☆☆ | M | Governance one click from every tool. |
| 10 | Requirements-completeness scorer | ★★★☆☆ | M | Raises artifact quality before G3. |

---

## 7. Shipped this cycle

Two quick wins, both at the documented additive seams — zero core change, CI
`guard-no-merge` untouched, `npm run check` green (55 files / 429 tests, build OK).

### 7a. A demonstrable demo funnel — 7 authored use cases (S1→S8)
Real markdown demand records under `demands/<UC-ID>/` (READMEs in the exact
`buildDemand` shape, so they parse and round-trip identically), spanning stages
S1→S8, all lanes, three plants (DE-ALD, SK-PUC, ALL), one parked case, and four
with a `business-case.md` (three indicative → pipeline, one realized). Two carry
`requirements.md` + `analysis.md`.

Observed effect (live): Board `ACTIVE 0 → 6`; Value Cockpit `PIPELINE 0 € →
510.000 €` + a realized bucket; Funnel, Analysis, Personas, Triage, Requirements
all populated; **`/uc/UC-2026-0041` `404 → 200`** with a full detail page. This is
literally the weekly "build use cases" cadence, expressed as the portal's own
system of record.

Cases: `UC-2026-0041` scrap attribution (S4), `-0042` tender copilot (S3), `-0039`
energy baseline (S3), `-0045` shift handover (S2), `-0044` tool-wear detection
(S1), `-0051` vendor onboarding (S2, parked), `-0033` cause-code harmonization
(S8, realized €71k).

### 7b. `gate-readiness` — a new read-only agent tool
`lib/agent/tools/gate-readiness.ts` (+ test, + `playbooks/gate-readiness.md`,
+ one line in `lib/agent/registry.ts`). Answers "is this case ready for its next
gate, and what's missing?" It reuses the portal's single gate authority
(`canOpenGate`) for the verdict and additionally enumerates every criterion for
the next gate as a met/missing/n-a checklist — the full picture, not just the
first blocker. Bound to `draft`; it opens nothing, passes no gate (constraint #2
holds — registration would throw otherwise). Never throws on malformed input
(returns a "fix the state first" report). 7 unit tests cover ready / blocked /
missing-predecessor / G5-baseline / unreadable / terminal.

---

## 8. Next week (proposed batch of 5)

Backlog #1–#5: `/demands` scope fix (S) → gate-readiness on `/uc/<id>` + board
badge (M) → Digital Champions per-plant pivot (M) → Backlog orderable list (M) →
PoC builder on real funnel cases (M). Each is additive and independently
shippable, keeping the weekly cadence honest.
