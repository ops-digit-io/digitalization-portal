# Scaling the inbound funnel to 14,000 people

**Goal:** the entire inbound demand funnel available to ~14k staff — lean to submit,
streamlined to browse, easy to run. This is a design note grounded in the current
architecture (Git as system of record, `du-demands`, GitHub App, the reconciler
seam, and the `KV_REST_API_*` / `GITHUB_WEBHOOK_SECRET` env already provisioned).

## The core move: split the write path from the read path (CQRS)

Git is the right **system of record** — auditable, governed, PR-based. It is the
wrong **query engine** for 14k concurrent readers. So keep both, separated:

```
          write (governed, low volume)                read (high volume, 14k users)
Requester ──intake──▶ GitHub App ──▶ du-demands ──webhook──▶ reconcile ──▶ PROJECTION ──▶ funnel views
                       (1 identity)     (git SoR)              (index)      (KV / DB)       board/funnel/…
```

- **Writes** go to Git as today (the SoR, the audit trail, CODEOWNERS governance).
- A **webhook** (`push` on `du-demands`, secret already in env) triggers a
  **reconcile** into a **projection store** (Vercel KV / Postgres / edge KV).
- **All read views query the projection**, never the GitHub Contents API. This is
  the single change that makes 14k readers feasible: reads no longer touch GitHub's
  rate limit at all, and they become filterable/paginated.

The reconciler pattern already exists in the codebase (`lib/reconcile.ts`,
`lib/registry.ts` round-trip) — extend it from the registry to the demand funnel.

## 1. Read model — never full-scan the funnel

Today `listDemandRows()` reads *every* case per load (now bounded-parallel, but
still O(N)). At thousands of demands that is too much regardless of concurrency.

- **Project each demand to a row** (id, title, stage, lane, plant, domain, status,
  requester-hash, since, value) in the store, keyed for query.
- **Views query with filter + pagination + search** — board/funnel/value ask the
  store for a page, not the whole set.
- **Scoped default views** keep every page small no matter how big the funnel:
  - **"My demands"** — the default for a requester (their own submissions).
  - **Triage queue** — S1/S2 only, for the triage role.
  - **Plant / lane / domain** slices for champions and the forum.
- Aggregates (funnel counts, value layers) are **pre-computed in the projection**,
  not recomputed by scanning N documents on each request.

## 2. Write path — lean and collision-free

- **One file per demand** (already so) means new captures rarely conflict — distinct
  paths, not one shared file. Keep writing straight to `du-demands` (no gate).
- **⚠ Fix id allocation (correctness blocker at scale).** `nextDemandId()` does a
  read-modify-write: list ids → max+1. Two concurrent captures get the **same id**,
  and `saveDemand` → `putFile` **overwrites** the existing file → *silent data
  loss*. At 14k submitters this will happen. Fix: (a) make new-demand writes
  **create-only** (fail if the path exists) and (b) **retry id allocation** on
  collision, or (c) move to a collision-resistant id (keep `UC-YYYY-` for humans,
  append a short ULID/random suffix, or allocate from an atomic counter in KV).
- **Smooth write spikes** (optional): intake POST enqueues; a worker commits. Keeps
  bursts inside GitHub's write limits and off the request path. Only needed if
  submission spikes are high; the create-only + retry path handles normal load.
- The single GitHub App identity is fine — writes are low-volume and governed;
  it's *reads* that must not go through it.

## 3. Intake UX for a broad, non-expert population

14k people are mostly not analysts and often on the shop floor. Make capture a
60-second act:

- **Chat is the default front door** — one plain question at a time, no lane/gate
  jargon; Form for power users, Markdown hidden for experts.
- **Minimum required fields to submit**: title + problem is enough to enter triage.
  Everything else is *enhanced later* (AI + triage), so friction is near zero.
- **AI does the taxonomy** — `classifyDemand` proposes lane/domain; the enhancer
  sharpens weak input. The requester never needs to understand the model.
- **Mobile-first** — the intake must work on a phone across plants.
- **Localised** — the portal already switches locale; the intake questions and
  labels must be translated for a multi-country workforce.
- **Duplicate detection at capture** — search the projection as they type and
  surface similar existing demands ("Is this the same as UC-…?") so people
  **link/upvote instead of creating duplicates**. This is what keeps a 14k-sourced
  funnel lean rather than flooded.

## 4. Access & identity

- **SSO group = role, no per-user provisioning.** All staff get `requester` via
  `DU-Portal-AllStaff` (already modelled). No 14k-row access table to maintain.
- **Scoped visibility** — a requester sees their own + the portfolio-transparent
  board; confidential stays `view_all` (already in `lib/visibility.ts`).
- **No per-requester analytics** (constraint #6) still holds: "my demands" is a
  self-filter, not surveillance; aggregates never rank individuals.
- **Basic per-user submit throttle** to bound abuse/accidental floods.

## 5. Operations

- With reads served from the projection, **GitHub traffic is writes only** — well
  within the installation rate limit even at 14k users.
- **Webhook-driven freshness**: a push reconciles in seconds; pair with
  `revalidateTag` so cached pages refresh on change, not on a timer.
- **Cache invalidation** is event-based (webhook), so views are fast *and* fresh.
- **Graceful degradation**: if the projection is cold, fall back to a bounded
  GitHub read for a single demand (detail view), never for the full list.

## Prioritised path

1. **Fix the id-allocation race** (create-only writes + retry). Correctness, small,
   do first — it risks data loss today.
2. **Projection + webhook reconcile** into KV, and point board/funnel/value/demands
   at it with filter + pagination. The scale unlock.
3. **"My demands" default view + search + duplicate-at-capture.** The UX unlock for
   a 14k population.
4. **Localised, mobile-first Chat intake as the primary door.**
5. **Write-queue** only if submission spikes exceed the direct path.

Steps 1–3 are what turn "works for a demo funnel" into "works for 14k."

## Implemented so far

The split is built and unit-tested; it is inert-but-ready without KV (local/dev read
git directly), and turns on by setting `KV_REST_API_*` + the webhook.

- **Collision-free ids** — `putFile` create-only (`FileExistsError`) + `saveNewDemand`
  retry; atomic `wx` locally, sha-less PUT (422) on GitHub. (`lib/git/*`, `lib/demands-store.ts`)
- **Read model** — `ProjectionStore` (KV, else null→direct) + `lib/funnel/query.ts`
  (`getFunnelRows`, pure `scope|filter|paginate`, aggregates). All portfolio views
  read through it.
- **Interim write buffer (outbox)** — intake `enqueueDemand` persists to the buffer
  (KV, else a local `.pending-demands/` dir) and returns immediately; it never blocks
  on git. `flushPending` commits buffered demands to git create-only (idempotent) and
  the read model **merges pending rows**, so a capture is visible instantly
  (read-your-writes). (`lib/pending/*`)
- **Freshness & flush** — `POST /api/webhooks/github` (HMAC) reconciles on push;
  `GET/POST /api/cron/flush` (`CRON_SECRET`) drains the buffer to git then reconciles,
  scheduled every minute in `vercel.json`.

**To operate at scale:** provision Vercel KV (`KV_REST_API_*`), set `GITHUB_WEBHOOK_SECRET`
+ a `du-demands` push webhook → `/api/webhooks/github`, and `CRON_SECRET`. No code change.

Remaining: the Phase-4 UX (a "My demands" default view, pagination/search on the pages,
duplicate-at-capture) — the query API is ready to wire.
