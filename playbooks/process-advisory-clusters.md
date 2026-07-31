# Advisory prompt — Problem Clusters (advisory pass A2 of 4)

Advisory key: `clusters` · Order 2 · Reads: `mapping`, `toolchain`, `flow`, `diagnostics` — and the whole anamnesis besides

You are the pass. This file is your instruction, not a description of it. Follow it.

---

## 1. What this pass is for

Fourteen artefacts each carry their findings in their own file. Read one at a time, they look like
fourteen small problems with fourteen small answers. Read together, three or four of them are
usually one problem wearing different clothes, and the answer to that one problem is a different
answer from any of the four.

This pass harvests the findings from all fourteen sections, groups them by **shared cause**, ranks
the groups by **severity**, and says for each one what it would take to **dissolve** it rather than
treat its symptoms.

It is the central summary Thomas asked for: one place per process where the severity is visible
without reading everything.

## 2. The rule that matters more than anything else in this file

The findings are **established reality** — they were stated by named people in sessions. The
**grouping, the severity and the dissolution line are yours**, and they are derived, cheap and
sometimes wrong.

What follows:

- **Never restate a proposal as a finding.** In the finding tables, the "What it says" column carries
  what the anamnesis states — not what you conclude from it. Your conclusion belongs in the binding
  line and the dissolution line, where it is visibly yours.
- **Every cluster carries a stable id** — P1, P2, P3 — so a verdict can be attached. Ids are never
  reused and never renumbered, including for rejected clusters. A rejected P3 stays P3, because the
  reason it was rejected is what stops the same grouping being proposed again next quarter.
- **Cite everything.** Every finding row names the section key and the exact field label or table
  row it came from. A finding you cannot cite did not come from the anamnesis, and it does not go on
  the sheet.

## 3. Harvesting the findings

Go section by section, in order. Take what the artefact **states**, not what you infer. A finding is
a recorded verdict, a class, a count, a named gap, a confidence letter under a decision, or an
explicit "none found".

The fields that most reliably produce findings, per section — start here, then read the rest of the
artefact:

| Section | Where the findings usually are |
|---|---|
| `profile` | **Gate verdict** · **Owner authority** and **Evidence of authority** · **Champion capacity** · **Runs per year** with **Source of that number** · **Who carries a saving** |
| `purpose` | **Gate verdict** · **Threshold basis** · **Kill check** · **What stops that today** · **Disagreement on record** |
| `mapping` | **Map last edited** · **Steps that happen but are not in the map** · **Steps in the map that no longer happen** · **Steps nobody could name a role for** · **Artefacts unchanged for more than 24 months while workarounds exist around them** · **Share of runs that follow the main path** |
| `toolchain` | **Total breaks on the main path** · **The same information is entered more than once at** · **Data objects with no named leading system** · **Blocked interfaces** · **Tools from which data was actually extracted today** |
| `flow` | **Longest single wait in the whole process** · **Share of elapsed time that is waiting, not working** · **Waits caused by a decision that only one named person can take** · **Hand-offs that only forward or approve without changing anything** · **Rework loops seen** · **Steps for which no consumer could be named** · **Where batching creates the wait** |
| `kpi` | **Criteria with no indicator at all** · **Cadence verdict** · **Calibration verdict** · **Increment verdict** · **Known false alarms** · **Time until an improvement shipped today becomes visible in the numbers** |
| `diagnostics` | **Gate decision** · **Value stream map producible today** · **Steps still dark after the sweep** · **Dominant latency sits** with **Confidence level of the dominant latency figure** · **Measurement lead time** · **Works council status** and **Data protection status** |
| `literacy` | **Readiness class** · **Gap between demanded and measured** · **Main organisational barrier** · **Fastest change cadence this organisation has actually absorbed** · **Self-assessment vs observation gap** |
| `cost-of-change` | **Cost-of-change class** · **Parties whose schedule the engagement does not control** · **Recurring manual step the result depends on** · **The one barrier that would lower the class by one step** · **Assessor disagreement** |
| `knowledge` | **Loop verdict** · **Knowledge flow class** · **Routes proposed but not confirmed** · **Biggest unrouted information object** · **Steps that stop if one named person is away** |
| `diagnosis` | **Branch** · **Confidence of the numbers that decide the branch** · the branches ruled out and what would revisit them |
| `increment` | **Value if nothing follows this increment** · **Longest single wait inside that** · **Days from decision to in use** · conditions in the half-the-time table with no owner · **Effect on the turn speed of the organisation** |
| `iteration` | **Who may start an iteration without asking** · **Last time one of them crossed its line** · **Last lesson that changed something** · **If no trigger fires for two cycles** |
| `business-case` | **Of which assumed** against **Of which evidenced** · **Payback period** · **Main barrier this spend buys past** · the open data points |

An empty section produces no findings and is named as empty. Do not treat an empty section as a
finding; treat it as a limit on this pass, recorded in section 5 of the artefact.

## 4. What a cluster is

A cluster is a set of findings with **one shared cause, such that removing the cause moves all of
them**.

Three tests, applied before a cluster is written:

1. **The removal test.** If the cause you named were gone tomorrow, would every finding in the
   cluster shrink or disappear? If one of them would not, it does not belong — take it out.
2. **The two-section rule.** A cluster draws on findings from at least two sections. A pattern that
   lives entirely inside one section is a finding, not a cluster; it goes in the singleton list.
3. **The cause is a state, not a theme.** "Data quality" and "communication" are themes, and a theme
   dissolves nothing. "The order number is retyped at three of the five handovers because no system
   passes it on" is a cause, and you can act on it.

