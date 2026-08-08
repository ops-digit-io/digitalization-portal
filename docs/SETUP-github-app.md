# Setup — GitHub App (agentic PoC builder)

The PoC builder creates real `uc-*` repositories and opens pull requests through a
**GitHub App** (a single application identity, `docs/04-rbac.md §4.7`). Until the
App is installed, the builder falls back to a local workspace on disk, so the flow
works before this is provisioned. This guide turns the live path on.

## 1. Register the GitHub App

In your GitHub org: **Settings → Developer settings → GitHub Apps → New GitHub App**.

- **Homepage URL**: your portal URL.
- **Webhook**: set the URL to `<portal>/api/webhooks/git` and a secret (used later
  by the reconciler); you can disable the webhook for the PoC builder alone.
- **Repository permissions** (least privilege for the builder):
  - **Administration**: Read & write — *create repositories*.
  - **Contents**: Read & write — *commit files, create branches*.
  - **Pull requests**: Read & write — *open PRs (never merge)*.
  - **Metadata**: Read-only.
- **Do NOT grant** "Merge" via any workflow. The gate boundary depends on merges
  staying a human act under CODEOWNERS.

Generate and download a **private key** (`.pem`).

## 2. Install it on the org

**Install App** on the organization, scoped to the `uc-*` repositories and the
portal repository. Note the **installation id** from the installation URL
(`.../installations/<id>`).

## 3. Configure the environment (server-side only)

Set these in the deployment (never in the browser bundle — `.env.local`, Vercel
project env, etc.):

```
GITHUB_APP_ID=<numeric app id>
GITHUB_ORG=<your org login>
# the .pem contents; escape newlines as \n if your platform needs single-line values
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
# optional — the installation is auto-discovered from GITHUB_ORG; leave unset
# GITHUB_APP_INSTALLATION_ID=<installation id>
```

`lib/git/index.ts#getGitHost` switches to the live `GitHubHost` automatically once
the **three required** vars are present — `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_ORG` (`hasGitHubCredentials`). The installation id is **optional**: the App
discovers it from the org (`GET /orgs/{org}/installation`), and a stale pinned id
self-heals by re-discovering. No code change, no redeploy logic — same pattern as
the model key.

## 4. (Optional) Model reasoning

Set `ANTHROPIC_API_KEY` (and `ANTHROPIC_MODEL` to override the default) to have the
assistant author specs and artifacts with live reasoning instead of the
deterministic offline generators.

## 5. Verify

- In the portal, open a use case → **Build PoC with agents** → *Scaffold*.
- The step-2 badge should read **GitHub** (not "local workspace"), and the created
  repository and the opened pull request should appear in your org.
- Confirm there is **no merge button** and no automated merge — a human merges the
  PR under CODEOWNERS.

## Troubleshooting — "scaffolding a use-case repo doesn't work"

The scaffold step runs `POST /orgs/{org}/repos`, then commits the scaffold files,
then (on approval) opens a PR. Each precondition below fails in a distinct,
diagnosable way. The route returns the underlying message as an HTTP 500, so read
what the *Scaffold* step actually says.

| Symptom | Cause | Fix |
|---|---|---|
| Step-2 badge says **"local workspace"**; nothing appears in the org | `GITHUB_ORG`, `GITHUB_APP_ID` or `GITHUB_APP_PRIVATE_KEY` unset → `getGitHost()` returns `LocalHost`, writing to `.poc-workspace/` on disk | Set the three required env vars (above) and redeploy. This is the most common "it succeeded but nothing happened". |
| `GitHub App is not installed on org "…" (404)` | The App is not installed on **this** org | App → **Install App** → install on the org, scoped to `uc-*` (and `du-demands`, `du-agent-registry`). |
| `GitHub App JWT rejected (401)` | `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` are from **different** Apps, or the key is truncated / newlines not escaped | Re-copy the numeric App id and the **full** `.pem` from the same App; escape newlines as `\n` if your platform stores single-line values. |
| `403` on repo creation | The App lacks **Administration: write** | Add the permission on the App, then **re-accept** the permission on the org installation (GitHub does not apply new permissions until re-approved). |
| `403` on the commit or PR step | Missing **Contents: write** (commit) or **Pull requests: write** (PR) | Same as above — add the permission and re-accept the installation. |
| `422` on repo creation | A repo of that name already exists | Delete/rename the stale `uc-yyyy-nnnn-slug` repo, or advance a different demand. |
| Repo + PR created, but **no reviewer can approve** (branch protection never satisfied) | CODEOWNERS names `@org/du-triage` etc. because the org wasn't threaded through, **or** the four owner teams don't exist | This build now namespaces CODEOWNERS to `GITHUB_ORG` (see `lib/poc/scaffold.ts`). Also create the teams `du-triage`, `portfolio-forum`, `it-liaison`, `du-value` in the org (`docs/DEPLOYMENT.md §Teams`). |

**Org one-time setup that scaffolding assumes** (beyond installing the App):
- The four CODEOWNERS **teams** above exist in `GITHUB_ORG`.
- Branch protection on `uc-*` `main`: require a PR and CODEOWNERS review; **no**
  app auto-merge and **no** bypass for Apps — the gate depends on merges staying a
  human act.
- Org member privilege that permits the App to create repositories (Administration:
  write on the installation covers this for App-created repos).

A quick way to isolate the layer: hit `GET <portal>/api/status?probe=1` — it probes
the git identity and reports a revoked key or missing installation in the header
instead of surfacing later as the next scaffold failing.

## What stays true regardless

- The App can create repos and open PRs; it has **no way to merge** — the
  `GitHost` interface has no merge method.
- The builder runs under the invoking user's authority (`create_uc` to scaffold,
  `draft` to build the artifact); a session without them is refused.
