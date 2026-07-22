# 12 — Architecture

## 12.1 Overview

```
        Browser (desktop / shop-floor mobile)
                      │
                 OIDC │ session cookie
                      ▼
        ┌─────────────────────────────────┐
        │  Portal — managed platform, EU  │
        │                                 │
        │  Interface  board · uc · chat   │
        │  API        intake · gate ·     │
        │             agent · webhook ·   │
        │             cron                │
        │  Runner     playbook engine     │
        │  Reconciler registry sync       │
        └────────┬───────────────┬────────┘
                 │               │
     application │               │ model API
        identity ▼               ▼
        ┌─────────────────┐  ┌──────────────┐
        │ Repository fleet│  │ Model service│
        │  portal repo    │  │  EU region   │
        │  uc-* repos     │  └──────────────┘
        └─────────────────┘
                 ▲
                 │ webhook (HMAC verified)
                 └─────────────────
```

Inbound integrations — mail and chat platform automation — post to the intake
API. No inbound path bypasses authentication except the webhook endpoint, which
is signature-verified.

## 12.2 Runtime

| Concern | Choice | Rationale |
|---|---|---|
| Application | Server-rendered web framework with server-side route handlers | Credentials must never reach the browser |
| Hosting | Managed platform, EU region pinned | Data residency; no infrastructure to operate |
| State | Git repositories | System of record; no application database |
| Cache | Registry files in the portal repository + edge cache | Board renders without fanning out across the fleet |
| Session store | Signed cookie, no server session | Stateless; survives redeployment |
| Job store | Playbook suspension state in a key-value store | Durable across deployment |
| Model access | Hosted model API, EU region | See [14](14-compliance.md) for processing terms |

**No application database.** This is a deliberate constraint with a cost: complex
portfolio queries are slower than SQL would be. The benefit is that a use case
survives the portal, and there is no second system of record to reconcile.

## 12.3 API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/*` | — | — | OIDC flow |
| `/api/intake` | POST | Session or integration key | Create demand from any channel |
| `/api/uc` | POST | Session, `create_uc` | Create use-case repository |
| `/api/uc/[id]` | GET | Session, visibility | Use-case detail |
| `/api/uc/[id]/gate` | POST | Session, `gate_pass` | Open a gate pull request |
| `/api/uc/[id]/park` | POST | Session, `park` | Park with reason and review date |
| `/api/handover` | POST | Session, `assign_lane` | Create run-lane handover record |
| `/api/handover/[id]/accept` | POST | Session, `accept_handover` | Accept with external reference |
| `/api/agent` | POST | Session | Agent turn or playbook invocation |
| `/api/registry` | GET | Session, visibility | Board data, redacted to permissions |
| `/api/webhooks/git` | POST | HMAC signature | Repository events |
| `/api/cron/reconcile` | POST | Shared secret header | Registry synchronization |
| `/api/cron/playbook/[id]` | POST | Shared secret header | Scheduled playbook |
| `/healthz` | GET | — | Liveness; returns no data |

`/api/uc/[id]/gate` opens a pull request. **No route merges one.** There is no
merge endpoint in the API surface, which is why the gate boundary holds even
under full application compromise.

## 12.4 Reconciler

Registry entries are a cache. Truth is `README.md` in each use-case repository.

Triggered by webhook (`push`, `pull_request.closed`) and by a 15-minute sweep as
a backstop.

```
for each registered use case:
    read README.md at HEAD
    if content hash != registry.last_hash:
        update registry entry
        emit event if stage changed
write changed registry entries as a single commit
```

Properties: idempotent, safe to run concurrently with itself (last-write-wins on
a cache), and self-healing — a registry deleted entirely is rebuilt from the
fleet on the next sweep.

**Drift is expected and normal.** Someone editing `README.md` directly in the
repository is a legitimate path, not an error. The reconciler exists because that
path exists.

## 12.5 Repository operations

The application identity requires: repository creation, contents write, pull
request write, metadata read. Installed at the organization, scoped to `uc-*`
repositories and the portal repository.

