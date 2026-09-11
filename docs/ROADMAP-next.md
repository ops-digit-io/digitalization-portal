# ROADMAP — the N-series (platform, not model)

The build plan in [`BUILD.md`](./BUILD.md) numbers the original specification
M0–M10. Those numbers are spent; this file is the **N-series**, and it renumbers
nothing. It covers the next ten milestones that add **no new model capability** —
plumbing, surfaces, schedules and controls. The features that add model
capability are named in §N-out and planned separately, so that neither plan has
to wait on the other.

The boundary is deliberate and worth stating precisely, because two milestones
here look like AI work and are not:

- **N1 (traces)** and **N2 (approvals)** are the *governance* of model use — a
  record of what a run did, and a queue where a prepared action waits for a
  human. Neither asks a model anything. They exist because the autonomy ladder
  (`lib/org/autonomy.ts`) has five rungs and the portal can currently operate
  three of them: nothing persists the evidence that would justify a promotion,
  and nothing holds an action that is waiting for a yes.
- **N5 (inbound intake)** and **N10 (standing jobs)** carry existing AI features
  to new triggers. The channel and the schedule are the deliverable; the model
  path they hand to is already built and unchanged.

## The constraints still bind

All eight constraints in `BUILD.md` hold for every milestone below. Three are
load-bearing often enough to call out where they land:

| Constraint | Where it lands in this plan |
|---|---|
| #1 no route/tool/function merges a PR | N2 (an approval prepares; a human merges), N7 (the forum exports PR bodies, never merges) |
| #2 no agent tool passes a gate | N2 — a proposal whose action is a gate or a merge must be **refused at creation**, the way `ToolRegistry.register` refuses a gate-capable tool |
| #6 no per-requester analytics | N1 and N8 — a trace is an audit record of a *run*, never a per-person metric; the launchpad is shaped by capability, never by who clicked what |

Everything degrades the way the rest of the portal degrades (`MAP.md §5`): with
no KV, no email, no webhook and no model key, each milestone still renders and
**says which state it is in** rather than pretending.

## Summary

Size is relative, not a schedule: **S** = one contained pull request; **M** =
two or three; **L** = a new store plus a surface plus its tests.

| N | Deliverable | Size | Depends on | Status |
|---|---|---|---|---|
| N1 | Agent run traces, persisted, at `/admin/traces` | M | — | planned |
| N2 | Approval inbox — the `execute-with-approval` rung becomes operable | L | N1 | planned |
| N3 | Portal-wide record search behind ⌘K | M | — | planned |
| N4 | Channel layer — outbound beyond email (Teams / Slack / webhook) | S | — | **built** |
| N5 | Inbound intake channel — a demand can arrive by mail | L | N4 | planned |
| N6 | Proactive nudges — gate-readiness and landscape drift in the digest | M | N4 | planned |
| N7 | Forum mode — the decision agenda that ends in merged PRs | M | N6 | planned |
| N8 | Role-shaped launchpad and an honest tile lifecycle | S | — | **built** |
| N9 | Spend controls — per-feature caps on the meter that already counts | M | — | planned |
| N10 | Standing jobs — weekly change brief, scheduled sweep with a delta | M | N4, N9 | planned |

**Phase 1 — the governance backbone (N1, N2).** The ladder is the framework's
stated payoff and the portal cannot climb it. Everything else is easier once a
run leaves a record and a proposal has somewhere to wait.

**Phase 2 — reach and flow (N3, N4, N5, N6).** Capture and navigation. This is
where the portal stops being a place people must remember to visit.

**Phase 3 — steering and operations (N7, N8, N9, N10).** The forum, the front
door, the budget, and the jobs that run whether or not anybody remembers them.

---

## N1 — Agent run traces, persisted

**Why now.** `lib/agent/trace.ts` already records everything worth keeping —
every step, the tools offered, and the tools **withheld with their reason**. But
`app/api/agent/route.ts` returns the trace inline and nothing stores it, which is
why the Agent Traces tile in `lib/launchpad.ts` still carries `disabled: true`.
FR-6.5 says traces are replayable; today they survive one HTTP response.

**What.**

- A trace store on the pattern the usage meter already proves
  (`lib/usage-meter.ts`): day-buckets in KV, a `traces:days` index, a retention
  window so the store cannot grow without bound. Writes are fire-and-safe — a
  failed trace write never breaks the run it describes.
- Local mirror for the no-KV case, the way `lib/pending/store.ts` carries a
  `kind: "kv" | "local"`, so a trace survives a dev restart too.
