# Roles and capabilities

Generated shape mirrored in `lib/rbac.ts`. The portal reads the tables; the prose
is for the humans who maintain it. Changes to this file, to skills, or to
playbooks require a second approver (`docs/04-rbac.md §4.5`).

> **Adapted:** this deployment has **no `gatekeeper` role.** The spec's
> plant-scoped gatekeeper (G3–G5) is removed; that gate authority moves to the
> unscoped portfolio forum. Plant scope governs `view_plant` only.

## Roles

| Role | Identity group | Capabilities | Scope | Gates |
|---|---|---|---|---|
| requester | DU-Portal-AllStaff | create_uc, view_own, view_board, draft, comment | — | — |
| champion | DU-Portal-Champions | create_uc, view_board, view_plant, draft, comment | plant | — |
| triage | DU-Portal-Triage | view_all, view_board, assign_lane, gate_pass, draft, comment, park, link_uc | — | G1, G2 |
| reviewer | DU-Portal-Reviewers | view_all, view_board, comment, draft | — | — |
| portfolio forum | DU-Portal-PortfolioForum | view_all, view_board, gate_pass, park, kill, reprioritize, comment | unscoped | G2, G3, G4, G5, G6, G7 |
| IT liaison | DU-Portal-IT | view_all, view_board, comment, accept_handover, draft | — | — |
| admin | DU-Portal-Admins | all | — | G1–G7 |

## Capabilities

| Capability | Meaning |
|---|---|
| create_uc | Create a use-case repository from intake |
| view_own | View use cases where the user is requester or named in roles |
| view_plant | View all use cases for plants in scope |
| view_all | View the full portfolio |
| view_board | View the board, redacted to permitted use cases |
| assign_lane | Set or change the lane at triage |
| gate_pass | Open a gate pull request — does not merge it |
| park | Move a use case to parked |
| kill | Move a use case to killed |
| draft | Invoke agent drafting; produces a pull request |
| comment | Comment on a use case |
| link_uc | Create relations between use cases |
| accept_handover | Accept a handover record |
| reprioritize | Change backlog ranking |
