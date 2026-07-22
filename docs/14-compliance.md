# 14 — Compliance

> This document records the compliance analysis the portal is designed against.
> It is not legal advice and does not substitute for review by counsel, the data
> protection officer, and the works council. Every position below should be
> confirmed by those parties before production use.

## 14.1 EU AI Act — classification

The portal contains an AI system. Its classification depends entirely on what
that system is used for, and the design constrains the use to keep the
classification low.

### Intended purpose

The AI layer drafts documents and classifies **demands**. It does not make
decisions, does not evaluate people, and does not operate machinery.

### Position

**Not high-risk**, on the following reasoning:

| High-risk category | Applicable? | Reason |
|---|---|---|
| Employment, worker management, access to self-employment | **No** | The system classifies demands, not people. It performs no recruitment, task allocation, monitoring, evaluation of performance, or decision affecting a work relationship. |
| Safety component of a product | No | No control over machinery or safety functions. |
| Critical infrastructure management | No | No operational control. |
| Access to essential services | No | Internal enterprise process. |
| Biometric, law enforcement, migration, justice | No | Not applicable. |

The employment category is the one requiring active defence, because a portal
used by employees invites the assumption. The distinguishing facts:

1. The unit of classification is a **demand**, never a person.
2. No output ranks, scores, or compares individuals.
3. No output influences task allocation, promotion, evaluation, or any decision
   about a work relationship.
4. The system prompt explicitly refuses requests to evaluate people
   ([09](09-system-prompt.md)), and this is in the evaluation set.
5. Named individuals appear as accountability fields (sponsor, value owner) —
   the same role identification a project document has always carried.

### Design constraints preserving this classification

These are binding, not advisory. Any of them being violated changes the
classification.

| Constraint | Enforcement |
|---|---|
| No classification, scoring, or ranking of individuals | System prompt; evaluation set; no tool produces person-level output |
| No aggregation of demand volume or quality by requester as a performance measure | Portfolio analytics exclude per-requester productivity cuts |
| No inference about individuals from demand content | Skills produce demand attributes only |
| Human decision at every gate | No agent gate tool exists |
| Portfolio metrics are demand-level and plant-level, never person-level | Board and export schemas |

**The tempting feature that must not be built:** a view showing which requesters
submit the most or the best-rated demands. It is trivially derivable from the
data and would move the system into the employment high-risk category. It is
prohibited by design, and this prohibition should be stated in any product
backlog so it is refused explicitly rather than forgotten.

### Transparency obligations

Regardless of risk tier, users interacting with an AI system must know they are.

- The chat interface identifies itself as an AI assistant at the start of every
  session.
- Agent-produced pull requests are labelled `agent-proposed`.
- Artifacts drafted by the agent record it in the commit trailer.
- Users can see which skills were loaded for their session.

### Governance

- Classification recorded and reviewed on any material change to agent
  capability.
- Skill and playbook changes require a second approver, so capability cannot
  expand unilaterally.
- Traces retained for 24 months, supporting reconstruction of any agent action.
- The portal's own AI use is registered in the enterprise AI inventory.

### Note on use cases in the portfolio

The portal governs use cases that may themselves be high-risk AI systems. The
lifecycle should carry an AI Act classification field on any use case involving
AI, assessed at G3 and confirmed at G6. This is a separate obligation from the
portal's own classification and is noted here as an open item — the current
schema does not include it.

## 14.2 GDPR

### Personal data processed

| Data | Purpose | Basis |
|---|---|---|
| Name, work mail address | Identify requester, sponsor, value owner, approver | Legitimate interest — operating a documented business process |
| Group membership | Authorization | Legitimate interest |
| Demand text authored by an employee | The demand itself | Legitimate interest |
| Agent interaction traces | Audit, security, AI Act governance | Legitimate interest |
| Authentication logs | Security | Legitimate interest |

No special category data. No performance data. No behavioural monitoring.

### Data minimization

- Only work identity; no personal contact details, no personnel numbers.
- Demand content is business content that happens to be authored by a person.
- **Voice is handled client-side.** Dictation occurs in the browser; the portal
  receives text only. No audio recording of employees is created, stored, or
  transmitted. This removes the most sensitive processing that a voice-enabled
  intake would otherwise involve, and it is worth stating explicitly to the works
  council because it is the question they will ask first.

### Retention