- `/admin/traces` — a list (when, feature, provider, live or offline, steps,
  tokens, outcome) and a detail view that renders the steps and, prominently,
  the **withheld** tools and why. `docs/16-ui.md §16.5` already specifies how a
  trace should read; follow it.
- Every existing recorder call site keeps its recorder. The store is additive.

**Where it attaches.** `lib/agent/trace.ts` · `lib/agent/loop.ts` ·
`app/api/agent/route.ts` · new `lib/agent/trace-store.ts` · new
`app/admin/traces/page.tsx` · `lib/launchpad.ts` (drop `disabled`).

**Exit test.** A live agent run appears at `/admin/traces` with its steps and its
withheld tools; the same run offline appears marked offline. With no KV the page
says it needs a store instead of rendering an empty list. Retention expiry is
unit-tested against a frozen clock.

**Note.** A trace names the session that ran it because an audit record without
an actor is not an audit record. That is the boundary of it: no view ranks,
counts or compares people, and no aggregate is built per user (constraint #6).

---

## N2 — Approval inbox

**Why now.** `lib/org/autonomy.ts` defines rung 3 as *"prepares the real action,
but it waits for your yes"* — and there is nowhere for a prepared action to wait.
Where the action is a git write the pull request is the queue, which is why the
lower rungs work; everything else has no equivalent. This is the single missing
mechanism between the ladder as a concept and the ladder as an operating model,
and it is what makes a rung-4 lane defensible later: a promotion argued from a
month of approved-without-change proposals is evidence, not optimism.

**What.**

- `lib/approvals/` — a typed `Proposal` (lane, department, action kind, the
  action's arguments, a rendered preview, the **basis** in the proposer's own
  words, the trace id from N1, proposed-at, status, decided-by, decided-at, and
  the decision's reason) over a KV-or-local store on the `lib/pending/` pattern.
- **The registration invariant, again.** Creating a proposal whose action is a
  gate pass, a merge, or a kill **throws**, exactly as `ToolRegistry.register`
  throws for a gate-capable tool. The invariant that no tool passes a gate is
  worth nothing if a queue can launder one (constraints #1, #2).
- `/approvals` — the inbox, scoped by capability and lane, each row showing what
  would happen, on what basis, and what it changes. Approve executes the action
  **through the same route handler under the approver's session** (constraint
  #3), never through a privileged path. Reject requires a reason.
- A rejected proposal is kept with its reason. Rejection reasons are the
  cheapest signal the portal will ever collect about where an agent's judgment
  and the department's diverge.
- The lane page shows its own queue depth and its approve/reject history, which
  is the number `canRaiseTo` should eventually be argued from.

**Where it attaches.** `lib/org/autonomy.ts` (`requiresApproval`, `canActOn`) ·
`lib/org/lane-store.ts` · `lib/rbac.ts` (one new capability, `decide_proposal`,
as a `CAPABILITIES` entry plus role references — the documented seam) · new
`lib/approvals/*` · new `app/approvals/page.tsx` ·
`app/api/approvals/[id]/decide/route.ts`.

**Exit test.** A lane at `execute-with-approval` produces a proposal that appears
in the inbox; approving it performs the action and the record shows who approved
it and when; rejecting it stores the reason and performs nothing. Constructing a
proposal whose action is a gate or a merge throws, and there is a test that says
so. A session without `decide_proposal` gets 403 from the decide route, not a
disabled button alone.

---

## N3 — Portal-wide record search

**Why now.** `components/portal/command-palette.tsx` filters `ALL_TILES` and
nothing else, so ⌘K finds the thirty front doors and none of the records behind
them. With the launchpad at its current size, search *is* the navigation.

**What.**

- `/api/search?q=` over a cached index built from `loadCorpusCached()`
  (`lib/mesh-corpus.ts` — already the "open everything once" loader, already
  cached with an in-flight guard, and explicitly not on any page's read path).
  Index the id, the title and a short excerpt per node: demands, engagements,
  tools and systems, personas, champions, skills and playbooks, departments and
  lanes.
- **Visibility is applied server-side**, reusing `lib/visibility.ts` — a
  confidential record must be absent from the response, not hidden by the
  client.
- The palette grows two groups (tools, records), keeps its keyboard model, and
  degrades to today's tile-only behaviour if the index is cold or the request
  fails.
- Lexical matching only. Ranking by embedding belongs to the AI series (§N-out)
  and this milestone must be useful without it.

**Where it attaches.** `components/portal/command-palette.tsx` ·
`lib/mesh-corpus.ts` · `lib/visibility.ts` · new `lib/search.ts` ·
`app/api/search/route.ts`.

**Exit test.** A demand id, an engagement slug, a tool name and a persona each
resolve to their page from ⌘K. A confidential demand is returned for a session
with `view_all` and absent — not merely unrendered — for one without. A cold
index answers within the same request rather than erroring.

---

## N4 — The channel layer — BUILT

**Why now.** `lib/notify/index.ts` is a clean `Notifier` interface with exactly
one implementation, an HTTP email API. Manufacturing organisations do not read
email at the line, and the weekly digest is the portal's only outbound voice.

**What.**

- `getNotifiers()` returning every configured channel rather than
  `getNotifier()` returning one, with the existing contract preserved: a send
  never throws out of the notifier, failures are counted, the cron stays green
  and idempotent.
- A webhook notifier (Teams / Slack incoming webhook shape, no SDK, `fetch`
  only) as the second implementation — one file, exactly as the interface
  intended.
- `/settings` reports each channel's configured state, matching how
  `lib/config-status.ts` reports the rest.

**Where it attaches.** `lib/notify/index.ts` · `app/api/cron/digest/route.ts` ·
`lib/config-status.ts` · `.env.example`.

**Exit test.** With a webhook URL configured the weekly digest posts to it and
emails; with neither configured the digest page still works and the cron returns
`notified.sent: 0` without failing. A 500 from one channel does not stop the
other.

**As built.** `getNotifiers()` returns every configured channel and
`sendDigestEverywhere()` runs them in order, each absorbing its own failure. The
webhook's payload shape is detected from the URL (`hooks.slack.com` → Slack's
`{text}`; `logic.azure.com` / `webhook.office.com` → an Adaptive Card in a Teams
Workflows envelope), overridable with `DIGEST_WEBHOOK_FORMAT` when a gateway
hides the provider. One decision worth recording beyond the plan: **a shared
channel receives the team digest only.** Per-person nudges are not posted to a
room — "Jane has four demands needing review" is a statement about a person in
front of an audience, and `MAP.md §4`'s rule is that a finding is about the
organisation's work. The nudge goes by email to the one person who can act on
it. The result never echoes the webhook URL, which carries the secret.

---

## N5 — Inbound intake

**Why now.** The only crons are `flush` and `digest`; there is no way into the
portal except the portal. Demand capture dies at "go to the portal and fill in a
form", and the demands that never get captured are exactly the ones from the
people furthest from the portal.

**What.**

- `POST /api/inbound/email` — a provider-agnostic inbound webhook (Resend,
  Mailgun, or an MS Graph subscription; the body shape is normalised at the
  edge), authenticated by a shared secret and a sender-domain allowlist.
- The message becomes a demand draft in the **existing** interim buffer
  (`lib/pending/`), with the message id as the `dedupKey` — so the same mail
  delivered twice produces one demand, which the buffer's dedupe already
  guarantees.
- Attachments through `lib/attachments.ts`, with the same size and type limits
  the form path applies.
- A reply to the sender: the id it was captured as, its lane if it could be
  classified, and the demands it looks similar to
  (`lib/funnel/similarity.ts`). Where classification is unavailable — no model
  key, or a failed call — the demand lands as **needs triage** rather than not
  landing. The channel is the deliverable here; the classification path is the
  one that already exists.
- The demand records the channel it arrived on, so the funnel can later answer
  which channels actually produce demand.
- External text is wrapped before it reaches any model (`lib/agent/wrap.ts`,
  constraint #5). Inbound mail is untrusted content by definition — this is the
  second place in the codebase, after the scout, where injection is a live
  threat rather than a hypothetical one.

**Where it attaches.** `lib/pending/service.ts` · `lib/intake-agent.ts` ·
`lib/attachments.ts` · `lib/agent/wrap.ts` · new `app/api/inbound/email/route.ts`
· `lib/notify` (for the reply, via N4).

**Exit test.** The same message posted twice creates one demand. A mail-borne
demand appears on the board with its channel recorded and its similar demands
listed. With no model key the demand still lands, marked needs-triage. A request
with a bad secret or an unlisted sender domain is rejected before anything is
parsed.

---

## N6 — Proactive nudges

**Why now.** `lib/gates.ts` and the `gate-readiness` tool can already say "G3 is
passable except for the value owner", and nothing says it to anybody. The digest
flags stalls and overdue reviews; it does not flag the *good* news, which is the
kind people act on immediately. Meanwhile the consolidated tool register carries
lifecycle, owners, criticality and cost, and nothing watches those fields decay.

**What.**

- A `gate_ready` reason in `lib/digest/rules.ts`, computed from the same gate
  enforcement the button uses, naming what remains. Pure, injected `now`,
  unit-tested against fixtures like the rest of that module.
- `lib/otx/drift.ts` — a pure rules module over the register: a tool with no
  business or IT owner; a `sunset` lifecycle with active use cases attached; a
  high-criticality tool with no owner or no recorded annual cost; rows that
  parse with `needsAttention`. Findings are per row, each carrying its reason in
  plain words.
- Both routed into the existing digest and out through N4's channels. **Surface,
  don't enforce** — the digest's stated posture (`docs/05-lanes-and-triage.md`)
  is not weakened by this milestone.

**Where it attaches.** `lib/digest/rules.ts` · `lib/digest/service.ts` ·
`lib/gates.ts` · `lib/otx/toolscape.ts` · `lib/otx/consolidate.ts` · new
`lib/otx/drift.ts` · `app/digest/page.tsx`.

**Exit test.** A use case whose G3 prerequisites are all present is flagged
`gate_ready`; one missing a value owner is flagged with that item named. A
sunset tool with two live use cases appears in the drift section with both named.
Every new rule is deterministic against a frozen `NOW`.

---

## N7 — Forum mode

**Why now.** Gates pass in a meeting. The portal has the readiness, the value
figures and their confidence states, and the PR machinery — and the meeting still
runs off somebody's screenshare, producing minutes that then have to be turned
back into portal actions by hand.

**What.**

- `/digest/forum` — the agenda: every item that is decision-ready, each with its
  readiness verdict from `lib/gates.ts` (passable, or blocked with the reason),
  its value band **wearing its confidence state** (constraint #8 — an indicative
  figure must never render as committed), and its history since the last forum.
- Per item, a prepared pull-request body for the decision, ready to open.
  Nothing merges (constraint #1) — the forum prepares, `CODEOWNERS` decides.
- An exportable markdown record of what was decided, which is the minutes,
  generated from the decisions rather than transcribed into them.

**Where it attaches.** `lib/digest/service.ts` · `lib/gates.ts` ·
`lib/value.ts` · `components/portal/gate-action.tsx` ·
`components/portal/value-figure.tsx` · new `app/digest/forum/page.tsx`.

**Exit test.** The agenda contains only items that are passable or blocked with a
stated reason — never an item whose state could not be read. An indicative value
renders as indicative on the agenda and in the export. The exported markdown
names every decision and its PR.

---

## N8 — Role-shaped launchpad — BUILT

**Why now.** `lib/launchpad.ts` is at thirty-five tiles across eight
categories, rendered identically for every session. A requester meets the same
wall as an administrator. And `disabled: true` currently means "drafted, not
built" with nothing behind it — a promise with no plan attached.

**What.**

- Each tile declares the capability it needs. Home groups by what the session
  can actually do (`can()`), showing the rest muted rather than hiding it — a
  portal that silently omits things teaches people it is incomplete.
- `disabled` gains a reason and a milestone reference, so a muted tile says
  *why* and *when* instead of "soon".
- Shaped by capability, never by usage (constraint #6).

**Where it attaches.** `lib/launchpad.ts` · `app/page.tsx` ·
`components/portal/tile.tsx` · `lib/rbac.ts` · `lib/i18n.ts` (labels for any new
copy, all ten locales — the coverage guard will insist).

**Exit test.** A requester session sees intake and board first and no admin
tiles among its actionable ones. A test asserts every tile declares a
capability, so a new tile cannot be added without deciding who it is for. The
i18n coverage guard passes.

**As built.** `capability` is a REQUIRED field on `Tile`, so TypeScript refuses a
tile nobody has decided the audience for, and `lib/launchpad.test.ts` refuses one
whose capability is not real — plus asserts no tile is unreachable by every
shipped role, which catches a wrong capability as well as a missing one.
`launchpadFor(allowed)` takes a predicate rather than a session, so the shaping is
pure and tested without an auth context; `app/page.tsx` became a server component
so `can()` runs server-side and no capability list is shipped to the browser.
`disabled: true` gave way to `planned: { milestone }`, so a muted tile names the
milestone that plans it instead of saying "soon". Locked and planned are rendered
as the different facts they are. The demo session holds `admin`, so the demo
looks exactly as it did.

---

## N9 — Spend controls

**Why now.** `MAP.md §6` says per-feature caps come "when the numbers say which
to cap". The meter has been running; the numbers exist. Today's only lever is
`AGENT_TOOLS=off`, which is all-or-nothing, and the model picker, which trades
capability everywhere at once.

**What.**

- Per-feature daily caps, stored in KV beside the model choice
  (`lib/model-settings.ts` is the precedent: an admin setting, no redeploy),
  read by `lib/api/throttle.ts` in addition to the per-user window it already
  applies.
- **A breached cap falls to the deterministic floor, it does not error.** Every
  AI feature in this portal has a rule-based path (`MAP.md`, decision 2); a cap
  is a reason to take it, and the header says so — the same sentence the offline
  state already uses.
- `/admin/usage` gains the controls beside the numbers that justify them, plus a
  projection of the month at the current run rate.

**Where it attaches.** `lib/api/throttle.ts` · `lib/ratelimit.ts` ·
`lib/usage-meter.ts` · `lib/model-settings.ts` · `app/admin/usage/page.tsx` ·
`app/api/usage/route.ts`.

**Exit test.** With a feature capped at zero, that feature returns its rule-based
answer and the response is labelled rule-based; no other feature is affected. The
cap survives a restart. With no KV, caps are reported as unavailable rather than
silently absent.

---

## N10 — Standing jobs

**Why now.** Git is the system of record, so "what changed this week" is a diff
and costs nothing to compute — and nobody computes it. `/api/scout/sweep` is
POST-only by a deliberate and correct decision (a sweep costs a paid call), but
"only when somebody remembers" is not the only alternative to "on every page
load".

**What.**

- A weekly **change brief**: commits across `du-demands` and `du-processes`
  since the last run, grouped by demand and by kind of change, appended to the
  digest. Entirely deterministic — the diff list *is* the brief, with no model
  in the path.
- A scheduled scout sweep on a bounded budget (N9's caps are what make this
  safe), reporting a **delta**: what is new since the last sweep, what moved,
  what is unchanged. Fit is recomputed from the portal's own registry as it
  already is (`lib/scout/fit.ts`) — nothing here adopts anything, and a
  candidate still lands as an `assess` row in a pull request a human merges.
- Both crons in `vercel.json`, both authenticated by `CRON_SECRET`, both
  idempotent, on the pattern `app/api/cron/digest/route.ts` sets.

**Where it attaches.** `vercel.json` · `lib/git/*` · `lib/digest/service.ts` ·
`app/api/scout/sweep/route.ts` · new `app/api/cron/brief/route.ts` · new
`app/api/cron/scout/route.ts`.

**Exit test.** The brief lists the week's commits with no model call and no key
configured. A scheduled sweep respects its cap, reports its delta against the
previous sweep, and adopts nothing. Running either cron twice produces one
result, not two.

---

## §N-out — deliberately not in this plan

These add model capability and belong to a separate series, planned on its own
terms. They are listed so the boundary of this plan is a decision rather than an
omission:

- **Semantic dedupe at intake** — embeddings over the mesh corpus, with today's
  lexical similarity as the floor.
- **A `mesh-query` agent tool** — retrieval with citations, replacing the mesh
  *digest* the analyst currently gets in its prompt. One file plus one line in
  `lib/agent/registry.ts`.
- **Cross-plant reuse recommender** — on classification, find the S5+ use case
  at another plant and propose adopting it rather than building again.
- **Evals for the governed prompts** — fixture-based, offline, in CI:
  classification, refusal, and injection wrapping (`docs/BUILD.md` asks for
  these at §9.4; `library-integrity.test.ts` currently checks only that
  references resolve). This one is the prerequisite for the rest: it is what
  makes "edit a playbook in `du-agent-registry`, no deploy" safe as well as
  possible.

## Definition of done

Per milestone, in addition to its exit test — inherited unchanged from
`BUILD.md`, because a plan that relaxes them is a different plan:

- No merge call anywhere in the codebase.
- No gate tool in any agent tool array.
- New routes call `can()` with the correct capability and context.
- Interface copy follows `docs/16-ui.md §16.5`; new copy is translated in all
  ten locales.
- Keyboard operable; focus visible; works at 360px width.
- The generated maps regenerate clean (`node scripts/gen-docs.mjs`).
