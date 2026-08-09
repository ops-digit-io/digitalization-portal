# Setup — the organization-context repo (`du-organization-context`)

Department OS — the org map behind every demand and process — reads its content
from a dedicated repo, `du-organization-context`, through the same content-repo seam
as the agent library and the specs (`lib/content-repo.ts`): live from GitHub when the
App is configured, else a local mirror (`npm run content:pull`), else the **bundled
worked example** that ships in this repo so `/org` is never blank before the repo is
populated.

This is the one-time setup that turns the live path on.

## What lives where

**In `du-organization-context`** — one folder per department, one markdown file per
section of the grammar (`lib/org/model.ts`), plus the framework:

```
departments/<slug>/00-core/charter.md
departments/<slug>/00-core/strategy.md
departments/<slug>/00-core/objectives.md
departments/<slug>/00-core/service-catalog.md
departments/<slug>/00-core/intake.md
departments/<slug>/00-core/operating-rhythm.md
departments/<slug>/00-core/metrics.md
departments/<slug>/00-core/decision-rights.md
departments/<slug>/00-core/risks.md
departments/<slug>/00-core/handover-contracts.md
departments/<slug>/00-core/standards.md
departments/<slug>/00-core/portfolio.md
departments/<slug>/10-modules/<module>.md   optional (systems-of-record, landscape, …)
departments/<slug>/lanes/<lane>/playbook.md      lane pack — the run, with error paths
departments/<slug>/lanes/<lane>/skills.md        skills, tools, interfaces
departments/<slug>/lanes/<lane>/tasks.md         recurring tasks + templates
departments/<slug>/lanes/<lane>/metrics.md       lane-only metrics
departments/<slug>/lanes/<lane>/agent-brief.md   scope, authority_level, guardrails
framework.md                                the framework itself (read-only in the app)
```

The three rings match the framework: the twelve-file **core** (`00-core/`), the
department-wide **modules** (`10-modules/`), and per-lane **lane packs** (`lanes/<lane>/`)
— where autonomy actually lives. A lane's `agent-brief.md` names its `authority_level`
(one of `read-only → draft → recommend → execute-with-approval → execute-autonomously`),
surfaced as the lane's badge in the app. Raise autonomy one lane at a time.

The `00-core/` and `10-modules/` split follows the framework's own repository layout
(`01-framework.md`). The critical sections that carry the validity contract
(`valid-until`, `verification-method`, `source-of-truth`) are `strategy`, `metrics`,
`decision-rights`, and the `systems-of-record` module.

**Kept in this app repo** (machinery, not method): the grammar (`lib/org/model.ts`),
the scorer (`lib/org/scoring.ts`), the store (`lib/org/store.ts`), and the bundled
seed (`lib/org/seed.ts` — the "Operations Digitalization" worked example).

## The section files

Each core file is plain markdown with a small frontmatter block. The portal scores it
against the grammar, so writing the fields the grammar asks for is what raises a
department's completeness:

- **Freshness (every section):** `owner`, `review-cadence`, `last-verified` in
  frontmatter.
- **Validity (critical sections — `strategy`, `metrics`, `decision-rights`,
  `standards`):** additionally `valid-until`, `verification-method`,
  `source-of-truth`. `last-verified` says when someone looked; validity says whether
  the assumption still holds and how you'd check — an agent acting on an expired
  assumption does so with full conviction, so the portal flags it.

The bundled example is the reference. Copy any section out of it (or read it on
`/org/operations-digitalization`) and adapt.

## 1. Create the repo and grant the App access

1. Create `ops-digit-io/du-organization-context` (private).
2. Add it to the **same GitHub App** the PoC builder / registry use: App →
   **Install App** → the org installation → **Repository access** → add
   `du-organization-context`. It needs **Contents: read** and **Metadata: read** for
   the portal to read it (add **Contents: write** only if you later edit departments
   through the portal).

## 2. Populate it — in the app or from the bundled example

**In the app (easiest).** On `/org`, contributors (anyone with the `draft`
capability) can **+ New department** — it scaffolds a coached charter and opens the
department. Each section has an **Edit** / **Start this section** button with a
live-scoring editor: the completeness score and the missing-criteria backlog update
as you type, and **Save** commits the file. When the GitHub App is configured, saves
commit to `du-organization-context` on `main` (the repo is **created on first save**
if it does not exist yet, so this works without any manual provisioning); without the
App, saves go to the local mirror for development.

**From the bundled example.** The worked example also ships as `lib/org/seed.ts`. To
start the repo from it by hand, create `departments/operations-digitalization/<section>.md`
for each core section using the seed's content, plus `framework.md`. From there, add a
folder per real department and fill its twelve core files — coaching-supported, in
roughly a day.

The order is meant literally (see `framework.md`): one pilot department first, fill
the core, generate the handbook and check it holds, then equip a single lane with its
full pack and raise autonomy there — only then the second lane.

## 3. Point the portal at it (if the name differs)

The default repo name is `du-organization-context`. Override only if you named it
differently:

```
ORGANIZATION_REPO=du-organization-context
ORGANIZATION_MIRROR_DIR=/some/writable/path   # local mirror location (optional)
```

## 4. Mirror it for offline / CI

```bash
npm run content:pull      # clones/updates every content repo, this one included
npm run content:check     # report reachability, change nothing
```

Reachability shows up in `/api/status` under `content.organization`, alongside the
registry, templates and specifications — an unreachable org context surfaces there
rather than later as tools quietly losing the context behind their demands.