| Data | Retention | Rationale |
|---|---|---|
| Use-case repositories | Life of the use case + 7 years | Business records; investment decisions |
| Agent traces | 24 months | AI Act governance and security |
| Authentication logs | 12 months | Security |
| Registry | Rebuilt continuously; no independent retention | Cache |
| Run-lane handover records | 3 years | Demand volume analysis |

**Git and erasure.** Repository history is append-only. A rectification or
erasure request affecting a name in `README.md` is handled by a corrective
commit; the historical commit remains. Where genuine erasure from history is
required, it needs repository rewriting, which is disruptive and should be
treated as an exceptional procedure with a documented runbook. This limitation
must be disclosed in the processing record — it is a known property of the
chosen architecture, not an oversight.

### Data subject rights

| Right | Handling |
|---|---|
| Access | Portal provides an export of all use cases and traces referencing the individual |
| Rectification | Corrective commit; historical commits noted as superseded |
| Erasure | Assessed case by case; business-record retention obligations generally apply |
| Objection | Assessed against the legitimate interest basis |

### Transfers

Portal hosting, repository platform, and model service must all be EU-region or
covered by an adequacy decision or appropriate safeguards. Confirm the model
service's processing terms include no training on submitted content and a defined
retention period.

## 14.3 Works council

In a German manufacturing context this engagement is not optional and should
begin at design time, not before launch.

### Likely co-determination triggers

| Trigger | Relevance |
|---|---|
| Technical systems suitable for monitoring performance or behaviour (BetrVG §87(1)6) | The portal records who submitted what and when. Even without a monitoring purpose, suitability for monitoring is the legal test. |
| Introduction of new technology affecting ways of working | Conversational intake changes how demand is raised. |
| AI use in an employee-facing system | Increasingly addressed in works agreements. |

The suitability test is the one that matters. The portal is not designed to
monitor, but it records employee-authored content with timestamps and
attribution, which is sufficient to trigger the consultation.

### What to bring to the conversation

1. **The purpose limitation, stated plainly.** The portal classifies demands, not
   people. No per-requester analytics exist.
2. **The prohibited feature, named.** Per-requester productivity views are
   prohibited by design. Naming what will not be built is more persuasive than
   describing what will.
3. **Voice is client-side.** No audio of employees is created or stored.
4. **Retention periods**, stated per data class.
5. **The audit trail cuts both ways.** Every gate decision is attributable — this
   protects employees from unattributable rejection as much as it records
   activity.
6. **Access model.** Who can see what, and the fact that the portfolio is
   deliberately transparent rather than management-only.

### Suggested works agreement content

- Purpose limitation: demand management and value tracking only
- Explicit prohibition of performance evaluation use of portal data
- No per-person productivity or quality metrics
- Retention periods
- Access model and the roles that hold `view_all`
- Notification process for capability changes to the AI layer
- Review cadence

## 14.4 Audit

### What the portal can evidence

| Question | Evidence |
|---|---|
| Who approved this investment? | Gate record plus repository merge event, both immutable |
| On what basis? | Business case at the commit that was merged at approval |
| Was the value realized? | `ops/value-tracking.md`, appended per cycle |
| Who could have approved it? | `CODEOWNERS` at that commit |
| What did the AI do? | Trace, with skills, tools, and authority |
| Was the decision human? | Merge event, by a named person, outside portal control |

The last row is the strongest property. Merge events are recorded by the
repository platform under its own audit log, which the portal cannot write to or
alter. A claim that a decision was human is verifiable independently of the
system making the claim.

### Segregation of duties

- Requester cannot be sole approver ([04.5](04-rbac.md#45-separation-of-duties))
- Portal authorization and code-owner merge are independent controls
- RBAC, skill, and playbook changes require a second approver
- Agent holds no independent authority

### Known limitation

Collusion between two authorized approvers is not prevented by the system. It is
detectable after the fact through the audit trail. This is stated rather than
claimed solved.

## 14.5 Open items

| Item | Owner | Needed before |
|---|---|---|
| Legal review of AI Act classification | Legal / compliance | Production |
| Data protection impact assessment | Data protection officer | Production |
| Works council consultation | HR / works council | Production |
| Model service processing terms review | Legal / procurement | Production |
| Processing record entry, including the Git erasure limitation | Data protection officer | Production |
| AI Act classification field on portfolio use cases | Digital Unit | Before the first AI use case reaches G3 |
| Retention configuration and verification | Digital Unit | Production |
