# Diagnosis & Branch — [process name]

> Fill every placeholder in square brackets. If you do not fill an optional block, delete the
> whole block — placeholders left standing count as unfinished work.

- **Process**: [process name]
- **Process owner**: [name, job title, site]
- **Assessor**: [name]
- **Date**: [YYYY-MM-DD]
- **Confidence of the numbers that decide the branch**: [S = told to us / P = sampled over at least one full cycle / I = read out of a system]

## Evidence carried into this diagnosis

- **Latency split**: [what share of the end-to-end time sits between steps and what share sits inside steps — with the source and the confidence letter]
- **Largest single idle point**: [the step or handover, the measured duration, where the number came from]
- **Manual transfers in the main path**: [how many, counted during which walkthrough]
- **Purpose criteria met today**: [which criteria from the purpose section are met and which are missed, each with the figure that shows it]
- **Data pulled during the assessment**: [system and what was exported live — or: nothing was pulled, and why]

## Branch test

Tested in this order and no other. Kill first, because a step that goes away needs no fix.
Extractability second, because without data every later diagnosis is soft.

| Order | Branch | Condition tested | Met? | Evidence and confidence letter |
|---|---|---|---|---|
| 1 | Kill | No one consumes the output, or the purpose still holds without the step, or the effort outweighs any value it produces | [met / not met] | [named consumer or the absence of one, counted effort, date] |
| 2 | Interfaces 1b — data cannot be extracted | The data points we need exist in a system but cannot be exported: no interface, no report, no access | [met / not met] | [what was attempted, by whom, what came back] |
| 3 | Interfaces 1a — handover friction | The bigger share of end-to-end time sits between the steps, and the same information is entered more than once | [met / not met] | [the measured split, the count of re-entries] |
| 4 | Process design | Even with perfect tools and instant handovers, the flow would still miss a purpose criterion | [met / not met] | [which criterion, and what in the order, the loops or the responsibilities makes it miss] |
| 5 | Toolbox evolution | The friction sits inside one step and is caused by the tool itself — single-user file, manual consolidation, version clashes, a capacity ceiling, handwork the tool forces | [met / not met] | [the mechanical constraint, observed where] |

## Leading branch

- **Branch**: [Kill / Interfaces 1b / Interfaces 1a / Process design / Toolbox evolution]
- **Step or component it applies to**: [name]
- **Condition that decides it**: [restate the one condition from the table, with its number]
- **Evidence**: [the artefact or extract, its date, its confidence letter]
- **Why this branch beats the others that also matched**: [state the tie-break used: kill before everything; 1b before process design and toolbox; then the branch whose fix repeats in most other processes; on a tie, the lower change-risk class]

## Branches ruled out

| Branch | Why it was ruled out | What we would have to see to revisit it |
|---|---|---|
| [branch] | [an observable state, not an opinion] | [the observation that would flip it] |
| [branch] | [an observable state] | [the observation that would flip it] |
| [branch] | [an observable state] | [the observation that would flip it] |

## Intervention hypothesis

- **Hypothesis**: If we [change], then [named figure] moves [direction] from [baseline value] within [time], and we will read it in [source].
- **Falsified if**: [the concrete observation that would prove this wrong]
- **Measurement that will settle it**: [source, how often it is read, who reads it]
- **Change-risk class carried over from Cost of Change**: [R1 change it directly / R2 run old and new side by side / R3 build alongside and move consumers one by one]
- **Change tactic that follows from that class**: [what we will actually do]

## Compounding check

- **Same cut applies elsewhere**: [the other processes or components where this same branch and this same fix would apply, with who owns them — or: none identified, and how we checked]

## Open questions

- [what could not be established, who has to establish it, by when]
- [what could not be established, who has to establish it, by when]

## Optional — fill this block or delete it

### Suspension test
- **Step suspended for**: [how many cases, over what period, with what fallback in place]
- **What broke downstream**: [what happened, who reported it — or: nothing broke, confirmed by whom]

### Second assessor
- **Second assessor**: [name]
- **Agreement on the leading branch**: [agreed / disagreed and on what]
