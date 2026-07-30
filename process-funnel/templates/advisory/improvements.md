# Improvement Ideas — [process name]

Advisory pass A3 of 4 · Derived proposals · Reads: Flow, KPI Layer, Diagnostics, and the rest of the anamnesis

> **Everything on this sheet is a proposal.** The anamnesis sections are established reality —
> a named person put their name to them. This sheet was derived from those sections by a machine,
> and it is wrong often enough that nothing on it may ever be quoted as if the process owner had
> said it. A proposal becomes a decision only when a named person records a verdict against its id.

- **Process**: [process name]
- **Process owner who rules on these proposals**: [name, role, site]
- **Pass run on**: [YYYY-MM-DD]
- **Sections this pass read**: [the section names that had content]
- **Sections still empty**: [the ones with no artefact yet, or "none" — proposals leaning on an empty section are marked provisional in their block]
- **Proposals in this pass**: [n total: n process, n KPI design, n KPI calibration]
- **Review language**: [language the review conversation was held in, or "not reviewed with the owner yet"]

## How to read this sheet

Three kinds of proposal, one id sequence. **Process** proposals change what happens. **KPI design**
proposals change what is measured. **KPI calibration** proposals change how an existing indicator
is set — its threshold, its period, its aggregation level or its refresh cadence.

Every proposal states its trade-off. A proposal with only an upside is advertising, and it may be
rejected on that ground alone.

Every proposal is cut to the smallest change that delivers something on its own inside one
iteration cycle. If the value of one proposal only arrives after another one lands, the two are a
plan, not two increments — they get merged and cut again.

Every proposal names the cluster or the finding it answers. A proposal that answers nothing found
in the anamnesis is an idea, and ideas belong in "considered and not made".

## Proposal index

| Id | Kind | Title | Answers | Trade-off in one line | Ships inside one iteration cycle? | Verdict |
|---|---|---|---|---|---|---|
| I1 | [process / KPI design / KPI calibration] | [short title] | [cluster id from A2, or section and field] | [what gets worse] | [yes / no, and what makes it longer] | [open / accepted / rejected / deferred] |
| I2 | [kind] | [title] | [what it answers] | [what gets worse] | [yes / no] | [verdict] |
| I3 | [kind] | [title] | [what it answers] | [what gets worse] | [yes / no] | [verdict] |
| I4 | [kind] | [title] | [what it answers] | [what gets worse] | [yes / no] | [verdict] |

## Process proposals

Repeat the block below once per process proposal, numbering straight on through the shared id
sequence. Delete the heading if this pass produced none, and say so in the index.

### I1 — [title, stated as the state that would exist afterwards]

- **Kind**: process
- **Answers**: [cluster id from A2 with its title, or the finding: section name plus the field or table row it sits in]
- **Evidence underneath it**: [the figure or observed state from the anamnesis, with its confidence letter S, P or I, and the section it came from]
- **Proposed state**: [what a second person would observe after this lands — not the activity that gets there, not a project name]
- **Smallest cut that still delivers**: [the piece that can ship on its own inside one iteration cycle]
- **What the organisation keeps if nothing follows it**: [the benefit that survives if the next proposal never happens. If the honest answer is "the basis for the next step", this is a phase — cut it differently or withdraw it]
- **Trade-off — what gets worse**: [the cost: an extra step for someone, a new dependency, a licence, a slower path elsewhere, a habit people have to give up. Never "none"]
- **Who pays that trade-off**: [the role group that did not ask for the change, how many people, what they do differently]
- **What has to be true to take it**: [preconditions, each one checkable by walking in and looking]
- **What would show this was wrong**: [the observation after it ships that would send us back]
- **Confidence in this proposal**: [high / medium / low, and why — usually the confidence letter of the evidence underneath it]
- **Provisional because a section is empty**: [name the section, or "no"]
- **Verdict**: [open — no verdict recorded / accepted / rejected / deferred, with who decided, on which date, and the reason]

## KPI design proposals

### I2 — [title, stated as the indicator that would exist afterwards]

