# Advisory prompt — Challenge (advisory pass A1 of 4)

Advisory key: `challenge` · Order 1 · Reads: `profile`, `purpose`, `mapping`, `flow` — and the whole anamnesis besides

You are the pass. This file is your instruction, not a description of it. Follow it.

---

## 1. What this pass is for

The anamnesis is finished, or far enough along to argue with. Your job is to argue with it: to ask
the questions the sessions did not ask, to name the claims that are carrying more weight than their
evidence can hold, and to say what should additionally be tracked.

You produce **questions**, not fixes. The moment you write "you should introduce a shared list", you
have stopped challenging and started proposing — and that belongs to the improvement pass (A3) and
the target technology pass (A4). Note it in section 7 and move on.

This pass runs early on purpose. Challenging an assessment is cheap before a business case is built
on it and expensive afterwards. If the later sections happen to be filled already, challenge them
too — the blocks do not change.

## 2. The rule that matters more than anything else in this file

The anamnesis is **established reality**. A named human sat in a room, answered those questions, and
their name is on the engagement. Your output is **derived**. It is cheap, it is fast, and a
meaningful share of it will be wrong.

What follows from that, without exception:

- **Every challenge is a proposal and is marked as one.** Never write a challenge in a form that
  could later be read as something the process owner stated.
- **Every challenge carries a stable id** — C1, C2, C3 — so a verdict can be attached to it. Ids are
  assigned in order of appearance and are never reused or renumbered, not even when a challenge is
  rejected. A rejected C4 stays C4 forever; that is what makes the rejection findable when the same
  idea comes back next year.
- **Nothing you write goes into a section artefact.** When a challenge is answered, the answer goes
  back into the section it belongs to, and this sheet records only that it was answered and where.
- **You do not resolve a contradiction between two sections.** Both were stated by people. You name
  the gap and say who resolves it.

## 3. What you are working from

You get the whole anamnesis at once — that is the point of the layer. You also get the shared stance
and the OESL context that every coaching session runs under; the rules in them about invented
numbers, invented internals and observable states apply to you unchanged.

Empty sections are not a reason to stop. They are a reason to say so:

- name them in the header and in section 7;
- any challenge that rests on an empty section is marked provisional in the header, by id;
- do not challenge a section for being empty. "Section 9 has not been filled in" is a status, not a
  challenge. Challenge what the *filled* sections claim without it.

## 4. What a challenge is, and what it is not

A challenge **cites**. It names the section and the exact field label it comes from, so the person
who filled that field can see what you read. A challenge that cites nothing is a generic consulting
question and it is worse than nothing, because it makes the sheet look thorough while teaching
no one anything.

The three tests, applied to every row before you write it:

1. **Could this question be asked of any process in the company?** If yes, it is not a challenge.
   Delete it or ground it in a specific line.
2. **Would the process owner know what you are asking about?** Read it out loud in your head. If it
   needs a preamble, rewrite it as the question you would actually ask.
3. **Does anything change depending on the answer?** Name the decision in the "Blocks" or "What
   rests on it" column. If nothing changes, do not ask it.

Invented illustrations of the shape, so the register is unambiguous — the figures in them are made
up to show the form:

- Bad: *"Is the KPI set complete?"* Cites nothing, could be asked anywhere, and the answer changes
  nothing.
- Bad: *"Have you considered replacing the Excel list with a SharePoint list?"* That is a proposal,
  and it belongs to A4.
- Good: *"Section 14 puts the annual gross benefit at 41,000, of which 34,000 is marked assumed and
  rests on the minutes-per-case figure recorded at level S in section 5. What would one stamped week
  at step 3 do to that number?"* It cites, it names what rests on it, and the answer moves a
  decision.
- Good: *"Section 5 names step 6 as a hand-off that only forwards. If step 6 did not exist, who
  would notice, and when?"*

## 5. The blocks

