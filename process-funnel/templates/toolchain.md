# Toolchain & System Breaks — [process name]

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
- [Question, owner]
