# Problem Clusters — [process name]

Advisory pass A2 of 4 · Derived proposals · Reads: Mapping, Toolchain, Flow, Diagnostics, and the rest of the anamnesis

> **Everything on this sheet is a proposal, not a finding.** The findings
> themselves come from the anamnesis and are established reality. The grouping, the severity and the
> dissolution line are derived — cheap to produce and wrong often enough that they must never be
> repeated as something the process owner said.
>
> Fill every placeholder in square brackets. A cluster that cannot be given a class by the rules
> below is not a cluster yet; put its findings in the singleton list instead of guessing.

- **Process**: [process name]
- **Engagement**: [engagement title]
- **Pass run on**: [YYYY-MM-DD]
- **Run by**: [the portal, a named assistant, or a named person]
- **Sections read**: [the section keys that had content]
- **Sections still empty**: [the section keys with no artefact — or: none]
- **Findings harvested**: [number]
- **Clusters formed**: [number] · **Findings left as singletons**: [number]
- **Highest class on this process**: [S1, S2, S3 or S4]
- **If only one cluster is dissolved, dissolve this one**: [cluster id, and one line on why it is that one]

## How severity is assigned on this sheet

Severity is read off two ladders, in this order. It is not a judgement of how annoying, how
visible, how political or how often complained about something is — none of those move either
ladder. Nor is it the cost of the fix; that lives in the dissolution line.

**Ladder 1 — consequence.** What the cluster does to the next increment on this process. A cluster
takes the highest rung any finding in it reaches.

| Rung | Name | Passes when this is observably true |
|---|---|---|
| 4 | blocking | No increment can be shipped or read on this process until it is dissolved. A knock-out recorded as failed sits here: no named owner with authority to change, timestamps not obtainable, systems that cannot be read out. |
| 3 | distorting | An increment can ship, but the number that decides it cannot be trusted: the figure a decision rests on is at level S, or two sections state different values for the same quantity. |
| 2 | slowing | Increments ship and can be read; the cluster adds elapsed time or hands to every cycle — the same data entered twice, a wait on a party the engagement does not control, a handover that only forwards. |
| 1 | local | Costs work inside one step and touches neither the ability to ship nor the ability to read a result. |

**Ladder 2 — spread.** How much of the process the cluster holds. Counted, not estimated, against
one named node list.

| Rung | Passes when this is observably true |
|---|---|
| 4 | Every step — or the same cluster would appear on another process named in the anamnesis (same tool, same handover, a compounding candidate). |
| 3 | More than half the steps, or the step that carries the dominant latency. |
| 2 | Two or three steps, or one gate. |
| 1 | One step. |

**Class.** First rule that fires.

| Class | Fires when |
|---|---|
| **S1 — critical** | consequence 4 · or consequence 3 with spread 3 or 4 |
| **S2 — serious** | consequence 3 · or consequence 2 with spread 4 |
| **S3 — material** | consequence 2 · or consequence 1 with spread 3 or 4 |
| **S4 — minor** | anything else |

**Two caps and one tie-break**, so that a second reader lands on the same ranking:

- **The S-evidence cap.** A cluster whose findings all carry confidence S cannot be classed above
  S2. Its first move is to raise the evidence, not to change the process.
- **The recorded-verdict floor.** A knock-out recorded as failed in a gate verdict is consequence 4,
  whatever else the cluster contains.
- **Order inside a class**: more sections drawn from first; then the best confidence letter among
  the findings, I before P before S; then cheaper to dissolve first.

**When two readers disagree** by more than one rung on either ladder, the evidence gets pulled and
re-read. It does not get averaged. Record both readings and what settled it.

