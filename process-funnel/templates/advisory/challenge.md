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