Volume: **two to six clusters on a normal process.** More than six means you grouped by theme rather
than by cause — merge them. Exactly one means either a very simple process or a cluster that is
really three; say which it is.

Every harvested finding ends up in **exactly one** cluster or in the singleton list. Nothing appears
twice. If a finding seems to belong to two clusters, either the two clusters share a cause and are
one, or the finding is a cause in one and a symptom in the other — say which, and put it where it is
the symptom.

## 5. Severity, and why it is defined this hard

Severity that is left to feel gets argued about instead of acted on, and two honest people rank the
same finding three classes apart. So it is read off two ladders whose rungs are observable states,
and the class follows from the two rungs by a fixed rule. The full definition is in the artefact
itself, not only here, because a reader has to be able to check the ranking without this file.

**Ladder 1, consequence** — what the cluster does to the next increment, which is the thing this
whole unit exists to produce. Rung 4 blocking, 3 distorting, 2 slowing, 1 local. The cluster takes
the **highest** rung any finding in it reaches.

**Ladder 2, spread** — how much of the process it holds, counted against one named node list. Rung 4
whole process or a second process, 3 more than half the steps or the dominant latency step, 2 two or
three steps or one gate, 1 one step.

**Class** — first rule that fires: S1 critical, S2 serious, S3 material, S4 minor.

Three rules keep the ranking stable across readers:

- **The S-evidence cap.** A cluster whose findings all carry confidence S cannot be classed above
  S2. It may still be the worst thing on the process — but on self-report alone you cannot know
  that, and the first move is to raise the evidence, not to change the process. Say that in the
  dissolution line.
- **The recorded-verdict floor.** A knock-out recorded as failed — no named owner with authority,
  timestamps not obtainable, systems that cannot be read out — is consequence 4, whatever else the
  cluster holds. It was a signed human verdict, not an inference.
- **Order inside a class**: more sections drawn from first; then the best confidence letter among
  the findings, I before P before S; then cheaper to dissolve first.

**What severity is not**: how annoying it is, how visible it is, how senior the person complaining
is, how often it comes up, or how expensive the fix would be. None of those move either ladder. Cost
lives in the dissolution line, where it can be argued with separately.

**Disagreement**: if a second reader lands more than one rung away on either ladder, the evidence
gets pulled and re-read. It does not get averaged. Record both readings and what settled it — the
same rule the cost-of-change section uses between its two assessors, and for the same reason: an
averaged disagreement hides the fact that two people read the same artefact differently.

Fill in the second-reader fields honestly. "None, and the ranking is one person's reading" is a
perfectly good entry and it tells the next reader exactly how much to trust the order.

## 6. Dissolving instead of treating

For every cluster, three lines, in this order, and the order is the point:

1. **The symptomatic treatment** — the obvious move that makes the findings less visible without
   touching the cause, and **what would still be true afterwards**. Writing this down first is what
   stops the sheet from recommending it by accident.
2. **What it would take to dissolve it** — the intervention that removes the cause, its owner by
   name, and what it costs in iteration cycles. Name the **kind** of intervention, not the product.
   "The order number is passed by the system that already holds it, instead of retyped" is the
   dissolution; which system, and whether it is a field, an export or a small app, is the target
   technology pass (A4). Naming a product here is how a cluster sheet quietly turns into a purchase
   decision that nobody reviewed.
3. **How we would know it dissolved** — the observable state, and **which field in which section
   would read differently**. If you cannot name a field that changes, you have not described
   something checkable.

Keep the north star visible while you write these: cost savings through transformation speed. A
cluster that costs a week of work every cycle is worse than one that costs a day of work once, even
if the second looks larger on the page. That is what ladder 1 encodes, and the dissolution line
should say what the cluster costs *per cycle* wherever the record supports it.

## 7. Discipline

- **Never invent a finding.** Every row cites a section and a field. If it is not in the anamnesis,
  it does not exist for this pass.
- **Never invent a number, a benchmark, a system name, a site or a policy.** The shared stance rules
  apply to you unchanged.
- **Do not upgrade a confidence letter.** If the anamnesis says S, the finding row says S, and the
  cap applies.
- **Do not cluster around a person.** "Everything depends on one named person" is a legitimate
  cluster when the anamnesis states it as an observable state — steps that stop when that person is
  away — and it is written as a property of the process, never as an assessment of the person.
- **Say when a cluster is thin.** A cluster resting on one artefact, or on a section that is still
  empty, is marked low confidence. A confidently ranked cluster built on a thin file is the single
  most damaging thing this pass can produce.
- **Do not re-open a rejected cluster** without saying what changed in the anamnesis since it was
  rejected.

## 8. Language

The artefact is written in English, like every artefact in this engagement.

Cluster names are in the words of the process, not of a method: "the order number is retyped at
every handover", not "data integration deficiency". Where the anamnesis carries a shop-floor term
(Werk, Laufkarte, Freigabe, Schicht, Störung), keep it, so the person who described the process
recognises it in the cluster name.

## 9. What makes this pass fail

- Clusters that are themes: data quality, communication, transparency, culture.
- A severity class that does not follow from the two rungs stated next to it.
- A cluster ranked above S2 on self-report evidence alone.
- A dissolution line that names a product.
- A finding in two clusters, or a harvested finding that appears nowhere.
- Any finding without a section and a field behind it.
- A ranked list with no statement of what the pass could not see.

## Target output format

Produce exactly this document. Fill every placeholder; the finished file contains no square
brackets. Keep the headings and the bold field labels verbatim — the portal reads them. Add cluster
blocks and table rows as the process needs them, and delete the unused P2 block rather than leaving
its placeholders standing.

```markdown
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
```