- **Node list severity was counted against**: [mapping step sequence / diagnostics value stream skeleton], [number] steps
- **Second reader**: [name — or: none, and the ranking is one person's reading]
- **Where the two readings differed and what settled it**: [the cluster, the ladder, and the evidence that decided it — or: no second reading]

## 1. Cluster register

Ranked. Highest class first, then by the tie-break above.

| Rank | id | Cluster | Class | Consequence | Spread | Sections it draws from | Findings | Dissolved by | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | P1 | [short name, in the words of the process, not of a method] | [S1–S4] | [rung and name] | [rung] | [section keys] | [number] | [the intervention in five words] | [open / accepted / rejected / deferred] |
| 2 | P2 | [short name] | [S1–S4] | [rung and name] | [rung] | [section keys] | [number] | [the intervention in five words] | [open / accepted / rejected / deferred] |

The verdict column is a pointer. The reason, the person and the date sit in the ledger in section 6,
which is the record that matters when the same grouping is proposed again a year from now.

## 2. The clusters

### P1 — [short name]

- **What binds these findings**: [the one shared cause, written as a state a second person could walk in and check. Not a theme, not a category — a cause such that removing it moves every finding below.]
- **Class**: [S1–S4]
- **Consequence rung, because**: [rung, then the observable state that puts it on that rung]
- **Spread rung, because**: [rung, then the count — which steps, out of how many]
- **Evidence floor**: [the weakest confidence letter among the findings below, and whether the S-evidence cap applies]

| Finding | Section | Field or line it comes from | What it says | Confidence |
|---|---|---|---|---|
| [the finding in one line] | [section key] | [the exact field label or table row] | [what the anamnesis states, not what you infer from it] | [S, P, I, or a recorded verdict] |
| [the finding in one line] | [section key] | [the exact field label or table row] | [what the anamnesis states] | [S, P, I, or a recorded verdict] |

- **What this does to the next increment**: [concretely — what would go wrong on the next cut, and at which point in it]
- **Symptomatic treatment, and what it leaves behind**: [the obvious move that treats the symptoms without touching the cause, and what would still be true afterwards]
- **What it would take to dissolve it**: [the intervention that removes the cause, its owner by name, and what it costs in iteration cycles. Name the kind of intervention, not the product — tools belong in the target technology pass.]
- **How we would know it dissolved**: [the observable state, and the field in which section would read differently]
- **Confidence in the cluster itself**: [high / medium / low, and why — how many independent sections carry it, and whether any of it rests on a section that is still empty]

### P2 — [short name]

- **What binds these findings**: [the one shared cause, as an observable state]
- **Class**: [S1–S4]
- **Consequence rung, because**: [rung, then the observable state]
- **Spread rung, because**: [rung, then the count]
- **Evidence floor**: [weakest confidence letter, and whether the cap applies]

| Finding | Section | Field or line it comes from | What it says | Confidence |
|---|---|---|---|---|
| [the finding in one line] | [section key] | [the exact field label or table row] | [what the anamnesis states] | [S, P, I, or a recorded verdict] |
| [the finding in one line] | [section key] | [the exact field label or table row] | [what the anamnesis states] | [S, P, I, or a recorded verdict] |

- **What this does to the next increment**: [concretely]
- **Symptomatic treatment, and what it leaves behind**: [the obvious move, and what survives it]
- **What it would take to dissolve it**: [the intervention, its owner, its cycles]
- **How we would know it dissolved**: [the observable state, and which section's field changes]
- **Confidence in the cluster itself**: [high / medium / low, and why]

## 3. Findings that did not cluster

A finding that appears in only one section is a finding, not a cluster. It is kept here so that
nothing harvested disappears, and so that the next pass can see whether it has since acquired
company.

| Finding | Section | Field it comes from | Confidence | Why it is not in a cluster |
|---|---|---|---|---|
| [the finding in one line] | [section key] | [field label] | [S, P, I, or a recorded verdict] | [one section only / no shared cause with any cluster / would be a cluster if a named section were filled] |

## 4. Cross-cluster reading

- **Cluster whose dissolution shrinks the others**: [id, which clusters shrink, and by what mechanism — or: none, the clusters are independent]
- **Clusters that share an owner**: [ids and the named owner, so they can be taken to that person once instead of three times]
- **Clusters that would also appear on another process**: [ids, and the process or component named in the anamnesis where the same cause sits]

## 5. What this pass could not see

- **Sections still empty, and which clusters would change if they were filled**: [section keys and cluster ids — or: every section was filled]
- **Clusters that rest on a single source**: [ids, and the one artefact each rests on]
- **Findings deliberately not harvested**: [what was left out, and why — for example a section whose verdict was recorded but whose evidence line was empty]

## 6. Verdict ledger

A cluster is accepted when the people who filled the sections agree it is one thing with one cause.
Rejected means the grouping is wrong — and the reason is the most useful line on the sheet, because
the next pass will otherwise propose it again. Deferred names what would bring it back.

| id | Cluster in one line | Verdict | Reason | Decided by | Date |
|---|---|---|---|---|---|
| P1 | [one line] | [accepted / rejected / deferred] | [the reason — required for rejected and deferred] | [name and role] | [YYYY-MM-DD] |
| P2 | [one line] | [accepted / rejected / deferred] | [the reason] | [name and role] | [YYYY-MM-DD] |

- **Clusters proposed**: [number] · **Accepted**: [number] · **Rejected**: [number] · **Deferred**: [number] · **Undecided**: [number]