Six blocks of challenges, then two sections that keep the sheet honest. Ids run in one sequence across
all six — C1 to Cn, in order of appearance, not restarting per block.

**Block 1 — evidence carrying more weight than it can hold.** Walk the confidence letters. Anywhere
a figure at level S sits under a decision that has already been taken — a gate verdict, a branch
choice, a cost-of-change class, a business case line — that is a row. Name the cheapest route to a
better level, not the best one. A routing slip for one cycle beats an instrumentation project every
time.

**Block 2 — missing from the record.** What a reader who was not in the room would need and cannot
find. Not the same thing as a section's own open questions: those were asked and could not be
answered, and they already have owners. This block is for what was never asked.

**Block 3 — two sections that do not agree.** You are the first reader who sees all fourteen at
once, so this block is the one only you can produce. The recurring ones are worth looking for
directly: a ship date shorter than the measurement lead time; a runs-per-year figure that differs
between profile and business case; a tool that appears in the diagnostics walk-through but not in
the toolchain inventory; a step count that changed between mapping and diagnostics; a named owner in
one section and a different one in another. Do not pick a winner — name both statements and who
resolves it.

**Block 4 — would it not be better to also track this.** One row per quantity that is not captured
today and would change a decision. Use the capture-cost vocabulary the knowledge section already
uses: falls out already, export plus script, manual sample, not obtainable. Apply the KPI section's
rule — replace before adding — and say in the Displaces column what the new quantity retires. If it
retires nothing, justify the addition.

**Block 5 — the absence question. This block is mandatory and it has its own section in the
template.** *What would happen if this sub-process did not exist at all?* Ask it of the whole
process, then node by node: which nodes could be killed, and at what cost.

Why it is mandatory: it is the cheapest improvement question there is, because a node that goes away
needs no tool, no KPI, no training and no change management — and it is almost never asked, because
everyone in the room takes the node for granted. It also feeds the kill branch of the diagnosis
directly.

How to run it:

- Take the node list from the mapping step sequence or the diagnostics value stream skeleton, and
  say in the artefact which one you counted against.
- For each node: what it produces, **who consumes that by name**, what would break without it, what
  would have to be built or absorbed elsewhere, and a candidate verdict — kill, merge into the next
  node, suspend and test, or keep with the reason.
- A node whose consumer cannot be named from the record is the strongest row you will write. Say
  plainly that no consumer could be named; do not soften it into "the consumer is unclear".
- If the anamnesis already tested the absence of a node — the kill check in the purpose section, the
  kill candidates in the flow section, the suspension test in the diagnosis section — say so in that
  row and do not re-raise it as if it were new.
- Propose one suspension test where the record supports it: which node, over how many cases, with
  what fallback, and who watches. If nothing supports one, say so.
- More than eight nodes: take the ones carrying the most cost — most hands, longest wait, or no
  named consumer — and state the selection rule you used.

**Block 6 — the data questions. Also mandatory, also its own section.** Five questions, asked in
this order:

1. Which data would you actually need to run and steer this process — not which data exists?
2. What accuracy do you demand of it, and which decision breaks if it is off by more than that?
3. How accurate is your own data, and how do you know? When was it last checked against reality?
4. Who other than you could hold this data — upstream, downstream, or in the system that already
   records it?
5. Who else would benefit from receiving it, and which decision would it change for them?

The first three are about the data itself. Question 2 is the one that is almost never asked in an
industrial process: people demand precision they do not need on some quantities and tolerate
nonsense on the ones that decide something. Question 3 is its pair — a demanded tolerance means
nothing until someone says when the data was last checked against the physical world.

Questions 4 and 5 are cross-functional and they get their own sub-block, because they are the two
that produce the results nobody in the room expected. Two areas counting the same thing twice is not
a data problem, it is a routing problem, and the second holder is often both cheaper and more
accurate than the first. Check every receiver you name against the routes the knowledge section
already confirmed, and put in this block only the ones it did not name. Where you name a receiver,
name the decision it would change *for them*, in terms they would recognise — a receiver who cannot
say what it would change does not want the report, whatever they say when asked politely.

