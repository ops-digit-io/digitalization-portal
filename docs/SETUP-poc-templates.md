# Setup — the PoC template repositories (`du-template-*`)

The PoC builder scaffolds a **runnable** proof, not just markdown: pick a stack and
the new `uc-*` repository gets a Streamlit or Dash app, a FastAPI service, an HTML
mockup, a dashboard, a Grafana model, or a Jupyter analysis under `poc/`.

That works out of the box — the file sets are generated in-app (`lib/poc/templates.ts`),
offline, no external repos required. This document is the **optional** upgrade: back
each stack with a real GitHub **template repository** so a scaffolded case is created
via GitHub "generate from template" (browsable, forkable provenance) instead of files
written directly.

## The stacks and their template repos

| Stack (picker) | Template repo | What it lays down under `poc/` |
|---|---|---|
| Streamlit app (Python) | `du-template-streamlit` | `app.py`, `requirements.txt`, `data/sample.csv`, `.streamlit/config.toml` |
| Dash app (Python) | `du-template-dash` | `app.py`, `assets/style.css`, `requirements.txt`, `data/sample.csv` |
| FastAPI service (Python) | `du-template-fastapi` | `main.py`, `tests/test_main.py`, `Dockerfile`, `requirements.txt` |
| HTML mockup (from requirements) | `du-template-html-mockup` | `index.html` (features read from the demand's requirements) |
| Self-contained HTML dashboard | `du-template-html-dashboard` | `index.html` (inline CSS/SVG) |
| Grafana dashboard (JSON) | `du-template-grafana` | `dashboard.json`, `provisioning/dashboards.yaml` |
| Analytics project (Cookiecutter Data Science) | `du-template-analytics` | full CCDS layout: `data/{raw,processed,…}`, `analysis/` package, `notebooks/`, `Makefile`, `pyproject.toml` |

The template files carry **neutral placeholders** (`UC-XXXX-XXXX`, `Use-Case PoC`).
GitHub copies a template verbatim, so the portal overlays the case's real README,
PoC spec, and seeded files on top after generating the repo.

## 1. Create + populate all seven, in one command (recommended)

Once the portal's GitHub App has **Administration: write** on the org (see below), it
can create the repos itself — flagged as templates and populated in one run:

```bash
# where the portal's App secrets are set (its deployment env, or exported locally):
GITHUB_APP_ID=…  GITHUB_APP_PRIVATE_KEY="…"  GITHUB_ORG=ops-digit-io \
  node scripts/create-template-repos.mjs        # add --private for private repos
```

This uses the **portal's own App** (not the Claude integration, which has no
org-repo-creation scope), creates each `du-template-*` repo with `is_template: true`,
and pushes the file set from the single source of truth (`lib/poc/templates.ts`, so
the in-app fallback and the repos never drift). Skip to step 3.

### Granting the permission

Org → **Settings → GitHub Apps →** the portal's App → **Permissions**:
**Organization permissions → Administration → Read & write** (this is what authorises
`POST /orgs/{org}/repos`). Save, then an org owner **approves** the pending request.
Also ensure the installation's **Repository access** is **All repositories** so the
new repos are writable immediately.

## 2. …or create them by hand (no App admin rights)

If you'd rather not grant the App that scope, materialize the content and push with
your own credentials:

```bash
node scripts/materialize-templates.mjs --out template-repos
cd template-repos
for d in du-template-*; do
  gh repo create "ops-digit-io/$d" --public --source "$d" --push --description "PoC template · $d"
  gh repo edit "ops-digit-io/$d" --template
done
```

## 3. Confirm each repo is a template

The scripts above set it, but verify: **Settings → General → "Template repository"**
is checked. Generate-from-template (`POST /repos/{owner}/{repo}/generate`) refuses a
source that is not flagged a template (422). Also add each repo to the App
installation (Contents: read, Metadata: read) so the portal can read it.

## 4. Turn the path on

Set two environment variables for the portal:

```
GITHUB_ORG=ops-digit-io
POC_USE_TEMPLATE_REPOS=1
```

With these set, scaffolding a PoC creates the `uc-*` repo **from** the matching
template repo, then overlays the seeded files — the wizard shows a **“from template
repo”** badge. Unset (the default) writes the same files directly: identical output,
no template repos required.

## What stays true regardless

- **Offline-first.** Every stack runs against its own committed `data/sample.csv` —
  no network, so a reviewer can `pip install -r requirements.txt && streamlit run
  app.py` on a plane. Template repos are provenance and convenience, never a
  dependency.
- **One source of truth.** Edit a stack in `lib/poc/templates.ts`, re-run
  `materialize-templates.mjs`, and push — the app fallback and the repos move together.
- **The portal still never merges.** The scaffold and the evidence PR are drafts; a
  human reviews and merges.