**Creation from template.** New use-case repositories are generated from a
template repository carrying the schemas, the validation workflow, and the
artifact stubs. Every use case inherits enforcement from creation — CI is not
added later.

**Writes are always via pull request** for use-case content. Only registry
entries in the portal repository are written directly, because they are a cache
rather than a decision.

## 12.6 Intake channels

| Channel | Path | Notes |
|---|---|---|
| Portal chat | `/api/agent` → `s1-intake` | Primary. Only channel where the agent can clarify before the record is written. |
| Voice | Client-side dictation into the chat field | The portal receives text. No audio reaches the server, which removes a class of data-protection obligation entirely. |
| Web form | `/api/intake` | Fallback for users who prefer structure. |
| Mail / chat platform | Tenant automation → `/api/intake` | Integration key, not a user session. Runs `s1-intake-async`. |
| API | `/api/intake` | Adjacent systems. |

**Normalized intake payload.** Every channel produces the same shape: a source
block naming the channel, a stable external reference, the actor where
authenticated, and a capture timestamp; plus the raw body text and any
attachment references.

`ref` is the idempotency key. Re-delivery of the same message never creates a
second use case.

**On voice:** dictation happens in the client. The portal's contract is text, and
that is the whole integration. Server-side audio would require retention policy,
lawful basis, and works-council engagement for recorded workforce input — all
avoided by keeping the boundary at text.

## 12.7 Handover integration

Run-lane demand routes to IT with a handover record. Two integration levels:

**Manual (Phase 1).** The record is created in the portal, IT is notified, and
the IT liaison records the external reference on acceptance. Requires no
integration with the IT service system.

**Automated (later).** The portal creates the ticket via the service platform's
API and stores the returned reference automatically.

Phase 1 deliberately takes the manual path. The handover boundary is a governance
question before it is an integration question, and automating a boundary that has
not yet been agreed encodes the wrong thing.

## 12.8 Scheduled jobs

| Schedule | Job | Identity |
|---|---|---|
| `*/15 * * * *` | Reconcile registry | `reconciler` |
| `0 6 * * 1-5` | `s2-triage-sweep` | `agent-scheduled` |
| `0 5 1 */3 *` | `s8-value-review` | `agent-scheduled` |
| `0 7 * * 1` | Review-date and staleness digest | `reconciler` |

All are invoked over HTTP with a shared-secret header. All are idempotent —
duplicate invocation is safe, which matters because platform cron guarantees
at-least-once delivery.

## 12.9 Performance

| Concern | Approach |
|---|---|
| Board render | Registry compiled to a single index at build and on reconcile; served from edge cache |
| Use-case detail | Live repository read; single round trip |
| Fleet-wide query | Registry only; never fans out across repositories |
| Agent latency | Streamed response; playbook steps report progress as they complete |
| Mobile | Board is the critical path — index is redaction-filtered server-side, not client-side |

Target: board render under two seconds at 500 use cases, which the registry index
comfortably supports.

## 12.10 Failure modes

| Failure | Behaviour | Rationale |
|---|---|---|
| Repository platform unavailable | Portal read-only from cached registry; writes queue and are retried | Board stays useful |
| Model service unavailable | Interface degrades to forms; intake still works | Demand capture must never depend on AI |
| Identity provider unavailable | Portal unavailable | No fallback authentication path exists, by design |
| Reconciler failure | Registry goes stale; use-case repositories unaffected | Self-heals on next successful run |
| Portal entirely unavailable | Use-case repositories fully usable; gates can be passed by direct pull request | The portal is an orchestrator, not a dependency |

The last row is the architectural payoff. The portal being down blocks new demand
capture. It does not block work, does not block decisions, and does not lose
anything.

## 12.11 Environments

| Environment | Purpose | Fleet |
|---|---|---|
| Production | Live | Production organization |
| Preview | Per pull request | Sandbox organization with synthetic use cases |
| Local | Development | Sandbox organization |

Preview deployments never hold production credentials and never write to the
production fleet. Skill and playbook changes are evaluated against the sandbox
before merge.