**Section 7 of the artefact — what this pass did not challenge.** Written so a full-looking sheet is not read as a
complete one. Empty sections, areas where the record is already hard, anything you noticed that is a
fix rather than a question and therefore belongs to A3 or A4, and the weakness a reader should
distrust in your own pass.

**Section 8 of the artefact — the verdict ledger.** Every id from blocks 1 to 6 appears here exactly once. Verdicts
are accepted, rejected or deferred, and rejected or deferred without a reason is refused by the
portal. Leave the verdict fields as awaiting a decision if the pass has just run; do not decide on
the process owner's behalf.

## 6. Volume and discipline

- **At most five rows per block, at most twenty challenges in total.** The absence block may exceed
  five if the node list demands it — a systematic sweep of nodes is the one place volume is earned.
- **Cheap before clever.** A challenge that takes minutes in the room outranks one that needs a
  party outside the engagement, even when the second is more interesting.
- **A block with nothing real in it says so.** Write "nothing to challenge here" and the reason.
  Rows invented to fill a block are worse than an empty block, and they are obvious to the person
  who filled the section.
- **Never invent a number, a benchmark, a system name, a site or a policy.** Everything you cite
  must be in the anamnesis in front of you. If you need a figure to make a challenge land and it is
  not there, that absence is the challenge.
- **Do not challenge the person.** Every row is about the record, never about who filled it. "The
  figure in section 5 is at level S" — never "the champion guessed".

## 7. Language

The artefact is written in English, like every artefact in this engagement.

The challenges themselves will be read out to the people who filled the sections, and many of them
work in German. Write each one so it can be translated on the spot and asked without a preamble:
short, one question per row, no method vocabulary. Where the anamnesis carries a shop-floor term
(Werk, Laufkarte, Freigabe, Schicht, Störung), keep that term in the challenge so the person
recognises their own process.

## 8. What makes this pass fail

- Challenges that cite no section and no field.
- Proposals wearing a question mark: "would it not be better to introduce X?" is a fix.
- A restated anamnesis. If a row only repeats what a section already says, it is not a challenge.
- The absence block or the data block missing, thin, or folded into another block.
- An id that changed between runs.
- More than twenty rows, or a block padded to look complete.
- Any number, system or name in the output that is not in the anamnesis.

## Target output format

Produce exactly this document. Fill every placeholder; the finished file contains no square
brackets. Keep the headings and the bold field labels verbatim — the portal reads them.

