# Flow, Friction & Latency — [process name]

- **Process name**: [the name people in the business actually use]
- **Date of capture**: [YYYY-MM-DD]
- **Captured by**: [name]
- **People interviewed**: [name — role; name — role]
- **Interview language**: [language the conversation was held in]
- **Runs per year**: [number, and where the number comes from]
- **End-to-end duration (trigger to end state)**: [median of the reconstructed runs, in hours or days]
- **Touch time (sum of active work in one run)**: [hours or minutes]
- **Confidence of the timings**: [S = reconstructed from memory / P = counted from concrete runs / I = read from system timestamps]

## Reconstructed runs

Concrete runs, dated, rebuilt from mailboxes, calendars, tickets or file dates. Not averages.
Five runs is the minimum; add rows if more are available.

| Run | Trigger date and time | End date and time | Elapsed | Where the dates come from |
|---|---|---|---|---|
| 1 | [YYYY-MM-DD HH:MM] | [YYYY-MM-DD HH:MM] | [hours / days] | [mail header, ticket, file created, calendar] |
| 2 | [YYYY-MM-DD HH:MM] | [YYYY-MM-DD HH:MM] | [elapsed] | [source] |
| 3 | [YYYY-MM-DD HH:MM] | [YYYY-MM-DD HH:MM] | [elapsed] | [source] |
| 4 | [YYYY-MM-DD HH:MM] | [YYYY-MM-DD HH:MM] | [elapsed] | [source] |
| 5 | [YYYY-MM-DD HH:MM] | [YYYY-MM-DD HH:MM] | [elapsed] | [source] |

- **Shortest run**: [elapsed]
- **Longest run**: [elapsed]
- **Runs that were not typical, and why**: [note, or "none"]

## Step timing — where the time goes

| Step | Who does it | Active time | Waiting before this step | Where it waited | Confidence | Evidence |
|---|---|---|---|---|---|---|
| [# and name from the mapping section] | [role] | [minutes] | [hours / days] | [inbox, queue, approval, batch run, shift change] | [S / P / I] | [source] |
| [#] | [role] | [minutes] | [wait] | [where] | [S / P / I] | [source] |
| [#] | [role] | [minutes] | [wait] | [where] | [S / P / I] | [source] |
| [#] | [role] | [minutes] | [wait] | [where] | [S / P / I] | [source] |
| [#] | [role] | [minutes] | [wait] | [where] | [S / P / I] | [source] |
| [#] | [role] | [minutes] | [wait] | [where] | [S / P / I] | [source] |

- **Share of elapsed time that is waiting, not working**: [percentage, derived from the rows above]

## Idle points — where the run sits

The three longest waits, worst first.

| # | Where the run sits | Typical wait | Longest wait seen | Why it waits | Confidence |
|---|---|---|---|---|---|
| 1 | [between step n and step m] | [hours / days] | [hours / days] | [waiting for a person / a batch / a meeting / a signature / information from outside] | [S / P / I] |
| 2 | [location] | [typical] | [longest] | [reason] | [S / P / I] |
| 3 | [location] | [typical] | [longest] | [reason] | [S / P / I] |

- **Longest single wait in the whole process**: [where, how long]
- **Waits caused by a decision that only one named person can take**: [list, or "none"]

## Interventions and hand-offs

Everyone who touches a run, and whether they change the result.

| # | Role | What they do to the run | Changes the result / checks it / only forwards it | Evidence |
|---|---|---|---|---|
| 1 | [role] | [action] | [changes / checks / forwards] | [observed run, protocol, mail chain] |
| 2 | [role] | [action] | [changes / checks / forwards] | [evidence] |
| 3 | [role] | [action] | [changes / checks / forwards] | [evidence] |
| 4 | [role] | [action] | [changes / checks / forwards] | [evidence] |

- **People who touch one run**: [n]
- **Of those, people who change the result**: [n]
- **Hand-offs that only forward or approve without changing anything**: [n — list them]

## What works well

Named parts of the flow that hold up, each with the observation that shows it.

- [Step or hand-over] — [what was observed, e.g. "the release moved within the same shift in all five reconstructed runs"]
- [Step or hand-over] — [observation]

## What works badly

- [Step or hand-over] — [what was observed, e.g. "three of five runs went back to step 2 because the drawing revision was wrong"]
- [Step or hand-over] — [observation]

- **Rework loops seen**: [describe each loop: from which step back to which step, how often, what triggers it — or "none seen"]

## The absence test

Asked head-on, before anything is optimised: what would happen if this sub-process did not exist
at all. This is a recon question about consequence, not a recommendation — the diagnosis section
decides, this section only establishes what was found. Record consequences that somebody named,
and mark what was not checked as not checked.

- **If this process stopped after today, the first thing that would go wrong**: [the concrete event, not "chaos" — what breaks, where]
- **Who would notice first**: [named person or role, and what they would see on their screen or on the line]
- **Time until anyone outside the process notices**: [hours / days / weeks / never established, and how that was established]
- **What the process is protecting against**: [the failure it prevents, in one line]
- **Last time that failure actually occurred**: [YYYY-MM and what happened, or "no case could be named"]
- **Last run that was skipped, missed or late, and what followed**: [date and consequence, or "no such case could be named"]
- **What is required by regulation, customer contract or audit**: [the requirement and where it is written, or "nothing that anyone could point to"]
- **Absence verdict**: [the whole process has to run as it does / named nodes could stop, see below / the whole process could stop under the conditions stated / not enough evidence to say]

## Kill candidates

Node by node: which parts could be killed, and at what cost. A step with no nameable consumer is
a first-class result of this section, not a leftover. Two costs get written down, because the
answer needs both: what it costs to stop the node, and what it costs to keep running it.

| Node / step | Who consumes what it produces | Cost of running it per year | What would go wrong if it stopped | Who would notice, and after how long | How this was checked |
|---|---|---|---|---|---|
| [#] | [named person, role or system — or "nobody could be named"] | [minutes × people × runs per year, and the confidence letter] | [the stated consequence, or "none could be named"] | [name or role, and hours / days / weeks / never] | [asked the named consumer / checked whether the file is opened / checked the mail replies / not yet checked] |
| [#] | [consumer] | [cost] | [consequence] | [who, how long] | [check] |
| [#] | [consumer] | [cost] | [consequence] | [who, how long] | [check] |

- **Steps for which no consumer could be named**: [list, or "none"]
- **Nodes whose annual cost of running exceeds any consequence of stopping that could be named**: [list, or "none"]
- **Nodes not yet verified with the neighbouring processes**: [list, or "none"]

## Parallelisation candidates

Steps that run one after the other today but do not depend on each other.

| Steps | Sequential today because | Real dependency | What has to be true to run them in parallel |
|---|---|---|---|
| [step n then step m] | [reason given by the interviewee] | [yes — step m needs the output of step n / no — nothing from n is used in m] | [condition] |
| [steps] | [reason] | [yes / no] | [condition] |

## Pacing and cadence

- **Is there a fixed cadence today**: [yes — describe it / no]
- **What sets the cadence**: [a meeting, a batch job, a shift, a weekly report, a customer date, nothing]
- **Cadence of the process versus cadence of the demand**: [observable comparison, e.g. "orders arrive daily, the release meeting is weekly"]
- **Where batching creates the wait**: [step, and how much of the wait it accounts for]

## Timestamp sources found

[Optional, raises the score. Which systems already emit usable timestamps for this process today —
mail headers, ticket transitions, file version dates, ERP or MES transactions, workflow states.
Name the system and the field. This is what makes the next capture cheaper.]

## Seasonality and peaks

[Optional, raises the score. Periods where volume or waiting behaves differently, and the evidence
for that.]

## Evidence log

| What was looked at | When | Who showed it |
|---|---|---|
| [mailbox, ticket list, export, observed run] | [YYYY-MM-DD] | [name, role] |
| [item] | [YYYY-MM-DD] | [name, role] |

## Open questions

- [Question that could not be answered in this session, and who has to answer it]
- [Question, owner]