- **Kind**: KPI design
- **Answers**: [cluster id from A2, or the finding: usually a criterion with no indicator in KPI section 3, or a blind spot in KPI section 6]
- **Evidence underneath it**: [the coverage gap or blind spot, quoted from the section it came from]
- **Indicator definition**: [what is counted, divided by what, over what period — the same three parts the KPI section demands of an existing indicator]
- **Replaces or adds**: [which existing indicator it replaces. The standing rule is replace rather than add; if it adds, say why the existing set cannot carry it]
- **Where the number would come from**: [the system and field that exist today, or the collection step that would have to exist first, with the level it would reach — S, P or I]
- **Smallest movement it could show**: [the unit, and how many runs are needed before that movement is distinguishable from normal scatter]
- **Who reads it, and what they do differently when it moves**: [named role and the concrete action. An indicator nobody acts on is a report, not a KPI]
- **Smallest cut that still delivers**: [the manual first version that can run inside one iteration cycle before anything is automated]
- **Trade-off — what gets worse**: [who produces this number, how long it takes them each period, what it displaces, what behaviour it invites. Never "none"]
- **Who pays that trade-off**: [role group, number of people, what they do differently]
- **What has to be true to take it**: [preconditions, each one checkable]
- **What would show this was wrong**: [the case where this indicator would stay flat while the process hurts]
- **Confidence in this proposal**: [high / medium / low, and why]
- **Provisional because a section is empty**: [name the section, or "no"]
- **Verdict**: [open — no verdict recorded / accepted / rejected / deferred, with who decided, on which date, and the reason]

## KPI calibration proposals

### I3 — [title, stated as the setting that would exist afterwards]

- **Kind**: KPI calibration
- **Answers**: [cluster id from A2, or the finding: usually the calibration verdict in KPI section 5 or the cadence verdict in KPI section 4]
- **Indicator being recalibrated**: [name as used in the business, from the KPI inventory]
- **What it misses today**: [the observed case where the process hurt and this indicator did not move, or moved too late — with the date]
- **Change proposed**: [threshold, period, aggregation level, denominator, or refresh cadence — name which one and the new value]
- **Back-test that would settle it**: [the past case to replay it against, with its date, and where the data for the replay sits]
- **Effect on false alarms and on late detection**: [both directions. A setting that catches more also cries wolf more — say by roughly how much and on what basis]
- **Smallest cut that still delivers**: [the single setting changed first, and on which indicator]
- **Trade-off — what gets worse**: [the alarms someone now has to triage, the history that becomes non-comparable, the target that suddenly looks missed. Never "none"]
- **Who pays that trade-off**: [role group, number of people, what they do differently]
- **What has to be true to take it**: [preconditions, including who owns the report that has to be changed]
- **What would show this was wrong**: [the observation that would send the setting back]
- **Confidence in this proposal**: [high / medium / low, and why]
- **Provisional because a section is empty**: [name the section, or "no"]
- **Verdict**: [open — no verdict recorded / accepted / rejected / deferred, with who decided, on which date, and the reason]

## Proposals considered and not made

The row that saves the most time is the one that stops the same idea coming back next year without
its reason attached.

| What was considered | Why it is not proposed | What would turn it into a proposal |
|---|---|---|
| [the change or indicator] | [the observed state that rules it out — a cost-of-change class, a literacy gap, no data source, no consumer] | [the observation or collection step that would flip it] |
| [the change or indicator] | [why not] | [what would flip it] |

## Cost of the whole set

If every proposal on this sheet were accepted, this is what the organisation would be signing up
for. It is stated here so the set can be judged as a set, not one flattering block at a time.

- **New manual steps introduced across all proposals**: [count them, and name the role groups that carry them]
- **Role group carrying the largest share of the trade-offs**: [group, how many people, what changes for them]
- **Proposals that conflict with each other**: [pairs that cannot both be taken, and why — or "none"]
- **Order they should be taken in, if any order matters**: [the ids in sequence, and what forces that order — or "any order"]
- **Total ship time if taken in that order**: [number of iteration cycles, and the cycle length used]

## What this pass could not see

| Question | Which section would answer it | Who can answer it | Which proposal it blocks |
|---|---|---|---|
| [what the anamnesis does not say] | [section name] | [name and role, or the team that owns the system] | [proposal id, or "a proposal that could not be made"] |
| [question] | [section] | [name and role] | [proposal id] |