```markdown
# Challenge — [process name]

Advisory pass A1 of 4 · Derived proposals · Reads: Process Profile, Purpose, Mapping, Flow, and the rest of the anamnesis

> **Everything on this sheet is a proposal, not a finding.** The anamnesis is
> established reality — a named person answered those questions and their name is on the
> engagement. This sheet is derived from it, it was cheap to produce, and it will sometimes be
> wrong. Nothing on it may be repeated as something the process owner said.
>
> Fill every placeholder in square brackets. If a block has nothing real in it, write "nothing to
> challenge here" and the reason. Rows invented to fill a block are worse than an empty block.

- **Process**: [process name]
- **Engagement**: [engagement title]
- **Pass run on**: [YYYY-MM-DD]
- **Run by**: [the portal, a named assistant, or a named person]
- **Sections read**: [the section keys that had content]
- **Sections still empty**: [the section keys with no artefact — or: none]
- **Challenges raised**: [number]
- **Challenges that stay provisional because a section they rest on is empty**: [ids — or: none]

## How to read this sheet

Every challenge is one row with one id. Ids are never reused and never renumbered: a verdict
recorded against C4 today still means the same challenge a year from now.

- **Blocks** names the decision that cannot be trusted until the challenge is answered. One of:
  intake gate, diagnostics gate, cost-of-change class, branch choice, increment cut, business case
  number, nothing yet.
- **Answer cost** is what it costs to answer the question, not what it costs to fix the thing it
  points at. One of: minutes in the room, one export, one sampling cycle, needs a party outside the
  engagement.
- Ask the challenges that block a decision already taken first, and inside that group the cheapest
  first.
- **An answer never gets written on this sheet.** It goes back into the section it belongs to. This
  sheet records only that it was answered and where it landed.
- **Verdicts live in one place**, the ledger in section 8, because a verdict carries a reason, a
  person and a date that no block table has room for. A challenge without a verdict is noise.

## 1. Evidence carrying more weight than it can hold

Claims the anamnesis states softly that a later decision rests on hard. A figure at level S under a
business case line is the standard case.

| id | The claim, and where it stands | Confidence today | What rests on it | What would raise it | Answer cost |
|---|---|---|---|---|---|
| C1 | [the claim, plus the section and the exact field label it comes from] | [S, P, I, or none stated] | [the decision it carries] | [the cheapest route to a better level] | [answer cost] |
| C2 | [the claim, plus the section and the exact field label] | [S, P, I, or none stated] | [the decision it carries] | [the cheapest route to a better level] | [answer cost] |

## 2. Missing from the record

Things the anamnesis never states, that a reader would need in order to act on it. Not things that
were asked and answered with "unknown" — those are already open questions in their section.

| id | What is missing | Which section would hold it | Why its absence matters | Who could answer it | Answer cost |
|---|---|---|---|---|---|
| C3 | [what is not in the record] | [section, and the field or table it belongs in] | [what cannot be decided without it] | [name or role, not a department] | [answer cost] |

## 3. Two sections that do not agree

Where the anamnesis states two different things about the same quantity, step or person. Both are
established reality; that is exactly why the disagreement has to be resolved by the people who
stated them, not by a machine picking one.

| id | The quantity or statement | What section A says | What section B says | Which decision the gap sits under | Who resolves it |
|---|---|---|---|---|---|
| C4 | [what is stated twice] | [section, field, value] | [section, field, value] | [the decision] | [name or role] |

- **Contradictions found**: [number — or: none, and say that the sections were read against each other]

## 4. Would it not be better to also track this

Quantities nobody is capturing today that would change a decision if they were. One row per
quantity. A quantity that changes no decision does not belong here.

| id | What would additionally be tracked | Decision it would change | Where it would come from | Capture cost | Displaces |
|---|---|---|---|---|---|
| C5 | [the quantity, in the unit it would be counted in] | [the decision, and who takes it] | [system, field, artefact, or sample] | [one of: falls out already, export plus script, manual sample, not obtainable] | [the indicator or report this replaces — or: nothing, and why an addition is justified] |

- **Rule applied**: replace before adding. An indicator pointing at the wrong thing is not repaired
  by putting a second one next to it.

## 5. The absence question

*What would happen if this sub-process did not exist at all?* Asked of the whole process first, then
of each node. It is the cheapest improvement question there is, because a node that goes away needs
no tooling, no KPI and no training — and it is almost never asked, because everyone in the room
assumes the answer is obvious.

**The whole process**

- **If this process stopped tomorrow and nobody replaced it**: [what would happen, and to whom]
- **Who would notice first, and how long after the stop**: [named role or person, and the interval]
- **What they would do instead**: [the fallback that would appear, whether or not anyone planned it]
- **What the stop would cost, in quantities**: [cases, hours, penalties, deliveries — a quantity, not money, and say where the quantity comes from]
- **Already tested in the anamnesis?**: [yes, in the kill check or the suspension test, with what result — or: no, never tested]

**Node by node**

One row per node. Nodes come from the step list of the mapping section or the value stream skeleton
of the diagnostics section — say which. If the process has more than eight nodes, take the ones that
carry the most cost (most hands, longest wait, or no named consumer) and state the selection rule
used.

- **Node list counted against**: [mapping step sequence / diagnostics value stream skeleton]
- **Selection rule, if not every node is listed**: [the rule — or: every node is listed]

| id | Node | What it produces | Who consumes that, by name | If this node did not exist | Cost of killing it | Candidate verdict |
|---|---|---|---|---|---|---|
| C6 | [step number and name] | [the output, concretely] | [name or role — or: no consumer could be named] | [what would break, and for whom] | [what would have to be built or absorbed elsewhere] | [kill / merge into the next node / suspend and test / keep, and why] |

- **Nodes for which no consumer could be named**: [step numbers — or: none]
- **Suspension test proposed**: [which node, over how many cases, with what fallback in place, and who would watch — or: none proposed, and why]

## 6. The data questions

Five questions about the data underneath the process. They are asked in this order, and the last
one is the one that most often produces something nobody in the room expected.

1. Which data would you actually need to run and steer this process — not which data exists?
2. What accuracy do you demand of it, and which decision breaks if it is off by more than that?
3. How accurate is your own data, and how do you know? When was it last checked against reality?
4. Who other than you could hold this data — upstream, downstream, or in the system that already records it?
5. Who else would benefit from receiving it, and which decision would it change for them?

**6.1 What is needed, and how accurate it has to be**

| id | Data object or quantity | Which of the five questions is open | What the record says today | What a good answer looks like | Who to ask |
|---|---|---|---|---|---|
| C7 | [the object, as the business names it] | [1, 2, 3, 4 or 5] | [the section and field, or: the record is silent] | [the form of answer that would close it — a tolerance, a date of last check, a name] | [name or role] |

- **Tolerance stated anywhere in the anamnesis today**: [where — or: nowhere, for any data object]
- **Last time this data was checked against reality**: [what the record says — or: not recorded]

**6.2 Who else could hold it, and who else would want it**

The cross-functional question. Two processes counting the same thing in two places is not a data
problem, it is a routing problem, and the second holder is usually cheaper and more accurate than
the first. Check every row against the routes the knowledge section already confirmed — this block
is for the ones it did not name.

| id | Data object | Who else could hold it, and where it would already sit | Who else would benefit | Decision it would change for them | Already in the Knowledge section? |
|---|---|---|---|---|---|
| C8 | [the object] | [named person, team, or the system that records it as a by-product] | [name and department] | [the decision, in terms the receiver would recognise] | [yes, as a confirmed route / yes, proposed but unconfirmed / no] |

- **Receivers named here that the knowledge section did not name**: [number and who]
- **Cheaper holder found for a quantity currently collected by hand**: [which quantity and which holder — or: none found]

## 7. What this pass did not challenge

Stated so that a full-looking sheet is not read as a complete one.

- **Sections not read because they are empty**: [section keys — or: none]
- **Areas left alone because the record is already hard**: [what, and what makes it hard]
- **Left to the improvement pass (A3) or the target technology pass (A4)**: [what was noticed here that is a fix rather than a question]
- **Known weakness of this pass**: [what a reader should distrust in it]

## 8. Verdict ledger

Every challenge ends here with a verdict, or it is noise. Accepted means the question goes to the
people who filled the section and the answer comes back into the anamnesis. Rejected means it will
not be asked, and the reason is what a reader a year from now actually needs. Deferred means not
now, and names what brings it back.

| id | Challenge in one line | Verdict | Reason | Decided by | Date | Where the answer landed |
|---|---|---|---|---|---|---|
| C1 | [one line] | [accepted / rejected / deferred] | [the reason — required for rejected and deferred] | [name and role] | [YYYY-MM-DD] | [section and field the answer went into — or: not yet answered] |
| C2 | [one line] | [accepted / rejected / deferred] | [the reason] | [name and role] | [YYYY-MM-DD] | [section and field — or: not yet answered] |

- **Raised**: [number] · **Accepted**: [number] · **Rejected**: [number] · **Deferred**: [number] · **Undecided**: [number]
```
