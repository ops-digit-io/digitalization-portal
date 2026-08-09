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
departments/<slug>/charter.md
departments/<slug>/strategy.md
departments/<slug>/objectives.md
departments/<slug>/service-catalog.md
departments/<slug>/intake.md
departments/<slug>/operating-rhythm.md
departments/<slug>/metrics.md
departments/<slug>/decision-rights.md
departments/<slug>/risks.md
departments/<slug>/handover-contracts.md
departments/<slug>/standards.md
departments/<slug>/portfolio.md
departments/<slug>/<module>.md        optional (landscape, systems-of-record, …)
framework.md                           the framework itself (read-only in the app)
```

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

## 2. Populate it from the bundled example

The worked example ships in this repo as `lib/org/seed.ts`. To start the real repo
from it, create `departments/operations-digitalization/<section>.md` for each core
section using the seed's content, plus `framework.md`. From there, add a folder per
real department and fill its twelve core files — coaching-supported, in roughly a day.

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
