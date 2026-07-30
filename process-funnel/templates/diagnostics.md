# Diagnostics & Data Points — [Process name]

Section 7 of 14 · Group: Measurement · GATE · Unlocks after: Toolchain, Flow

The KPI layer says whether the process is running. This sheet is the layer underneath:
it says where and why it is stuck. Two things are the minimum bar for every process,
without exception — a value stream map must be producible, and timestamps must be
farmable that show where the dominant latency sits.

Every figure on this sheet carries a confidence level:

- **S — structured self-report.** Not "how long does it usually take" — people estimate averages badly. Instead the last three to five concrete cases are reconstructed from mailbox and calendar: when did the job arrive, when did it leave. That gives real single values instead of remembered averages. Enough for triage and for pointing the diagnosis. Not enough for a baseline claim or a branch decision.
- **P — sample.** Over at least one full process cycle, every case is stamped at defined stations — as a routing slip travelling with the case, on paper or as a mandatory field or status change in a tool that already exists. It is attached to the case, never to the person. The champion carries the collection, the central unit designs it. Enough for this gate, for the branch decision, and for the KPI baseline.
- **I — instrumented.** Timestamps fall out of the systems as a by-product and nobody stamps anything. This is the target state for normal operation.

---

## 1. Header

- **Process name**: [full name as the business calls it]
- **Process owner**: [name, role, site]
- **Process champion (carries the sampling)**: [name, role]
- **Interviewed**: [names and roles of everyone who answered]
- **Date of session**: [YYYY-MM-DD]
- **Conversation language**: [language the interview was held in]
- **Systems named in section 4, Toolchain**: [list them, so this sheet can be checked against that one]

## 2. Value stream skeleton

One row per step, in the order the case travels. A step belongs here if a case can sit
still in front of it. If the steps cannot be listed in order, the gate fails here and the
rest of the sheet is guesswork.

| # | Step | Who does it | System or artefact touched | Does that system record a time? Which field? | Obtainable at level |
|---|---|---|---|---|---|
| 1 | [what happens] | [role, not person] | [system, list, form, mailbox] | [field name, or "no"] | [S, P or I] |
| 2 | [what happens] | [role, not person] | [system, list, form, mailbox] | [field name, or "no"] | [S, P or I] |
| 3 | [what happens] | [role, not person] | [system, list, form, mailbox] | [field name, or "no"] | [S, P or I] |
| 4 | [what happens] | [role, not person] | [system, list, form, mailbox] | [field name, or "no"] | [S, P or I] |

- **Steps listed**: [number]
- **Steps at which a case can sit and wait**: [number]
- **Value stream map producible today**: [one of: yes, from the table above / yes, after one sampling round / no, and here is what is missing]

## 3. Existing data trail (exhaust sweep)

Before anyone is asked to stamp anything: almost every step already leaves a trace, even
where nobody thinks they are logging. Go through these sources one by one and record what
was actually checked during the session — not what someone believes exists.

| Source checked | Present for this process? | What it would give us | Pulled during the session? | Who owns access |
|---|---|---|---|---|
| Mail headers on the handover mails | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |
| File metadata and version history (SharePoint, network drive) | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |
| ERP or MES transaction timestamps | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |
| Ticket or workflow system status changes | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |
| Calendar entries for the recurring meetings in the flow | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |
| [any further source named in the session] | [yes / no / unknown] | [which step boundary it timestamps] | [yes / no, reason] | [team or role] |

- **Data actually pulled during the session**: [what was pulled, from where, how many cases it covered — or write "nothing was pulled" and say why]
- **Steps still dark after the sweep**: [list the step numbers from section 2]

## 4. Latency profile

The split between latency BETWEEN steps and latency INSIDE steps decides which branch
this process goes down later. Do not merge the two.

| Latency point | Between steps or inside a step | Measured duration | Confidence | Source of the figure | Cases behind it |
|---|---|---|---|---|---|
| [step boundary or step name] | [between / inside] | [duration] | [S, P or I] | [where the figure comes from] | [how many cases] |
| [step boundary or step name] | [between / inside] | [duration] | [S, P or I] | [where the figure comes from] | [how many cases] |
| [step boundary or step name] | [between / inside] | [duration] | [S, P or I] | [where the figure comes from] | [how many cases] |

- **End-to-end duration, trigger to result**: [duration, plus spread if known]
- **Dominant latency sits**: [name the one point, and say whether it is between steps or inside a step]
- **Share of end-to-end time spent at that point**: [percentage or duration, plus how it was worked out]
- **Confidence level of the dominant latency figure**: [S, P or I]
- **Split between waiting and working across the whole flow**: [waiting share versus working share, plus confidence]

## 5. Output quality

Speed alone is a half-diagnosis. A process can be fast and wrong, and an increment that
only cuts time cannot show that the result got better — the business case then rests on
hours saved and nothing else. So the same question that was asked of time is asked of the
result: is it any good, and where could you tell.

Quality is often measurable long before anyone measures it. The evidence is usually
already lying around as rework, as complaints, as a downstream correction someone makes
silently every week.

