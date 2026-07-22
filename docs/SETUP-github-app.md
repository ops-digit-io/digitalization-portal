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
GITHUB_APP_INSTALLATION_ID=<installation id>
GITHUB_ORG=<your org login>
# the .pem contents; escape newlines as \n if your platform needs single-line values
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
```

`lib/git/index.ts#getGitHost` switches to the live `GitHubHost` automatically once
all four are present (`hasGitHubCredentials`). No code change, no redeploy logic —
same pattern as the model key.

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

## What stays true regardless

- The App can create repos and open PRs; it has **no way to merge** — the
  `GitHost` interface has no merge method.
- The builder runs under the invoking user's authority (`create_uc` to scaffold,
  `draft` to build the artifact); a session without them is refused.
