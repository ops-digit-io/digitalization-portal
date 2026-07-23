---
name: poc-build
description: Scaffold a use-case repo, draft a PoC spec, and (after approval) build the artifact and open a PR.
skills: [poc-builder]
checkpoints: [approve-spec]
---

# poc-build

Turns a use case into a proof of concept, agentically, with one human checkpoint.
The portal drafts and builds; a human approves the spec and merges the PR. No step
merges.

## Steps

1. **Scaffold** (`create_uc`). Call `start-poc` with the use case id. It creates
   the `uc-*` repository from the templates (README, CODEOWNERS, intake) and
   commits a drafted `poc/spec.md`.
2. **Checkpoint · approve-spec** (human). Present the drafted spec. Do not proceed
   until a human approves it. This checkpoint is enforced server-side, not only in
   the UI — the artifact step refuses an unapproved spec.
3. **Build artifact** (`draft`). On approval, generate the artifact (dashboard /
   app / mockup / report), commit it on a `poc/artifact` branch, and open a pull
   request for review.

## Guarantees

- No tool passes a gate or merges (enforced at tool registration).
- Runs under the invoking user's authority — `create_uc` for the scaffold,
  `draft` for the artifact. A session lacking either is refused with the reason.
- Live GitHub when the App is installed (`docs/SETUP-github-app.md`); a local
  workspace otherwise, so the flow works before the App is provisioned.

## Conversational entry

The assistant offers this as "Build a PoC for <UC-id>". It runs step 1 and links
the user to the wizard for the approval checkpoint (steps 2–3).