| Quality attribute of the output | How a good result differs from a bad one | Where it becomes visible | Evidence available today | Confidence | Measured value |
|---|---|---|---|---|---|
| [what has to be right about the result] | [the observable difference] | [step number, or downstream after the process ends] | [rework tickets, complaints, corrections, audit findings, returns — or none] | [S, P or I] | [rate, count or "not measured"] |
| [what has to be right about the result] | [the observable difference] | [step number, or downstream] | [what exists] | [S, P or I] | [value or "not measured"] |
| [what has to be right about the result] | [the observable difference] | [step number, or downstream] | [what exists] | [S, P or I] | [value or "not measured"] |

- **Output quality assessable today**: [one of: yes, from evidence that already exists / yes, after one sampling round / no, and here is what is missing]
- **Where quality is first visible**: [the earliest point at which a bad result can be recognised — inside the process, or only after it]
- **Quality feedback delay**: [how long between producing a bad result and anyone noticing]
- **Rework rate**: [share of cases that come back or get corrected, plus confidence — or "not measured"]
- **Who currently absorbs a bad result**: [the person or department that quietly fixes it]
- **Quality baseline for the increment**: [the figure a later increment will be judged against, or the one that must be established first]

## 6. Collection ladder and upgrade plan

One row per figure that is not yet at the level the next decision needs. A row without a
name and a date is a wish, not a plan.

| Data point | Level today | Level needed | Why that level is needed | How we climb | Owner | By when |
|---|---|---|---|---|---|---|
| [what is being measured] | [S, P or I] | [S, P or I] | [which decision depends on it] | [exhaust source, routing slip, mandatory field, export] | [name and role] | [YYYY-MM-DD] |
| [what is being measured] | [S, P or I] | [S, P or I] | [which decision depends on it] | [exhaust source, routing slip, mandatory field, export] | [name and role] | [YYYY-MM-DD] |
| [what is being measured] | [S, P or I] | [S, P or I] | [which decision depends on it] | [exhaust source, routing slip, mandatory field, export] | [name and role] | [YYYY-MM-DD] |

- **Sampling window agreed**: [start and end date, covering at least one full process cycle]
- **Stations to be stamped**: [list them by step number from section 2]
- **Where the stamp lives**: [routing slip on the case, mandatory field in an existing tool, status change — name it]

## 7. Measurement lead time

How fast this process can be improved is capped by how fast a question about it can be
answered. If it takes six weeks to see whether a change worked, nothing can be shipped
every two weeks.

- **Measurement lead time (from "we want to know X" to "we have a number for X")**: [duration]
- **What that duration is made of**: [waiting for access, waiting for the next report run, waiting for a full cycle to complete]
- **Can the diagnostics be pulled on demand later, without a project**: [yes / no, and what stands in the way]
- **Consequence for iteration speed**: [the shortest honest interval at which an increment on this process can be judged]

## 8. Cross-calibration

Where two levels measure the same thing, hold them against each other. A systematic gap
between what people say and what the sample shows is itself a finding — either about the
latency or about how well the process is understood.

| Figure | Self-report value (S) | Measured value (P or I) | Gap | What the gap says |
|---|---|---|---|---|
| [what was measured twice] | [value] | [value] | [difference] | [about the latency, or about process understanding] |

- **Cross-calibration done**: [yes / no; if no, name the figure that should be checked first]

## 9. Measurement and people

The case is measured, never the person. Evaluation is aggregated; no person-level
performance figures leave this engagement. Clearance happens before the first routing
slip runs, not after. A measurement that lands as surveillance is itself a change risk
and can end the engagement.

- **Sites and units the sampling would touch**: [list them]
- **Works council status**: [one of: not yet approached / informed / agreement in place / not required, with the reason]
- **Data protection status**: [one of: not yet approached / assessment running / cleared / not required, with the reason]
- **Who is talking to them and by when**: [name, role, date]
- **How the sampling is explained to the people doing the work**: [the sentence that will actually be said to them]

## 10. Ratchet — what the next intervention will leave behind

Every intervention has to leave this process more measurable than it found it. New tool
steps emit timestamps by design. That is how the climb from P to I happens — as a
by-product of the work, not as an instrumentation project.

- **Timestamps the next intervention will emit that do not exist today**: [name them, per step]
- **Which dark step from section 2 that lights up**: [step number and name]
- **Who checks after the intervention that the timestamps really arrive**: [name and role]

## 11. Gate decision

**Pass** requires all three:

1. The steps and their order are known, and each step has a named station where a case can be stamped — a value stream map is producible.
2. The dominant latency is named and backed at level P or better.
3. The latency profile separates between-step latency from inside-step latency.

**Conditional pass, measurement-blocked:** if the reason the figures cannot rise above
level S is itself an inaccessible technical interface — the data exists in a system with
no export, no interface and no access — then the gate is passed with exactly that
diagnosis, and the engagement is routed to the interface branch. It becomes an enabler
engagement, not an optimisation engagement, and no saving may be promised on it.

**Fail:** only self-report figures exist at the decisive points, and no sampling has been
agreed with an owner and a date. Consequence: sharpen the collection and come back. Do
not diagnose on anecdotes.

- **Gate decision**: [pass / conditional pass, measurement-blocked / fail]
- **Which of the three conditions are met**: [list them by number, and name the evidence for each]
- **If conditional pass, the blocked interface**: [system name, what is needed from it, who owns it]
- **If fail, what has to happen before this section is reopened**: [the collection step, its owner, its date]
- **Decided by**: [name and role]
- **Decision date**: [YYYY-MM-DD]

## 12. Open questions and evidence gaps

| Open question | Who can answer it | What it blocks |
|---|---|---|
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |
