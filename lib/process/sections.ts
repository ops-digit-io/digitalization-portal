/**
 * The coaching sections of the process anamnesis — ported verbatim from the
 * source tool's `backend/config/sections.js` and `backend/templates/*.md`.
 *
 * The sections form a SEQUENCE, not a catalogue: `blocking` lists the section
 * keys that must be complete before this one may be worked, and a `gate` section
 * can fail and stop the sequence.
 */

export interface SectionGroup {
  id: string;        // the GROUPS key, e.g. "discovery"
  label: string;
  subtitle: string;
  order: number;
}

export interface Section {
  key: string;
  label: string;
  order: number;
  group: string;
  file: string;
  gate: boolean;
  blocking: string[];
  description: string;
  gateQuestion?: string;
  /** The markdown scaffold for this section's document. */
  template: string;
}

export const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "discovery",
    label: "Discovery",
    subtitle: "What we are looking at, and what it exists for",
    order: 0,
  },
  {
    id: "recon",
    label: "Recon",
    subtitle: "How the process runs today — mapping, tools, flow",
    order: 1,
  },
  {
    id: "measurement",
    label: "Measurement",
    subtitle: "What we know, and what we would have to collect",
    order: 2,
  },
  {
    id: "capacity",
    label: "Capacity to Change",
    subtitle: "Whether the organisation carries the change, and what it costs to touch",
    order: 3,
  },
  {
    id: "decision",
    label: "Decision & Value",
    subtitle: "What to do, how fast it ships, and what it is worth",
    order: 4,
  },
];

