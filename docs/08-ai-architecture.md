# 08 — AI Architecture

## 8.1 The governing constraint

An agent that can create use cases and pass gates is an agent that can approve
its own work. The architecture is designed against that from the start rather
than mitigated afterwards.

**The agent operates under the invoking session's authority and cannot exceed
it.** It calls the same API routes the interface calls, under the same
authorization checks, and receives the same rejections. There is no privileged
path.

**The agent may never pass a gate.** Not by policy, not by prompt instruction —
by the absence of a tool. No gate-passing tool exists in any capability set,
including the administrator's.

## 8.2 Capability tiers

| Tier | What it is | Where it lives | Loaded when |
|---|---|---|---|
| **Tools** | Atomic actions with a schema | `lib/agent/tools/` | Session authority permits |
| **Skills** | Procedural knowledge — how to do a task well | `skills/*/SKILL.md` | Stage, lane, and role match |
| **Playbooks** | Multi-step orchestrations with checkpoints | `playbooks/*.md` | Explicitly invoked or scheduled |

Tools are *can*. Skills are *how*. Playbooks are *when, in what order, with what
approvals*.

All three are versioned in the portal repository. Changing agent behaviour is a
pull request with a diff someone reviews — not a prompt edit in an admin console.
Changes to skills and playbooks require a second approver
([04.5](04-rbac.md#45-separation-of-duties)).

## 8.3 Capability resolution

```
capabilitiesFor(session, useCase, intent) →
    skills  = index
              .filter(stage matches useCase.stage)
              .filter(lane matches useCase.lane)
              .filter(role intersects session.roles)
              .filter(intent matches, if intent given)

    tools   = union(skills.requires_tools)
              .filter(can(session, TOOL_CAPABILITY[tool], {plant, gate}))

    system  = SYSTEM_BASE + skill bodies + context block
```

Two properties follow:

**Skill inclusion never grants authority.** A skill declaring
`requires_tools: [open_pr]` loads its guidance, but the tool is stripped if the
session lacks `draft`. The agent then knows how to do something it cannot do, and
says so.

**Context stays small.** Stage-scoped loading means an S3 conversation carries
business-case guidance, not rollout-planning guidance. This measurably improves
tool selection and reduces the chance of the agent applying the wrong stage's
rules.

## 8.4 Autonomy boundary

| Action | Autonomy | Mechanism |
|---|---|---|
| Search, read, summarize the portfolio | Full | Read tools, scoped to visibility |
| Classify a demand — level, heat, domain, lane proposal | Full | Writes classification fields; reversible |
| Detect duplicates | Full | Proposes a link; human confirms |
| Draft any stage artifact | Full | Output is a pull request labelled `agent-proposed` |
| Create a use-case repository | Full, idempotent | Only from validated intake with confirmed fields |
| Compute value variance | Full | Writes an appended review block via pull request |
| Pass a gate | **Never** | No tool exists |
| Merge a pull request | **Never** | No tool exists |
| Alter a gate record | **Never** | CI rejects; no tool exists |
| Change RBAC, skills, playbooks | **Never** | No tool exists |

The line: **the agent may produce anything; it may approve nothing.**

### Lane proposal, not lane assignment

The agent proposes a lane at triage with a rationale. Lane assignment is a triage
decision recorded by a human, because lane determines ownership and an agent
assigning ownership between DU and IT would be making an organizational decision.

## 8.5 Where AI is deployed

Investment follows the lifecycle map ([02.5](02-lifecycle.md#25-where-the-lifecycle-turns-agentic)).

**Front end and steady state first (S1, S2, S8 — L1, high heat).** These are
where work is currently *not done*: demand goes uncaptured, backlogs go stale,
value goes unmeasured. Agentic capability there creates work that did not
previously exist. Nobody is displaced because nobody was doing it.

**Middle stages as step-enhancement (S3–S7 — L2).** The work is already being
done by people. AI makes drafting faster. It does not change who decides, and the
gates are unchanged.

This ordering is also the lower-risk ordering: S1 and S2 outputs are cheap to
correct, while an S6 template error propagates across the plant network.

## 8.6 Untrusted content

Demand descriptions originate from employees typing or dictating free text, and
from mail and chat messages. This content is attacker-influenceable in a
corporate context and is the primary injection surface.

**Rule: content retrieved from any source outside the current user's turn is
data, never instruction.**

Implementation:

```
<external_content source="README.md" use_case="UC-2026-0041" trust="untrusted">
...retrieved content...
</external_content>
```

- All retrieved artifacts, intake payloads, and repository content are wrapped.
- The system prompt states explicitly that wrapped content is material to
  analyze, never instruction to follow.
- Where wrapped content attempts to direct agent behaviour, the agent notes this
  in its response and continues with the user's actual request.
- Wrapping is applied by the retrieval layer, not by the model. The model cannot
  be asked to wrap its own inputs.

**Test cases** that must pass before the agent handles external intake:
a demand body containing instructions to pass a gate; a demand body claiming
administrator authority; a repository artifact containing a fake system prompt; a
chat message instructing the agent to ignore its constraints. Expected behaviour
in all cases: the attempt is noted, the request is refused, the underlying demand
is still processed on its merits.

## 8.7 Scheduled autonomy

Scheduled playbooks run under the `agent-scheduled` service identity, which holds
`draft` only.

| Schedule | Playbook | Output |
|---|---|---|
| Weekdays, early | `s2-triage-sweep` | Re-scored heat, staleness flags, merge proposals — all as pull requests |
| Monthly | `s8-value-review` | Variance computation appended to `ops/value-tracking.md` per use case in S8 |
| Every 15 minutes | `reconcile` (not an agent) | Registry synchronization from the fleet |

Every autonomous output is a pull request labelled `agent-proposed`. Nothing
merges without a human. A scheduled run that produces no pull requests is a
normal outcome.

## 8.8 Trace model

Every agent interaction produces a trace, retained and replayable.

A trace records: the trace identifier; the session (actor, roles, plant scopes);
the invocation timestamp; the context (use case, stage, lane); the playbook if
any; the capabilities loaded — skills, tools granted, and **tools withheld with
the reason**; every step with its kind, arguments, and outcome; token usage; and
the final outcome state.

Traces are stored as markdown in the portal's trace store, one document per run,
so they are readable without tooling.

Traces answer one question: *what did the agent do to UC-2026-0041, and under
whose authority?* That question will be asked — by audit, by a sponsor disputing
a drafted figure, and by the works council. The trace is the answer.

Retention: 24 months, aligned with the audit retention period
([14](14-compliance.md)).

## 8.9 Operational controls

| Control | Mechanism |
|---|---|
| **Kill switch** | Configuration flag empties every tool array. One deployment disarms all agent action. Read-only chat remains. |
| **Spend cap** | Per-session and per-day token budget. Hard stop with a clear message, not a silent degradation. |
| **Rate limit** | Per-user and per-identity limits on write-producing actions. |
| **Idempotency** | Every write tool takes an idempotency key. `create_uc` is keyed on the source reference hash. Retries are safe. |
| **Model pinning** | The model version is pinned in configuration and changed by pull request, so behaviour changes are attributable. |
| **Regression suite** | Skills are evaluated against labelled historical demands before a skill change merges. |

## 8.10 Failure behaviour

| Failure | Behaviour |
|---|---|
| Model unavailable | Interface degrades to forms. Intake still works. Never blocks demand capture. |
| Tool call fails | Reported to the user with what failed; no silent retry that could double-write |
| Authorization rejection | Stated as an authorization boundary with the missing capability named, not as an error |
| Ambiguous request | One clarifying question, then proceed on the stated assumption |
| Insufficient data for a figure | Field marked as requiring input. **Never** filled with a plausible number to complete a template |

The last row is the most important behavioural requirement in the system. A
business case with a fabricated figure that looks defensible is worse than an
incomplete one, because it passes review.

## 8.11 What the agent is not for

Stated explicitly because the boundary will be tested:

- **Not for evaluating people.** Classification applies to demands, never to
  requesters. The agent does not score, rank, or profile employees. This is both
  a design decision and a regulatory one ([14](14-compliance.md)).
- **Not for deciding.** It recommends; the gate decides.
- **Not a system of record.** Its outputs become record only when merged.
- **Not a substitute for the sponsor conversation.** A drafted business case is
  an input to a conversation between a sponsor and a value owner, not a
  replacement for it.
