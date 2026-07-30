# KPI Layer — [Process name]

Section 6 of 14 · Group: Measurement · Unlocks after: Purpose & Success Statement

This sheet records what is measured on this process today, how often the numbers are
refreshed, whether they can be trusted, and how small a change they can show. Every
number on this sheet carries a confidence level: S (structured self-report), P (sample),
I (instrumented). A number without a confidence level is not a number, it is an opinion.

---

## 1. Header

- **Process name**: [full name as the business calls it]
- **Process owner**: [name, role, site]
- **KPI producer**: [who physically produces the numbers today, name and role; write "nobody" if nobody does]
- **Interviewed**: [names and roles of everyone who answered]
- **Date of session**: [YYYY-MM-DD]
- **Conversation language**: [language the interview was held in]
- **Purpose statement carried over from section 2**: [paste the one sentence verbatim, do not rewrite it]

## 2. KPI Inventory

One row per indicator that exists TODAY. If a value could not be pulled up during the
session, say so in the "shown live" column — do not write down a number from memory.
If no indicator exists at all, keep one row and write "none" across it. An empty KPI
layer is a finding, not a reason to stop.

| # | Indicator name | Exact definition — numerator, denominator, period | Data source | Who produces it | Refresh interval | Shown live in session? | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | [name used in the business] | [what is counted, divided by what, over what period] | [system, report or file] | [name and role, or "nobody"] | [e.g. weekly] | [yes / no, plus reason] | [S, P or I] |
| 2 | [name used in the business] | [what is counted, divided by what, over what period] | [system, report or file] | [name and role, or "nobody"] | [e.g. monthly] | [yes / no, plus reason] | [S, P or I] |
| 3 | [name used in the business] | [what is counted, divided by what, over what period] | [system, report or file] | [name and role, or "nobody"] | [e.g. on request] | [yes / no, plus reason] | [S, P or I] |

- **Indicators counted**: [number of rows above that are real indicators]
- **Indicators whose value was actually shown during the session**: [number]

## 3. Coverage against the success criteria

One row per testable criterion from the purpose statement in section 2. At least three
rows, because the purpose gate does not pass with fewer than three criteria.

| Success criterion (section 2, verbatim) | Indicator that measures it | Gap — what is not covered |
|---|---|---|
| [criterion 1] | [indicator name, or "none"] | [what stays invisible if this is the only measure] |
| [criterion 2] | [indicator name, or "none"] | [what stays invisible if this is the only measure] |
| [criterion 3] | [indicator name, or "none"] | [what stays invisible if this is the only measure] |

- **Criteria with no indicator at all**: [list them, or write "none"]
- **Indicators that measure something no criterion asked for**: [list them, or write "none"]

## 4. Cadence

A KPI that is refreshed less often than the process runs cannot steer the process. It
can only report on it afterwards.

- **Process cycle time (one full run, trigger to result)**: [duration, plus confidence level S, P or I]
- **Runs per year**: [number, plus where the number comes from]
- **Reporting cadence (how often the KPI value is actually refreshed)**: [interval, e.g. "monthly, on the 5th working day"]
- **Cadence verdict**: [one of: refresh is faster than the cycle time / refresh matches the cycle time / refresh is slower than the cycle time]
- **What that means here**: [if slower: say how many runs pass unseen between two refreshes]

## 5. Calibration

The diagnostics layer validates the KPI layer. The test is concrete: when the process
had a real problem, did the indicator move? An indicator that stays green while the
latency profile shows pain is measuring the wrong thing.

- **Last known real problem on this process**: [what happened, and when — date or month]
- **Did an indicator move at the time**: [which one, in which direction, by how much — or "no indicator moved"]
- **How long after the problem started did it become visible in the numbers**: [duration, or "it never became visible"]
- **Calibration verdict**: [one of: indicator moved with the problem / indicator moved late / indicator stayed flat while the process hurt / never tested]
- **Evidence for this verdict**: [report, ticket, mail, meeting minute with a date — or state that this rests on recollection only]

## 6. Blind spots — what the numbers do not show

| Blind spot | Why it is invisible in today's numbers | Who noticed it, and how they noticed |
|---|---|---|
| [what can go wrong without any indicator reacting] | [no data source, wrong aggregation, wrong period, too coarse] | [name and role, and what tipped them off] |
| [what can go wrong without any indicator reacting] | [no data source, wrong aggregation, wrong period, too coarse] | [name and role, and what tipped them off] |

- **Known false alarms (indicator goes red while the process is fine)**: [describe, or write "none named"]

## 7. Increment sensitivity

This is the part that decides whether this process can be improved fast. If the smallest
improvement worth shipping is invisible to the KPI layer, every increment has to be
argued instead of shown, and the improvement loop stalls.

- **Smallest movement the KPI layer can show**: [e.g. "one working day of cycle time"; state the unit]
- **Time until an improvement shipped today becomes visible in the numbers**: [duration]
- **Runs needed before a change is distinguishable from normal scatter**: [number, plus how that was worked out]
- **Typical scatter of the leading indicator today**: [range or spread, plus confidence level]
- **Increment verdict**: [one of: a two-week increment would be visible / only a large change would be visible / nothing would be visible]
- **If nothing would be visible, what would have to change first**: [the one measurement that has to exist before increments can be judged]

## 8. Baseline freeze

The values as of today, recorded before anyone touches the process. Everything later
claimed as an effect is measured against this table.

| Indicator | Value today | As of date | Confidence | Where it was pulled from |
|---|---|---|---|---|
| [indicator name] | [value with unit] | [YYYY-MM-DD] | [S, P or I] | [system, report or file] |
| [indicator name] | [value with unit] | [YYYY-MM-DD] | [S, P or I] | [system, report or file] |

- **Baseline frozen on**: [YYYY-MM-DD]
- **Frozen by**: [name and role]

## 9. Verdict — KPI layer level

Pick the highest level whose statement is true as an observable fact. If you cannot show
the evidence, the level is not reached.

- K1 — No indicator exists for this process. Nobody in the session could name one.
- K2 — Indicators are named, but no current value could be shown during the session; the numbers have to be assembled on request.
- K3 — Current values were shown during the session; someone maintains them by hand; the refresh interval varies from run to run.
- K4 — Values are produced on a fixed interval without manual assembly, and every indicator has a written definition naming numerator, denominator and period.
- K5 — Everything in K4, plus at least twelve months of history can be retrieved, a named recipient list receives the values, and at least one dated case exists in which a diagnostic finding and the indicator moved together.

- **KPI layer level**: [K1, K2, K3, K4 or K5]
- **Evidence for that level**: [what was shown, by whom, when — name the artefact]
- **What is missing for the next level up**: [one concrete, nameable thing]

## 10. Recommended action

- **Action**: [one of: keep as is / recalibrate existing indicators / replace indicators / build a KPI layer from scratch]
- **Reason in one sentence**: [tie it to a specific finding above, with the section number]
- **First step, small enough to ship inside one iteration cycle**: [what exactly, by whom]
- **Owner of that step**: [name and role]
Rule: replace rather than add. An indicator that points at the wrong thing does not get
repaired by putting a second indicator next to it.

## 11. Open questions and evidence gaps

| Open question | Who can answer it | What it blocks |
|---|---|---|
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |
