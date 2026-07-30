# Cost of Change — [process name]

*Fill every field. If you cannot answer one, write what you tried and why it failed. Do not leave
square brackets standing — brackets left in the document count as unfilled. Two assessors score
independently before this sheet is written; a gap of more than one level on any factor means the
evidence is pulled, not averaged.*

**Process**: [process name]
**Components assessed**: [the two or three components the change would touch]
**Assessor A**: [name]
**Assessor B**: [name]
**Date**: [YYYY-MM-DD]
**Iteration cycle used as the unit of effort**: [the length of one cycle in this engagement, e.g. two weeks]
**Change intended, in one sentence**: [what would be touched, concretely — not the goal, the action]

## Evidence base — the seven check points

| # | Check point | What was found | How it was checked | Feeds factor |
|---|---|---|---|---|
| 1 | User base — who actively works with the component | [finding] | [access history, version history, distribution list, interviews] | Risk, Friction |
| 2 | Dependent processes — who consumes the output | [finding] | [neighbouring recon artefacts, spoke network] | Risk |
| 3 | Shadow use — undocumented uses | [finding] | [announcement test with a date, search for copies and links] | Risk |
| 4 | Reversibility — rollback inside one process cycle | [finding] | [fallback path named and dry-run once] | Risk |
| 5 | Parallel run — can old and new run side by side | [finding] | [technical and organisational check, who maintains what meanwhile] | Effort, Risk |
| 6 | Carrier — spoke, group IT or a third party | [finding] | [ownership established, whose release cadence applies] | Effort |
| 7 | Literacy delta — does the target state demand more than was measured | [finding] | [readiness section held against the target state] | Friction, Durability |

## Factor scores per component

| Component | Risk | Effort | Friction | Durability | Class | Tactic |
|---|---|---|---|---|---|---|
| [component] | [RK1-RK4] | [EF1-EF4] | [FR1-FR4] | [DU1-DU4] | [CC-A to CC-D] | [direct, parallel run, strangler, do not touch] |
| [component] | [RK1-RK4] | [EF1-EF4] | [FR1-FR4] | [DU1-DU4] | [CC-A to CC-D] | [direct, parallel run, strangler, do not touch] |

## Risk

**Risk level and the observed state that fixes it**: [RKn, and the state from the anchor table that was observed]
**What breaks if this change goes wrong**: [what stops, who notices first, within what time]
**Rollback path and whether it has been used**: [the path, the last time it was actually used, or: never used]
**Announcement test result**: [what came back from the user base, or: not run and why]

## Effort

**Effort level and the observed state that fixes it**: [EFn, and the state from the anchor table that was observed]
**Parties whose schedule the engagement does not control**: [who, and what their cadence is, or: none]
**Cycles to ship, and who supplies the hands**: [n cycles, and which people from spoke and hub]

## Friction

**Friction level and the observed state that fixes it**: [FRn, and the state from the anchor table that was observed]
**Who pays this friction (people who did not ask for the change)**: [which role groups, how many people, what they have to do differently]
**Consultation required before the change (works council, data protection, other)**: [what applies at this site and who confirmed it]

## Durability

**Durability level and the observed state that fixes it**: [DUn, and the state from the anchor table that was observed]
**Who keeps the result working, and who is the deputy**: [names and roles, or: nobody named]
**Recurring manual step the result depends on**: [the step and who is scheduled to do it, or: none]
**Known event that would break it**: [the event and its date, or: none found and what was checked]

*Candidate events: planned migration, end of support, contract end, the one person who maintains it
leaving, a licence that is not renewed.*

## Main barriers

| Rank | Barrier | Factor | Removable? | What would remove it | Who decides |
|---|---|---|---|---|---|
| 1 | [barrier] | [Risk, Effort, Friction or Durability] | [yes, no, partly] | [the concrete move] | [name and role] |
| 2 | [barrier] | [Risk, Effort, Friction or Durability] | [yes, no, partly] | [the concrete move] | [name and role] |
| 3 | [barrier] | [Risk, Effort, Friction or Durability] | [yes, no, partly] | [the concrete move] | [name and role] |

**The one barrier that would lower the class by one step**: [the barrier, the factor it sits in, and what the class would become]
**Cheaper increment considered**: [a smaller cut that lowers the driving factor, and why it was taken or rejected]

## Verdict

**Cost-of-change class**: [CC-A, CC-B, CC-C or CC-D — the worst class across the components above]
**Rule that produced the class**: [which rule of the ordered list fired, and on which factors]
**Change tactic that follows**: [direct, parallel run with switch date, strangler, or do not touch]
**Assessor disagreement**: [factors where A and B differed, and what was done]

## Relation to the change-risk gate

**Risk class from the gate (R1, R2 or R3)**: [class, derived from check points 1 to 7]
**Gate verdict — may we touch it**: [yes, yes with the tactic above, or no and why]
**Where cost of change says more than the gate**: [the factor that the gate does not ask about and that changes the decision here]

## Open questions

- [what could not be established, and what would be needed to establish it]
- [what could not be established, and what would be needed to establish it]