export const SECTIONS: Section[] = [
  {
    key: "profile",
    label: "Process Profile",
    order: 1,
    group: "discovery",
    file: "01-profile.md",
    gate: true,
    blocking: [],
    description: "Who owns the process, where it starts and ends, who works inside it, and which business unit carries the cost.",
    gateQuestion: "Is there a named person with the authority to change this process, reachable for the engagement? No spoke, no intake.",
    template: `# Process Profile — [process name]

**Status**: [draft | signed off by the owner]
**Recorded on**: [date]
**Recorded by**: [who ran the session]
**Session language**: [language spoken in the session]

---

## 1. What this process is

**Process name**: [the name people in the area use]
**One-line description**: [what goes in, what comes out]
**Entry direction**: [process pull | technology push]

*Process pull: someone asked for help with this process. Technology push: we came at it from a
tool that may serve several processes.*

## 2. Boundaries

*An event, not a phase. Trigger and finish must be things an outsider could observe.*

**Trigger**: [the event that starts one run]
**Finish**: [the event that ends one run]
**Upstream neighbour**: [who hands work in, and what exactly]
**Downstream neighbour**: [who takes the output, and what they do with it]
**Out of scope**: [what people wrongly assume belongs to this process]

## 3. Scale

*Confidence: stated = from someone's recall. Sampled = counted over a defined set of real cases.
Instrumented = a system produced the number.*

**Runs per year**: [number] — confidence: [stated | sampled | instrumented]
**Source of that number**: [report, folder, mailbox, or a person's recall]
**Sites in scope**: [plant or location names]
**People who touch one run**: [distinct people in a single typical run]
**People trained to do the work**: [headcount across the sites in scope]
**Judgement window**: [weeks until enough runs show whether a change helped]

## 4. Roles inside the process

| Role | Site | Headcount | What they do in a run | Rough time per run |
|---|---|---|---|---|
| [role title] | [site] | [count] | [the step this role owns] | [minutes or hours] |
| [role title] | [site] | [count] | [the step this role owns] | [minutes or hours] |
| [role title] | [site] | [count] | [the step this role owns] | [minutes or hours] |

## 5. Ownership

*Evidence of authority means: a change to this process the owner made in the last 12 months
without approval from above — what it was and when. If there was none, name the last change of
any kind and who approved it; that is where the real decision level sits.*

**Process owner**: [name, job title]
**Owner authority**: [what this person can change without asking above them]
**Evidence of authority**: [the change, the month, and whether it needed approval]
**Owner reachable**: [yes or no, and the time commitment agreed]
**Process champion**: [name, job title — who does the counting and sampling]
**Champion capacity**: [hours per week their own manager agreed to, and when]
**Escalation path**: [who the owner goes to beyond their authority]

## 6. Cost centre

**Cost centre**: [code and name of the cost centre carrying this today]
**Cost centre manager**: [who signs that budget]
**Other cost centres carrying part of the work**: [list them, or: none]
**Who carries a saving**: [where a saving from this process would land]

## 7. Intake gate

**Gate verdict**: [pass | conditional pass | fail]
**Named owner with authority to change**: [yes or no]
**Named champion with agreed capacity**: [yes or no]
**Measurement agreed**: [yes or no — cases may be timed and counted]
**Gate condition**: [conditional pass: what, by when, confirmed by whom. Else: none.]
**Gate reason**: [one sentence — for a fail, exactly what was missing]

## 8. Open questions

- [what could not be established, and who has to answer it. If nothing: none.]`,
  },
  {
    key: "purpose",
    label: "Purpose & Success Statement",
    order: 2,
    group: "discovery",
    file: "02-purpose.md",
    gate: true,
    blocking: ["profile"],
    description: "What the process is supposed to achieve, in one sentence that yields testable criteria. And: if you rebuilt it from scratch, when would you call it good?",
    gateQuestion: "Is there a purpose sentence from which at least three testable criteria follow?",
    template: `# Purpose & Success Statement — [process name]

**Status**: [draft | signed off by the owner]
**Recorded on**: [date]
**Stated by**: [name and job title of the process owner]
**Cross-checked with**: [name and role of someone who does the work]
**Session language**: [language spoken in the session]

---

## 1. Purpose statement

*One sentence. It has to name who receives what, and the condition under which it counts as
delivered. No adjective survives here unless it can be checked.*

**Purpose**: [the sentence, in the owner's own words]

**Owner signed this sentence**: [yes or no — read back and accepted]
**Wording notes**: [words struck during the session and what replaced them]

## 2. Testable criteria

*Each criterion has to be checkable by someone who was not in the room, without asking the owner.
Three is the minimum. "Where the number would come from" may be "nowhere yet" — that is an
answer, and the KPI section needs it.*

| # | Criterion | Measure and unit | Good direction | Threshold | Where the number would come from | Measured today |
|---|---|---|---|---|---|---|
| 1 | [what has to be true] | [what you count, in which unit] | [higher or lower] | [the value that separates good from bad] | [system, report, folder, or: nowhere yet] | [yes or no] |
| 2 | [what has to be true] | [what you count, in which unit] | [higher or lower] | [the value that separates good from bad] | [system, report, folder, or: nowhere yet] | [yes or no] |
| 3 | [what has to be true] | [what you count, in which unit] | [higher or lower] | [the value that separates good from bad] | [system, report, folder, or: nowhere yet] | [yes or no] |

**Number of criteria**: [how many follow from the sentence — three is the minimum]
**Threshold basis**: [the requirement, plan or standard behind each — or: no source yet]
**Fastest-moving criterion**: [which one reacts first, and after how many runs it reads]

## 3. Rebuild test

*Thomas's question, asked literally: if you rebuilt this process from scratch, when would you say
it is good and works? Answer in things you could observe, not in adjectives.*

**Good when rebuilt**: [what you would be able to observe when it is good]
**What would be different**: [what would not be built the same way again]
**What would stay**: [what would be built the same way again, and why]
**What stops that today**: [the concrete obstacles between today and that state]

## 4. Consumers and the stop test

*If nobody can be named who would notice the output missing for a week, this process is a kill
candidate and that finding goes back to the owner, not into a drawer.*

**Who receives the output**: [named roles or teams, not departments in general]
**First to notice a stop**: [who complains first after a week, and after how many days]
**What breaks downstream**: [what the receiving side cannot do meanwhile]
**Kill check**: [someone would clearly notice — or nobody could be named]

## 5. Not the purpose

*Where the owner and the person doing the work answered differently, both answers are recorded as
spoken. The gap is a finding; do not merge it.*

**Out of purpose**: [what this process is asked to do that the sentence does not cover]
**Disagreement on record**: [both answers where they differ, verbatim. Else: none.]

## 6. Gate

**Gate verdict**: [pass | conditional pass | fail]
**Gate reason**: [one sentence — for a fail, no signed sentence or fewer than three criteria]
**Gate condition**: [conditional pass: what, by when, confirmed by whom. Else: none.]
**Escalation**: [fail: who this goes back to as a kill candidate. Else: none.]

## 7. Open questions

- [what could not be established, and who has to answer it. If nothing: none.]`,
  },
  {
    key: "mapping",
    label: "Process Mapping & Artefacts",
    order: 3,
    group: "recon",
    file: "03-mapping.md",
    gate: false,
    blocking: ["profile"],
    description: "How the process is documented today, how current that is, which artefacts are actively maintained and which are frozen.",
    template: `# Process Mapping — [process name]

- **Process name**: [the name people in the business actually use]
- **Process owner (can decide a change)**: [name, role]
- **Champion (works in the process day to day)**: [name, role]
- **Scope of this capture**: [site(s), plant(s), department(s), product lines — where this map is valid]
- **Date of capture**: [YYYY-MM-DD]
- **Captured by**: [name]
- **People interviewed**: [name — role; name — role]
- **Interview language**: [language the conversation was held in]
- **What starts a run (trigger)**: [the concrete event that makes someone start working]
- **What ends a run (end state)**: [the concrete result that means this run is finished]
- **Runs observed live**: [number of runs watched end to end during this capture, or 0]

## How the process is mapped today

- **A representation exists**: [yes / no / partly — say which]
- **Where it lives**: [system, folder, link, or "printed and pinned to the wall"]
- **Format**: [flow diagram / SOP text / work instruction / slide / spreadsheet / none]
- **Who maintains it**: [name and role, or "nobody"]
- **Map last edited**: [YYYY-MM-DD taken from file history or version block, not from memory]
- **Where that date comes from**: [file properties, version table, ticket, changelog]

[Two to five sentences: what the representation covers, what it leaves out, and at which level it
stops — end-to-end chain, single department, single step. State what you saw, not how good it is.]

## Step sequence

One row per step, in the order a run passes through them. Add rows until the run is complete;
delete rows the process does not have.

| # | What happens | Role who does it | Tool used | Input | Output | Path |
|---|---|---|---|---|---|---|
| 1 | [action in one line] | [role] | [tool] | [what arrives] | [what leaves] | [main / variant] |
| 2 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 3 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 4 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 5 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 6 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 7 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |
| 8 | [action] | [role] | [tool] | [input] | [output] | [main / variant] |

- **Number of steps on the main path**: [n]
- **Steps nobody could name a role for**: [list, or "none"]

## Map versus observed reality

| Step | What the map says | What actually happened | How this was checked |
|---|---|---|---|
| [#] | [text from the map] | [what was observed or shown] | [watched a run / screen share / file opened / three people asked] |
| [#] | [text from the map] | [what was observed or shown] | [evidence] |
| [#] | [text from the map] | [what was observed or shown] | [evidence] |

- **Deviations found**: [n]
- **Steps in the map that no longer happen**: [list, or "none"]
- **Steps that happen but are not in the map**: [list, or "none"]

## Tool coverage of the map

Whether the description, as written, contains every tool a run actually touches. Take the tools
from the step sequence above and add the ones that only came up in conversation. Mail, chat, paper
and the spreadsheet on somebody's own drive are tools.

| Tool used in a real run | Named in the map | Where it is named | How this was checked |
|---|---|---|---|
| [tool] | [yes / no] | [box, step or paragraph in the map — or "nowhere"] | [read in the map / searched the map and not found / no map exists] |
| [tool] | [yes / no] | [location] | [check] |
| [tool] | [yes / no] | [location] | [check] |
| [tool] | [yes / no] | [location] | [check] |

- **Tools found in a real run**: [n]
- **Tools named in the map**: [n of the tools found in a real run]
- **Tools used in a real run but not named in the map**: [list, or "none"]
- **Tools named in the map that are no longer used**: [list, or "none"]

## Artefact inventory

Every real object the process creates, reads or hands over — lists, forms, reports, mails, files,
paper. Not the idealised description of them.

| Artefact | What it is | Where it lives | Who edits it | Last change (date) | Source of that date |
|---|---|---|---|---|---|
| [name] | [list / form / report / mail / drawing / paper] | [system, path, mailbox] | [role] | [YYYY-MM-DD] | [file history / ticket / changelog] |
| [name] | [type] | [location] | [role] | [YYYY-MM-DD] | [source] |
| [name] | [type] | [location] | [role] | [YYYY-MM-DD] | [source] |
| [name] | [type] | [location] | [role] | [YYYY-MM-DD] | [source] |

## Alive versus static

Which building blocks are worked on continuously, and which have not been touched.

| Artefact / building block | Alive or static | Evidence | Deliberate or stuck |
|---|---|---|---|
| [name] | [alive: changed n times in the last 12 months / static: unchanged since YYYY-MM] | [version history, ticket list, changelog seen on screen] | [deliberate — nobody needs it changed / stuck — people work around it] |
| [name] | [alive / static] | [evidence] | [deliberate / stuck] |
| [name] | [alive / static] | [evidence] | [deliberate / stuck] |

- **Artefacts changed in the last 12 months**: [n of m]
- **Artefacts unchanged for more than 24 months while workarounds exist around them**: [list, or "none"]

## Variants and exceptions

- **Share of runs that follow the main path**: [percentage or "x of the last y runs", plus where that number comes from]

| Variant | What triggers it | How it differs | How often |
|---|---|---|---|
| [name] | [trigger] | [difference in one line] | [count or share, and source] |
| [name] | [trigger] | [difference] | [count or share, and source] |

## Undocumented helpers found

Private spreadsheets, mail loops, chat threads, notebooks, printed lists — anything used in a real
run that the map does not mention.

| Helper | Who uses it | What it is used for | Why it exists (their words) |
|---|---|---|---|
| [name] | [role] | [purpose] | [reason given] |
| [name] | [role] | [purpose] | [reason given] |

## Detail level of the map today

[Optional, raises the score. One paragraph, written as observable states only. Example of the
required register: "A flow diagram exists in the QM system, was last edited 2024-03, names roles
but no tools, and does not contain the two variants that made up four of the last ten runs."]

## Evidence log

| What was looked at | When | Who showed it |
|---|---|---|
| [artefact, screen, run] | [YYYY-MM-DD] | [name, role] |
| [artefact, screen, run] | [YYYY-MM-DD] | [name, role] |

## Open questions

- [Question that could not be answered in this session, and who has to answer it]
- [Question, owner]`,
  },
  {
    key: "toolchain",
    label: "Toolchain & System Breaks",
    order: 4,
    group: "recon",
    file: "04-toolchain.md",
    gate: false,
    blocking: ["mapping"],
    description: "Which tools are involved, where the chain breaks, and whether the data can be extracted at all.",
    template: `# Toolchain & System Breaks — [process name]

- **Process name**: [the name people in the business actually use]
- **Date of capture**: [YYYY-MM-DD]
- **Captured by**: [name]
- **People interviewed**: [name — role; name — role]
- **Interview language**: [language the conversation was held in]
- **Tools in the main path**: [number, counting private spreadsheets, mail and paper]
- **Live extract pulled during this session**: [yes — from which tool / no — why not]

## Tool inventory

Every tool a run touches. A shared mailbox is a tool. A printed form is a tool. A spreadsheet on
one person's drive is a tool. One row per tool — add rows until the list is complete.

| Tool | Type | Steps it serves | People using it here | Who can change it | Data it holds for this process |
|---|---|---|---|---|---|
| [name and version if known] | [corporate system / department system / spreadsheet / mail / chat / paper] | [step numbers from the mapping section] | [n, roles] | [corporate IT / vendor / department / one named person] | [what it is the record for] |
| [name] | [type] | [steps] | [n, roles] | [owner] | [data] |
| [name] | [type] | [steps] | [n, roles] | [owner] | [data] |
| [name] | [type] | [steps] | [n, roles] | [owner] | [data] |
| [name] | [type] | [steps] | [n, roles] | [owner] | [data] |

## Tool-to-tool sequence

The order in which data moves. One row per handover, in run order.

| # | From tool | To tool | What moves | How it moves | Break |
|---|---|---|---|---|---|
| 1 | [tool] | [tool] | [the data or document] | [automatic interface / scheduled export / manual export-import / re-typed / copy-paste / print and scan / mail attachment / verbal] | [yes / no] |
| 2 | [tool] | [tool] | [data] | [how] | [yes / no] |
| 3 | [tool] | [tool] | [data] | [how] | [yes / no] |
| 4 | [tool] | [tool] | [data] | [how] | [yes / no] |
| 5 | [tool] | [tool] | [data] | [how] | [yes / no] |

- **Handovers on the main path**: [n]
- **Automatic handovers**: [n]

## System breaks

A break is any point where a human moves data from one tool into another by hand, or where the
same information is entered a second time.

| # | Where it breaks | What is re-entered | Roughly how many fields or lines | How often per run | What goes wrong here |
|---|---|---|---|---|---|
| 1 | [between tool A and tool B, at step n] | [data] | [n] | [times per run] | [the failure people actually report] |
| 2 | [location] | [data] | [n] | [frequency] | [failure] |
| 3 | [location] | [data] | [n] | [frequency] | [failure] |

- **Total breaks on the main path**: [n]
- **The same information is entered more than once at**: [list, or "nowhere"]

## Leading source of truth

| Data object | Leading system | Also maintained in | How the copies are reconciled | Who decides when two values differ |
|---|---|---|---|---|
| [e.g. order status] | [system, or "not defined"] | [list of parallel places] | [automatic / by hand / not at all] | [role, or "by phone call"] |
| [data object] | [system] | [parallel places] | [how] | [role] |

- **Data objects with no named leading system**: [list, or "none"]

## Data demand versus data reality

What accuracy the process actually demands from each data item, and how accurate that item really
is. Both sides are observable: a demand is a decision somebody makes on the number, a tolerance in
a specification, or a customer requirement — not a wish for good data. A gap in either direction
is a finding on its own: too coarse means somebody is compensating for it downstream, too fine
means effort is being spent that nothing consumes.

| Data item | Where it is maintained | Accuracy the process demands | What the demand is derived from | Accuracy actually achieved | How the actual was established | Gap |
|---|---|---|---|---|---|---|
| [e.g. planned finish date] | [system or file] | [observable: to the day / to the shift / ±5 pieces / two decimals] | [the decision taken on it, the tolerance in the spec, the customer requirement] | [observable: e.g. "deviated from the real date in 6 of 10 sampled runs"] | [sampled n runs / compared against system data / stated by the key user] | [demand not reached / demand met / maintained finer than demanded] |
| [data item] | [location] | [demand] | [derived from] | [actual] | [how established] | [gap] |
| [data item] | [location] | [demand] | [derived from] | [actual] | [how established] | [gap] |
| [data item] | [location] | [demand] | [derived from] | [actual] | [how established] | [gap] |

- **Data items where the demanded accuracy is not reached**: [list, or "none found"]
- **Data items maintained more precisely than the process demands**: [list, or "none found"]
- **What the largest gap causes today**: [the observable consequence and the step it happens at — a rework loop, a safety buffer, a manual check, a phone call — or "no consequence could be named"]
- **Data items whose demanded accuracy nobody could state**: [list, or "none"]

## Extractability

Can we get the data out of each tool ourselves — and was it actually tried in this session.

| Tool | Access route | Tried in session | Result | Who grants access | Anyone done it before |
|---|---|---|---|---|---|
| [name] | [documented API / scheduled export / manual export to CSV or Excel / screen only / none] | [yes / no] | [file received, n rows, fields x, y, z / refused / no route found] | [role or team who approves] | [name of a precedent, or "no precedent"] |
| [name] | [route] | [yes / no] | [result] | [approver] | [precedent] |
| [name] | [route] | [yes / no] | [result] | [approver] | [precedent] |
| [name] | [route] | [yes / no] | [result] | [approver] | [precedent] |

- **Tools from which data was actually extracted today**: [list, or "none"]
- **Fields carrying a timestamp that were found in those extracts**: [list, or "none found"]

## Blocked interfaces

Tools where no route to the data exists today.

| Tool | What is blocked | What was tried | What it would take to open it | Who has to agree |
|---|---|---|---|---|
| [name] | [the data that cannot be reached] | [what was attempted, when] | [licence, ticket, vendor request, permission — as stated by the person who knows] | [role or team] |

- **Blocked interfaces**: [n]

## Addressable value — first read

A first read only, from what the interviewee could state or show today. Not a business case.

| Tool | People touching it in this process | Runs per year through it | Manual minutes per run spent on it | Other processes known to use it | Turn speed: how fast a change to it can be made today |
|---|---|---|---|---|---|
| [name] | [n] | [n, and source] | [n, and source] | [named processes or departments, or "unknown"] | [observable: e.g. "the department changed it twice last month itself" / "last change request took 7 months via corporate IT" / "never changed"] |
| [name] | [n] | [n, source] | [n, source] | [processes] | [observable statement] |
| [name] | [n] | [n, source] | [n, source] | [processes] | [observable statement] |

- **Confidence of these numbers**: [S = stated from memory / P = counted from a sample of runs / I = read from system data — state per column if they differ]

## Compounding candidates

Tools where the same cut would work in more than one process.

| Tool | The cut that would work here | Other processes where the same cut applies | How that was established | Evidence still missing |
|---|---|---|---|---|
| [name] | [what would be changed, in one line] | [named processes] | [the interviewee named them / seen in another capture / register entry] | [what has to be verified before this counts] |
| [name] | [the cut] | [processes] | [how established] | [what is missing] |

- **Candidates carried forward**: [n]

## Evidence log

| What was looked at | When | Who showed it |
|---|---|---|
| [screen, export, licence page, interface documentation] | [YYYY-MM-DD] | [name, role] |
| [item] | [YYYY-MM-DD] | [name, role] |

## Open questions

- [Question that could not be answered in this session, and who has to answer it]
- [Question, owner]`,
  },
  {
    key: "flow",
    label: "Flow, Friction & Latency",
    order: 5,
    group: "recon",
    file: "05-flow.md",
    gate: false,
    blocking: ["mapping"],
    description: "Value stream: how many hands touch it, how often work sits idle, for how long, and where the dominant latency is.",
    template: `# Flow, Friction & Latency — [process name]

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
- [Question, owner]`,
  },
  {
    key: "kpi",
    label: "KPI Layer",
    order: 6,
    group: "measurement",
    file: "06-kpi.md",
    gate: false,
    blocking: ["purpose"],
    description: "Which indicators describe the process today, whether they are on a cadence, and whether they point at what the business actually needs.",
    template: `# KPI Layer — [Process name]

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
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |`,
  },
  {
    key: "diagnostics",
    label: "Diagnostics & Data Points",
    order: 7,
    group: "measurement",
    file: "07-diagnostics.md",
    gate: true,
    blocking: ["toolchain", "flow"],
    description: "The insight layer beneath the KPIs: which data points tell you WHAT is going wrong. Minimum bar: value stream mapping possible, timestamps farmable.",
    gateQuestion: "Can a value stream map be produced for this process, and are timestamps obtainable — by sampling if nothing else?",
    template: `# Diagnostics & Data Points — [Process name]

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
| [question] | [name, role, or the team that owns the system] | [which decision waits on this] |`,
  },
  {
    key: "literacy",
    label: "Organisational Readiness",
    order: 8,
    group: "capacity",
    file: "08-literacy.md",
    gate: false,
    blocking: ["profile"],
    description: "Technical literacy and process literacy of the people working inside the process. Does the organisation carry a change, or does it drown in it?",
    template: `# Organisational Readiness — [process name]

*Fill every field. If you cannot answer one, write what you tried and why it failed. Do not leave
square brackets standing — brackets left in the document count as unfilled. Delete rows you do not
need, add rows you do.*

**Process**: [process name]
**Assessed by**: [assessor A, assessor B]
**Date**: [YYYY-MM-DD]
**People spoken to**: [n people, which roles, which sites]
**Conversation language**: [language the interviews were actually held in]
**Scope note**: [full assessment, or provisional and why]

*Provisional means owner and champion only, because interviews with the people doing the work are
not cleared at this site yet.*

## Role groups in scope

| Role group | What they do in this process | People in scope | Site or unit |
|---|---|---|---|
| [role group] | [what they actually do] | [number] | [site or unit] |
| [role group] | [what they actually do] | [number] | [site or unit] |
| [role group] | [what they actually do] | [number] | [site or unit] |

**Majority role group (does most of the work in this process)**: [role group, and how that was established]

## Literacy and understanding

| Axis | Level, majority group | Level, other groups | Observed state that fixes the level | Evidence |
|---|---|---|---|---|
| Technical literacy (TL) | [TL1-TL5] | [group: level, group: level] | [what was seen, not what was claimed] | [artefact, data extract or observation] |
| Process literacy (PL) | [PL1-PL5] | [group: level, group: level] | [what was seen] | [artefact, data extract or observation] |
| Reach — process and end-to-end detail understanding (RE) | [RE1-RE5] | [group: level, group: level] | [what was seen] | [artefact, data extract or observation] |
| KPI understanding (KU) | [KU1-KU5] | [group: level, group: level] | [what was seen] | [artefact, data extract or observation] |

**Technical literacy — lowest role group**: [role group at TLn, one sentence on the observed state]
**Process literacy — lowest role group**: [role group at PLn, one sentence on the observed state]
**Reach — where the description of the chain breaks off**: [the step where people stop, and who stops there]
**KPI understanding — quantity people named that is not measured today**: [the quantity, who named it, or: none named]

## Change this organisation has already absorbed

| Change to process or tool | Date | Who had to change behaviour | In use today? | Evidence |
|---|---|---|---|---|
| [what changed] | [YYYY-MM-DD] | [which role group, how many people] | [yes, partly, no] | [usage data, observation, old artefact still in use] |
| [what changed] | [YYYY-MM-DD] | [which role group, how many people] | [yes, partly, no] | [usage data, observation, old artefact still in use] |

**Fastest change cadence this organisation has actually absorbed**: [one change per period, derived from the rows above]
**Adoption measured (usage data), or only asked**: [which, and what the data or the answers showed]

## Literacy delta to the intended target state

**Target state assumed for this delta**: [the change that is on the table, in one sentence]
**Technical literacy the target state demands**: [TLn and why the target state demands it]
**Process literacy the target state demands**: [PLn and why the target state demands it]
**Gap between demanded and measured**: [which axis, how many levels, for which role group]
**How the gap is closed, or how the increment is cut so the gap does not matter**: [the concrete route, or the smaller cut]

*The two legitimate routes are: raise the literacy with a named carrier and a dated enablement
step, or cut the increment so nobody has to learn anything new. "We will train them" without a
name and a date is neither.*

## Verdict

**Readiness class**: [RD-A, RD-B or RD-C]
**Rule that produced the class**: [which rule of the ordered list fired, and on which axis]
**What follows for increment size and cadence**: [what may be shipped, how often, and what has to accompany it]
**Main organisational barrier**: [the one thing that most limits change speed here]
**Named multiplier inside the process (person who would carry the change)**: [name and role, or: none identified]
**Self-assessment vs observation gap**: [where they differed, and by how many levels]
**Assessor disagreement and how it was resolved**: [axes where A and B differed, and what was done]

## Open questions

- [what could not be established, and what would be needed to establish it]
- [what could not be established, and what would be needed to establish it]`,
  },
  {
    key: "cost-of-change",
    label: "Cost of Change",
    order: 9,
    group: "capacity",
    file: "09-cost-of-change.md",
    gate: true,
    blocking: ["mapping", "literacy"],
    description: "What it costs to touch this process — risk, effort, friction, and durability. The counterweight to addressable value, and the gate before any intervention.",
    gateQuestion: "Is the blast radius of every component to be touched named, and is a cost-of-change class assigned with evidence rather than assertion?",
    template: `# Cost of Change — [process name]

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
- [what could not be established, and what would be needed to establish it]`,
  },
  {
    key: "knowledge",
    label: "Feedback Loop & Knowledge Flow",
    order: 10,
    group: "capacity",
    file: "10-knowledge.md",
    gate: false,
    blocking: ["flow"],
    description: "Does the process have a built-in feedback loop? Which information inside it is worth learning from — and which other departments would benefit from receiving it?",
    template: `# Feedback Loop & Knowledge Flow — [process name]

*Fill every field. If you cannot answer one, write what you tried and why it failed. Do not leave
square brackets standing — brackets left in the document count as unfilled. A route counts only if
a named receiver said what decision it would change. Everything else is a proposal.*

**Process**: [process name]
**Owner spoken to**: [name and role]
**Others spoken to**: [names or roles, and the receivers who were asked]
**Date**: [YYYY-MM-DD]
**Conversation language**: [language the interviews were actually held in]

## Feedback loop as it exists today

**Last change made because a number moved**: [what changed, and which number caused it]
**Date of that change**: [YYYY-MM-DD, or: no such change found in the last 12 months]
**Signal-to-change latency**: [days or weeks from signal to change live, and how established]
**Where the loop is written down**: [meeting with minutes, ticket, changelog, or: nowhere]
**Loop verdict**: [closed, open or none]

*Closed means a dated signal, a dated decision and a dated change can all be shown. Open means the
signal exists and nothing followed from it. None means there is no signal.*

## Active and frozen zones

| Component or step | Last change (date) | Changes in the last 12 months | Active or frozen | Frozen on purpose? |
|---|---|---|---|---|
| [component or step] | [YYYY-MM-DD] | [number] | [active or frozen] | [yes and the reason, no and who avoids it, or not applicable] |
| [component or step] | [YYYY-MM-DD] | [number] | [active or frozen] | [yes and the reason, no and who avoids it, or not applicable] |
| [component or step] | [YYYY-MM-DD] | [number] | [active or frozen] | [yes and the reason, no and who avoids it, or not applicable] |

## What this process would have to measure to know it is running

| Quantity | What it would tell you | Available today? | Source it would come from | Effort to capture |
|---|---|---|---|---|
| [quantity] | [the question it answers] | [yes, partly, no] | [system, artefact or sample] | [one of: falls out already, export plus script, manual sample, not obtainable] |
| [quantity] | [the question it answers] | [yes, partly, no] | [system, artefact or sample] | [one of: falls out already, export plus script, manual sample, not obtainable] |

## Information this process holds

*Every list, field, note, report and side-artefact the process produces or touches. If you find
fewer than five, go back to the artefact collection from the mapping section.*

| Information object | What it tells you | Who sees it today | Who else would benefit (name and department) | Decision it would change for them | Route cost |
|---|---|---|---|---|---|
| [object] | [what it tells you that the official output does not] | [roles or systems] | [name, department] | [the decision] | [copy, link, field, report, or: needs building] |
| [object] | [what it tells you] | [roles or systems] | [name, department] | [the decision] | [route cost] |
| [object] | [what it tells you] | [roles or systems] | [name, department] | [the decision] | [route cost] |
| [object] | [what it tells you] | [roles or systems] | [name, department] | [the decision] | [route cost] |
| [object] | [what it tells you] | [roles or systems] | [name, department] | [the decision] | [route cost] |

## Confirmed routes

| Receiver (name, department) | Information | Cadence and form | Decision it changes | Confirmed by the receiver on |
|---|---|---|---|---|
| [name, department] | [object] | [how often, in what form] | [the decision, in the receiver's words] | [YYYY-MM-DD] |
| [name, department] | [object] | [how often, in what form] | [the decision, in the receiver's words] | [YYYY-MM-DD] |

**Number of routes confirmed by a named receiver**: [number]
**Routes proposed but not confirmed**: [which, and why the receiver could not be reached or would not commit]

## Reusable lesson from this process

**Lesson stated as a pattern, not as a product name**: [what was learned here that another process would otherwise have to learn again]
**Where the lesson is written down**: [register entry, playbook, ticket, or: nowhere yet]
**Evidence that a lesson from here already changed something elsewhere**: [the other process, the change, the date — or: none found, and what was checked]

## What feeds the iteration trigger

**Signals from this section that should trigger the next iteration**: [which quantities or events, and at what threshold]
**Who watches them**: [name and role, and how often they look]

## Knowledge held by one person only

**Steps that stop if one named person is away**: [the steps and the person, or: none — and how that was checked]

*Scored as durability in the Cost of Change section; recorded here only as a pointer.*

## Verdict

**Knowledge flow class**: [KF-A, KF-B or KF-C]
**Rule that produced the class**: [which of the two conditions is met, with the evidence]
**Biggest unrouted information object**: [the object, and what it would take to route it]
**Assessor disagreement and how it was resolved**: [where they differed, and what was done]

## Open questions

- [what could not be established, and what would be needed to establish it]
- [what could not be established, and what would be needed to establish it]`,
  },
  {
    key: "diagnosis",
    label: "Diagnosis & Branch",
    order: 11,
    group: "decision",
    file: "11-diagnosis.md",
    gate: true,
    blocking: ["toolchain", "flow", "diagnostics", "cost-of-change"],
    description: "Where the problem sits: at the interfaces, in the process design, in the toolbox — or the step should be killed outright.",
    gateQuestion: "Is exactly one leading branch named, and is its condition evidenced rather than claimed?",
    template: `# Diagnosis & Branch — [process name]

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
- **Agreement on the leading branch**: [agreed / disagreed and on what]`,
  },
  {
    key: "increment",
    label: "Value Increment & Velocity",
    order: 12,
    group: "decision",
    file: "12-increment.md",
    gate: true,
    blocking: ["diagnosis"],
    description: "The heart of the method: cut the change into the smallest increment that still delivers value, name the addressable value behind the technology, and state how fast the next increment can ship.",
    gateQuestion: "Is there an increment that ships within one iteration cycle and delivers value on its own — not a phase of a big-bang plan?",
    template: `# Value Increment & Velocity — [process name]

> Fill every placeholder in square brackets. If you do not fill an optional block, delete the
> whole block — placeholders left standing count as unfinished work.

- **Process**: [process name]
- **Increment owner**: [name, job title, site]
- **Date**: [YYYY-MM-DD]
- **Leading branch from the diagnosis**: [Kill / Interfaces 1b / Interfaces 1a / Process design / Toolbox evolution]

## The increment

- **Increment in one sentence**: [what will be different afterwards, written as a state someone could walk in and observe — not as an activity and not as a project name]
- **Who will use it**: [named people, or a named role at a named site]
- **What the first real case looks like**: [the first genuine piece of work that runs through the new state, not a demonstration]
- **What was the full change before we cut it**: [the version people described when money and time were no object — recorded so it stops distorting the cut]

## Standalone value test

- **Value if nothing follows this increment**: [what the organisation still has twelve months from now if the team is pulled onto something else the day after this ships. Write the kept benefit concretely. If the honest answer is "nothing" or "the foundation for the next phase", this is a phase, not an increment — go back and cut differently.]
- **Who keeps that value**: [named role that holds it without any further help]
- **Why this is the smallest cut that still passes**: [what was removed on the last cut, and what happened when we tried to cut once more]

## Addressable value behind the technology

- **Technology or change being introduced**: [name the actual piece — a shared list, a form, an export, a status field, a rule, a small app]
- **Addressable quantity**: [how many cases per year, how many people, how much time or how many errors this piece touches across the organisation — a quantity, not money]
- **Source of that quantity**: [where the number comes from, with its confidence letter: S told to us, P sampled, I read from a system]
- **Share of that quantity this increment reaches**: [the part covered now — one site, one order type, one shift]
- **Rest of the quantity and who could reach it**: [what remains addressable, and who would have to pick it up]

## Velocity

- **One iteration cycle for this process**: [number of calendar days, and why that length — tie it to how long it takes this process to produce enough cases to read a result]
- **Increment ships by**: [YYYY-MM-DD]
- **Days from decision to in use**: [number of calendar days]
- **Longest single wait inside that**: [what it is, how long, who owns it]

### What would have to be true to ship it in half the time

| Condition | Owner | Inside the process owner's control? | What it would take |
|---|---|---|---|
| [condition] | [name] | [yes / no] | [the concrete action] |
| [condition] | [name] | [yes / no] | [the concrete action] |
| [condition] | [name] | [yes / no] | [the concrete action] |

- **Fastest realistic ship if all of the above were true**: [number of calendar days]

## Compounding

- **Same cut elsewhere**: [where the same piece would do the same job with no redesign — or: nowhere identified, and how we checked]

| Process or area | Same cut without redesign? | Who owns it | What tells us it matches |
|---|---|---|---|
| [process] | [yes / needs adaptation / no] | [name] | [the shared tool, handover or data point] |
| [process] | [yes / needs adaptation / no] | [name] | [the shared tool, handover or data point] |

- **Effect on the turn speed of the organisation**: [what this piece makes faster the second and third time it is used — and if it makes nothing faster, say so plainly]

## Deliberately cut out of this increment

- **Cut out**: [what was in the bigger version and is not in this one]
- **Why it was cut**: [what it would have added in days or risk]
- **Comes back when**: [the trigger or the next increment that carries it]

## Measurement

- **Number that must move**: [name and unit]
- **Baseline**: [value today, source, confidence letter]
- **Read when**: [date of the first reading, who reads it]
- **What counts as the increment having worked**: [the observable result, stated before we ship]

## Fallback

- **If it fails in production**: [how we return to the previous state, who does it, and within how long]

## Open questions

- [what could not be established, who has to establish it, by when]

## Optional — fill this block or delete it

### Next increment
- **Next increment already drafted**: [one sentence, in the same form as above]
- **What it needs from this one**: [the state this increment must have reached first]

### Replication
- **Second site or second team lined up**: [name and date]
- **Who would run it there**: [name]`,
  },
  {
    key: "iteration",
    label: "Iteration Hook",
    order: 13,
    group: "decision",
    file: "13-iteration.md",
    gate: false,
    blocking: ["increment"],
    description: "What triggers the next iteration, how fast it must come, and where the trigger is fed from — diagnostics or lessons learned.",
    template: `# Iteration Hook — [process name]

> Fill every placeholder in square brackets. If you do not fill an optional block, delete the
> whole block — placeholders left standing count as unfinished work.

- **Process**: [process name]
- **Component this hook watches**: [the component or step that was changed]
- **Owner of the hook**: [name, job title, site]
- **Date**: [YYYY-MM-DD]

## Component health and the cadence it demands

The rule applied here: a component that does not work reliably needs more testing, and more
testing needs a higher planned velocity. The cadence below is set from the health of the
component, not from whatever capacity happens to be spare.

- **Health class of the component**: [green = it runs and can be steered / yellow = it works but only under supervision / red = it does not reliably do its job]
- **What that health class is read from**: [the observation or figure behind the class, with its source and confidence letter]
- **Planned iterations per quarter**: [number, and the sentence that ties it to the health class]
- **Test runs planned per iteration**: [number, and what a test run consists of for this component]
- **Capacity reserved for this**: [whose time, how much per cycle, booked where]

## Triggers

A trigger without a stated threshold is not a trigger. A threshold without a named person who
looks at it is not a trigger either.

| Trigger | Fed from | Observable threshold | Who sees it first | How often they look | What it starts | Max days from signal to first action |
|---|---|---|---|---|---|---|
| [name] | [diagnostics / lesson learned] | [the number crossing a stated line, or the event] | [name, job title] | [cadence] | [the action that begins, and who may begin it without asking] | [number of days] |
| [name] | [diagnostics / lesson learned] | [threshold] | [name, job title] | [cadence] | [action] | [number of days] |
| [name] | [diagnostics / lesson learned] | [threshold] | [name, job title] | [cadence] | [action] | [number of days] |
| [name] | [diagnostics / lesson learned] | [threshold] | [name, job title] | [cadence] | [action] | [number of days] |

- **Who may start an iteration without asking**: [name and the limit of what they may start]

## Diagnostics feed

- **Numbers watched**: [which figures from the diagnostics layer feed the triggers above, each with its source]
- **Last time one of them crossed its line**: [date, which number, what happened next — or: never crossed since it has been watched, and since when]
- **How we know the measurement is still running**: [the check, who does it, how often]

## Lessons learned feed

- **Where a lesson gets written down**: [the place and the format, so that writing one down takes minutes and not an afternoon]
- **Who reads it and when**: [name, job title, cadence]
- **Last lesson that changed something**: [date, the lesson, what changed as a result — or: none yet, and since when this route has existed]
- **Lesson worth sending onward**: [which lesson from this process would help someone else, and what makes it transferable]

## Silence check

- **If no trigger fires for two cycles**: [what we do — because no signal usually means the measurement died, not that the process became perfect]
- **Who checks that the triggers are still alive**: [name, cadence]

## Next iteration review

- **Next iteration review date**: [YYYY-MM-DD]
- **Who attends**: [names and roles]
- **What has to be on the table**: [the figures and the lessons that must be present for the review to be worth holding]

## Open questions

- [what could not be established, who has to establish it, by when]

## Optional — fill this block or delete it

### Who else should receive this
- **Departments that would benefit**: [names of departments or teams]
- **What they would receive**: [the specific information, not "insights"]
- **Form it would reach them in**: [a short note, a standing agenda item, a shared list]
- **Escalation threshold**: [the value at which this stops being the process owner's call and goes up, and to whom]`,
  },
  {
    key: "business-case",
    label: "Business Case",
    order: 14,
    group: "decision",
    file: "14-business-case.md",
    gate: true,
    blocking: ["increment", "flow", "cost-of-change"],
    description: "From the impact conversation to a specific cost model: what changes, what it saves, how many people it touches, what it costs to get there, and when it pays back.",
    gateQuestion: "Is there a calculation whose inputs are individually named and either evidenced or explicitly marked as an estimate?",
    template: `# Business Case — [process name]

> Fill every placeholder in square brackets. If you do not fill an optional block, delete the
> whole block — placeholders left standing count as unfinished work.
> Every money figure in this document is a quantity multiplied by a rate, and both are named.
> No line may hide its arithmetic.

- **Process**: [process name]
- **Increment this case is built on**: [the one-sentence increment from the previous section]
- **Numbers supplied by**: [names and job titles of the people who gave each class of figure]
- **Date**: [YYYY-MM-DD]
- **Unit convention**: [state the currency and the period, and state where hours are used because no cost rate was available]

## What changes

- **What we would do differently**: [the concrete change: the named step, the state before, the state after]
- **Who notices it**: [named roles, and what each of them stops doing or starts doing]
- **What does not change**: [what stays exactly as it is — this keeps the case honest]

## Volume and reach

- **Cases per year**: [number — source, and E or A]
- **People affected**: [number, who they are, at which sites — source, and E or A]
- **Sites affected**: [names or count]
- **Period the case is calculated over**: [twelve months from the ship date, or state the period used and why]

## Benefit lines

E = evidenced: an artefact, a system extract or a counted sample stands behind it.
A = assumption: someone estimated it. The name of that person and the basis go in the last column.
CA = compounded assumption: both the quantity and the rate on that line are assumptions. A CA line
never enters the conservative case.

| # | What improves | Today | After | Difference per case | Cases per year | Rate used | Amount per year | E / A / CA | Source, or who assumed it and on what basis |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [what gets shorter, cheaper or stops going wrong] | [value and unit] | [value and unit] | [difference and unit] | [number] | [money or hours per unit, and where the rate comes from] | [amount] | [E / A / CA] | [source or estimator] |
| 2 | [second effect] | [value] | [value] | [difference] | [number] | [rate] | [amount] | [E / A / CA] | [source or estimator] |
| 3 | [second-order effect: rework, errors, expediting, overtime, chasing, stock, licences, external spend] | [value] | [value] | [difference] | [number] | [rate] | [amount] | [E / A / CA] | [source or estimator] |
| 4 | [third effect, or delete this row] | [value] | [value] | [difference] | [number] | [rate] | [amount] | [E / A / CA] | [source or estimator] |

- **Annual gross benefit**: [write it as the addition, with the actual line amounts, then the total]
- **Of which evidenced**: [total of the E lines only]
- **Of which assumed**: [total of the A and CA lines]

## Cost of change

Carried over from the Cost of Change section. Risk, effort and friction each cost something, and
each is paid by somebody.

| Cost item | Kind | Who pays it | Amount | One-off or per year | E / A | Source or who assumed it |
|---|---|---|---|---|---|---|
| [item] | [effort / friction / risk cover] | [team or role] | [amount] | [one-off / per year] | [E / A] | [source or estimator] |
| [item] | [effort / friction / risk cover] | [team or role] | [amount] | [one-off / per year] | [E / A] | [source or estimator] |
| [item] | [effort / friction / risk cover] | [team or role] | [amount] | [one-off / per year] | [E / A] | [source or estimator] |

- **One-off cost of change**: [write it as the addition, then the total]
- **Running cost per year**: [write it as the addition, then the total]
- **Main barrier this spend buys past**: [the single largest barrier named in the Cost of Change section, and what specifically removes it]

## Net and payback

- **Net annual benefit**: [annual gross benefit minus running cost per year — write both numbers and the result]
- **Payback period**: [one-off cost divided by one twelfth of the net annual benefit — write the division out and give the result in months]
- **Arithmetic in full**: [repeat both calculations with the real numbers on one line each, so a reader can redo them without opening anything else]

## The floor

- **Conservative case**: [net annual benefit counting only the E lines — write the addition and the result]
- **Payback on the conservative case**: [write the division out and give the result in months]
- **Lines the owner would defend in front of a finance reviewer**: [which line numbers, and why those]

## Evidence and assumption ledger

| Input | Value used | E or A | Who supplied it | How it could be evidenced | By when | Who gets it |
|---|---|---|---|---|---|---|
| [input] | [value] | [E / A] | [name] | [the extract, count or sample that would settle it] | [YYYY-MM-DD] | [name] |
| [input] | [value] | [E / A] | [name] | [what would settle it] | [YYYY-MM-DD] | [name] |
| [input] | [value] | [E / A] | [name] | [what would settle it] | [YYYY-MM-DD] | [name] |

## Open data points

- [what could not be answered, who supplies it, by when]
- [what could not be answered, who supplies it, by when]

## Optional — fill this block or delete it

### Sensitivity
- **Accepted payback limit**: [number of months, and who set that limit]
- **Break-even input**: [the single input that matters most, and how far it would have to be wrong before the payback exceeds the accepted limit]
- **Cost rate source**: [where the money-per-hour or money-per-case figure comes from, and who owns that figure]`,
  },
];

export const sectionByKey: Record<string, Section> = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));
export const groupById: Record<string, SectionGroup> = Object.fromEntries(SECTION_GROUPS.map((g) => [g.id, g]));

/** Sections of a group, in order. */
export function sectionsOf(groupId: string): Section[] {
  return SECTIONS.filter((s) => s.group === groupId).sort((a, b) => a.order - b.order);
}

/** Sections that may be worked right now: every blocker complete. */
export function unlocked(doneKeys: string[]): Section[] {
  const done = new Set(doneKeys);
  return [...SECTIONS].sort((a, b) => a.order - b.order).filter((s) => s.blocking.every((b) => done.has(b)));
}

/** True when every blocker of `key` is complete. */
export function isUnlocked(key: string, doneKeys: string[]): boolean {
  const s = sectionByKey[key];
  if (!s) return false;
  const done = new Set(doneKeys);
  return s.blocking.every((b) => done.has(b));
}

/** Sections whose gate must pass for the engagement to continue. */
export const GATES: Section[] = [...SECTIONS].sort((a, b) => a.order - b.order).filter((s) => s.gate);
