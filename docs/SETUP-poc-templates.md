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
| Jupyter analysis (Python) | `du-template-jupyter` | `analysis.ipynb`, `requirements.txt`, `data/sample.csv` |

The template files carry **neutral placeholders** (`UC-XXXX-XXXX`, `Use-Case PoC`).
GitHub copies a template verbatim, so the portal overlays the case's real README,
PoC spec, and seeded files on top after generating the repo.

## 1. Generate the content from the single source of truth

The template content lives in `lib/poc/templates.ts` (so the in-app fallback and the
template repos never drift). Materialize it to a local directory:

```bash
node scripts/materialize-templates.mjs --out template-repos
#   → template-repos/du-template-streamlit/…, du-template-dash/…, etc.
```

## 2. Create the repos and push (the App can't create org repos)

The portal's GitHub App integration lacks org repo-creation rights — creating a repo
under the org returns `403 Resource not accessible by integration` (the same wall as
`du-specifications`). So create the repos yourself, then push the generated content:

```bash
cd template-repos
for d in du-template-*; do
  gh repo create "ops-digit-io/$d" --private --source "$d" --push \
    --description "PoC template · $d"
done
```

(or create each in the GitHub UI and `git push` the folder). To let the App **read**
them for generation, add each repo to the same GitHub App installation the PoC
builder uses (Contents: read, Metadata: read).

## 3. Mark each repo as a template

For every `du-template-*` repo: **Settings → General → check "Template repository"**.
Generate-from-template (`POST /repos/{owner}/{repo}/generate`) refuses a source that
is not flagged a template (422), so this step is required.

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
