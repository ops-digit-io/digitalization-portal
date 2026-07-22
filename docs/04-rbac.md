# 04 — Identity, Roles, and Authorization

## 4.1 Two trust domains

```
User ──OIDC──▶ Corporate IdP ──claims──▶ Portal session
                                              │
Portal ──application identity──▶ Repository fleet
```

Users authenticate against the corporate directory and **never hold repository
credentials**. The portal holds a single application identity with fleet-wide
write capability. These domains are deliberately separate: a compromised user
session cannot exfiltrate repository credentials, and the application identity
is never exercised except under an authorized session or a named service
identity.

## 4.2 Record roles vs. authorization roles

These are different things and must not be conflated.

**Record roles** ([02.4](02-lifecycle.md#24-accountability-model)) — sponsor,
value owner, lead, business owner, run owner. Fields on `README.md`. They
express accountability. Being named sponsor does not by itself grant merge
rights.

**Authorization roles** — below. Derived from identity provider group
membership. They express capability. Holding gate authority does not make
someone the sponsor.

The overlap is intentional in practice — a sponsor usually also holds gatekeeper
capability for their plant — but the portal must not infer one from the other.
Doing so would mean editing a YAML field could escalate privilege.

## 4.3 Authorization roles

Defined in `portal/registry/rbac.md`. The portal reads the tables; the prose is
for the humans who maintain it.

````markdown
# Roles and capabilities

## Roles

| Role | Identity group | Capabilities | Scope | Gates |
|---|---|---|---|---|
| requester | DU-Portal-AllStaff | create_uc, view_own, view_board, draft, comment | — | — |
| champion | DU-Portal-Champions | create_uc, view_board, view_plant, draft, comment, assist_intake | plant | — |
| triage | DU-Portal-Triage | view_all, assign_lane, gate_pass, draft, comment, park, link_uc | — | G1, G2 |
| reviewer | DU-Portal-Reviewers | view_all, comment, draft | — | — |
| gatekeeper | DU-Portal-Gatekeepers-* | view_all, gate_pass | plant (from group suffix) | G3, G4, G5 |
| portfolio forum | DU-Portal-PortfolioForum | view_all, gate_pass, park, kill, reprioritize | unscoped | G2, G3, G6, G7 |
| IT liaison | DU-Portal-IT | view_all, comment, accept_handover, draft | — | — |
| admin | DU-Portal-Admins | all | — | — |

Admin changes to this file, to skills, or to playbooks require a second
approver.

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
````

## 4.4 Scope resolution

Plant scope comes from the group suffix. A user in `DU-Portal-Gatekeepers-DE-ALD`
holds `gate_pass` scoped to `plant: DE-ALD`.

```
can(session, capability, context) =
     role_grants_capability(session.roles, capability)
  ∧  gate_permitted(session.roles, context.gate)
  ∧  scope_matches(session.scopes, context.plant)
  ∧  ¬ self_approval(session.user, context.use_case, capability)
```

**Multi-plant use cases.** A use case listing several plants requires
`gate_pass` from a gatekeeper scoped to *every* listed plant, or from the
portfolio forum, which is unscoped. This is the governance rule that prevents one
plant committing another to a rollout.

**Portfolio forum override.** The forum is unscoped by design and can pass any
gate. Every forum gate passage records the forum session reference in the gate
record.

## 4.5 Separation of duties

Hard rules, enforced in the API and re-enforced in CI:

| Rule | Rationale |
|---|---|
| The requester of a use case may not be its sole gate approver | Prevents self-approval of one's own idea |
| Gate passage requires portal authorization **and** code-owner merge approval | Two independent controls; portal compromise alone is insufficient |
| The portal never merges a pull request | The merge is the human act; the portal cannot simulate it |
| Changes to `rbac.md`, skills, and playbooks require a second approver | Prevents unilateral privilege or agent-behaviour change |
| Agent identity holds no capability of its own | Agent authority is exactly the invoking session's authority |

## 4.6 CODEOWNERS generation

Generated at repository creation and regenerated when plant or lane changes.

```
# .github/CODEOWNERS — generated, do not edit
# UC-2026-0041 · plant DE-ALD · lane transform

README.md                  @org/du-triage @org/gatekeepers-de-ald
business-case.md           @org/gatekeepers-de-ald @org/portfolio-forum
poc/evaluation.md                @org/gatekeepers-de-ald
pilot/                      @org/gatekeepers-de-ald
scale/                      @org/portfolio-forum
rollout/                    @org/portfolio-forum @org/it-liaison
handover/                   @org/it-liaison @org/portfolio-forum
ops/value-tracking.md      @org/du-value
```

The path pattern maps stage artifacts to the authority that owns the
corresponding gate. Because gate passage always touches `README.md`, the triage
and gatekeeper teams are approvers on every progression.

## 4.7 Service identities

| Identity | Capability | Used by |
|---|---|---|
| `portal-app` | Repository create, contents write, pull request write | All portal-initiated writes |
| `agent-scheduled` | `draft` only; pull requests labelled `agent-proposed` | Scheduled playbooks (S2 triage, S8 value) |
| `reconciler` | Read fleet, write registry | State synchronization |

`agent-scheduled` cannot create use cases, cannot pass gates, and cannot write
outside a pull request. Its output is always a proposal.

## 4.8 Visibility

Default is **portfolio-transparent**: any authenticated employee can see that a
use case exists, its title, plant, stage, and lane.

Restricted content — business cases, cost estimates, named individuals beyond the
lead — is visible to `view_all` holders and to users named in the use case's
record roles.

A use case may be marked `confidential: true` at intake for scope that touches
personnel, M&A, or legal matters. Confidential use cases appear on the board to
`view_all` holders only, and their repository is created with restricted access.
This is an exception and requires a recorded reason.

## 4.9 Failure behaviour

| Condition | Behaviour |
|---|---|
| No session | Redirect to login; no data returned |
| Session, insufficient capability | 403 with the missing capability named, so the user can request it |
| Scope mismatch | 403; board renders the use case as visible-but-not-actionable rather than hiding it |
| Identity provider unavailable | Portal is read-unavailable. Deliberate: no fallback authentication path exists |
| Gate approver unavailable | Park is available to triage; no bypass exists |

The last row matters operationally: sponsor and approver leave windows are a
known constraint. The answer is park, not delegation-by-exception.
