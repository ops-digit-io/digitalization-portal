# Setup — the specifications repo (`du-specifications`)

The portal's specification documents are **not** in this repository. Like the agent
library (`du-agent-registry`) and the artefact templates (`du-templates`), they live
in their own repo — `du-specifications` — and the portal reads them through the
content-repo seam (`lib/content-repo.ts`): live from GitHub when the App is
configured, else a local mirror, else nothing (the `/docs` reader shows an empty
state rather than pretending).

This is the one-time setup that turns the live path on.

## What lives where

**In `du-specifications`** (flat markdown at the repo root): the numbered spec
(`01-portal-spec.md` … `16-ui.md`), `CONTEXT-MESH.md`, `ARCHITECTURE-intake.md`,
`AUDIT-*.md`, `SCALE-intake.md`, `PROCESS-DIGEST.md`, and the review notes.

**Kept in this app repo** (machinery, not method): the generated maps
(`api-map.md`, `pages.md`, `governance.md`), the hand-map (`MAP.md`), and the
operational how-to-run docs (`BUILD.md`, `DEPLOYMENT.md`, `SETUP-github-app.md`,
this file, `VIDEO.md`).

## 1. Create the repo and grant the App access

1. Create `ops-digit-io/du-specifications` (private).
2. Add it to the **same GitHub App** the PoC builder / registry use, so the App can
   read it: App → **Install App** → the org installation → **Repository access** →
   add `du-specifications`. It needs only **Contents: read** and **Metadata: read**
   for the portal to read specs (add **Contents: write** only if you later edit
   specs through the portal).

## 2. Populate it from this repo's history

The specs were removed from this repo but are preserved in git history. From a
checkout of this repo:

```bash
git clone https://github.com/ops-digit-io/du-specifications.git /tmp/du-specifications
node scripts/migrate-specs.mjs --to /tmp/du-specifications
#   (add --ref <commit> to source from a specific commit; it auto-detects otherwise)
cd /tmp/du-specifications
git add -A && git commit -m "Import portal specifications" && git push
```

## 3. Point the portal at it (if the name differs)

The default repo name is `du-specifications`. Override with an env var only if you
named it differently:

```
SPECIFICATIONS_REPO=<your repo name>
# offline/dev mirror location (defaults to a temp dir):
# SPECIFICATIONS_MIRROR_DIR=/path/to/mirror
```

## 4. Verify

- **Live (App configured):** open **Specification** (`/docs`) in the portal — the
  spec list should render, read live from `du-specifications`. `GET
  /api/status?probe=1` reports `content.specifications` reachable.
- **Offline / CI:** `npm run content:pull` mirrors `du-specifications` (alongside
  the registry and templates) into a temp dir; `/docs` then reads the mirror. With
  no App and no mirror, `/docs` shows its empty state — the honest degrade, the same
  as the library and templates.

## What stays true regardless

- The specs are a **read** source for the portal; nothing in the app bundles them,
  so the portal can be forked or handed over without the specification IP.
- The `/docs` reader guards the slug against path traversal (`lib/docs.ts`
  `safeDocSlug`) and reads only flat markdown at the repo root.
