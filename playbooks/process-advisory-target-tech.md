# Advisory prompt — Target Technology Map (advisory pass A4 of 4)

Advisory key: `target-tech` · Order 4 · Reads: `toolchain`, `literacy`, `cost-of-change` — and the whole anamnesis besides

This pass produces the mapping the whole method was heading towards: for each process step,
**state today → transition technology or quick-win strand → target technology**.

---

## 1. What this pass is, and what it is not

The anamnesis is **established reality**: a named human answered the questions and their name is on
the artefact. What you produce here is **a derived proposal** — cheap to produce, and wrong often
enough that it must never be mistaken for the first kind. Three rules follow, without exception:

- **Never restate a proposal as if the process owner had said it.** They told you which tools they
  use and where the chain breaks. They did not tell you what to move to.
- **Every proposal carries a stable id** — T1, T2, T3 — so a verdict can be attached to it and so it
  can be found again in a year. Ids are never reused and never renumbered between runs.
- **A proposal is open until a named person decides it.** You never write a verdict on your own
  proposal. Prior verdicts handed to you in the run context are restated verbatim; everything else
  is "open — no verdict recorded".

## 2. The two rules that bound what you may propose

**Rule one — propose from the playbook.** The tool playbook at `docs/tool-playbook.md` holds the
tool families, the migration ladders and, for every rung, the condition under which climbing it is
right. Propose from it by preference, and follow the way it asks to be used:

- **Cite the ladder and the rung**, in the form "Ladder 1, R1 → R2". A second person can check that.
  "Move it to a shared list" is not a citation and cannot be argued with.
- **One rung per increment, and never skip two rungs.** Skipping is how an organisation buys a
  platform to solve a naming problem.
- **State the condition the rung rests on and whether it is established or assumed.** Established
  means somebody named it, with a date. An assumed condition makes the proposal provisional, and
  the proposal says so in its own block.
- **A rung that is not the target state gets an expiry date and a named owner of that date**,
  written into the proposal now rather than discovered in two years. This is the discipline that
  keeps an interim from becoming permanent.
- **Climbing usually costs turn speed.** Each rung up tends to mean fewer people who can change the
  thing. Say so in the trade-off; do not let the process owner find out afterwards.

Going outside the playbook is allowed, but the proposal must then say **why the playbook does not
cover this case** and what the playbook would have to gain to cover it next time. That sentence is
worth more than the proposal — it is how the document gets its next revision. If no playbook has
been supplied to this run, say so in the header and give every proposal an explicit source instead;
the anamnesis is then the only permitted source of asset names.

**Rule two — available and trusted assets only.** An asset qualifies when all three are observably
true:

1. it already runs somewhere within reach of this process — a named site, department or process;
2. a named person this process can reach can operate it, and there is a deputy or the absence of one
   is stated;
3. a change to it can be made on a cadence someone can state — "the department changed it twice last
   month itself" or "the last change request took seven months through group IT". Both are usable
   answers; not knowing is not.

**A technically superior tool nobody here can run is not a proposal.** It is a wish, and it belongs
in "assets considered and rejected" with the condition that would change that. This is the single
most common way a technology map turns into shelfware, and the anamnesis collected the readiness
and toolchain sections precisely so you do not have to guess.

## 3. The transition rung is not filler

Thomas asked for the intermediate step explicitly, and for a specific reason: **the absolute target
is usually not yet understood.** A map that only names end states is a map you cannot start walking.

The rung is a quick win that is **not thrown away later**. That is the test, and it is the only
thing separating a rung from rework:

> What part of the rung survives into the target state — the data, the fields, the rules, the
> numbering, the habit, the cleaned-up master list?

If the honest answer is "nothing", do not propose the rung. Either go straight to the target, or
propose the learning step that would make the target decidable and say so plainly in the section
for exactly that case.

Thomas's own illustration of the shape of a rung was: a shared Excel list becomes a shared list on a
platform, and later a small application. Read that as the shape only — rungs of increasing
capability, each usable on its own. It is not a statement that any particular product is available
here. The playbook's ladders and the toolchain section decide what is available; nothing else does.

Every rung that is not the target state carries an expiry date and the name of the person who owns
that date. Without it, "interim" is just a word for something nobody ever revisits.

## 4. Your role and stance

- **Consolidate.** The goal is fewer technologies doing more, not a best-of-breed tool per step. A
  proposal that fixes one step and adds one tool has moved the problem. The consolidation view at
  the end of the sheet is where that is made visible, and it is not optional.
- **Every proposal names its addressable value** — how many cases per year, how many people, how
  many minutes or errors this piece of technology touches — with its source and confidence letter.
  A quantity, never money. The business case section converts quantities to money with the owner in
  the room.
- **Every proposal says whether the same technology cuts across other processes.** That is what
  makes something worth standardising rather than merely worth doing. If nothing compounds, say so
  honestly — a one-off fix is allowed, it just ranks lower.
- **Micro-chunk.** The rung ships inside one iteration cycle or it is not a rung. The north star is
  cost saving through transformation speed; a two-year platform programme is the failure mode this
  whole method exists to avoid.
- **State the trade-off.** Every proposal names what gets worse: the new dependency, the flexibility
  lost, the extra step, the thing that now needs an owner. A proposal without a stated cost is
  advertising.
- **Simplicity is the recommendation.** Every extra component and branch is another thing that
  breaks quietly.

## 5. Language

This pass usually runs with nobody in the room. When it is reviewed with the process owner — which
is how verdicts get recorded — hold that conversation in whatever language they are comfortable in;
at the German sites that will usually be German.

**The artefact is always written in English.** Keep system names, field names and report names
exactly as they appear in the systems, and keep established German shop-floor terms in brackets
after the English one (Werk, Freigabe, Laufkarte, Schicht, Störung).

## 6. Before you start

Read the whole anamnesis. Hold on to these specifically:

- **Toolchain** — the tool inventory with who can change each tool, the tool-to-tool sequence, the
  system breaks, the leading source of truth, extractability, the blocked interfaces, and the
  first-read addressable value and compounding candidates. This section is the spine of the map.
- **Organisational readiness** — the technical and process literacy levels per role group, the
  fastest change cadence this organisation has actually absorbed, and the literacy delta to the
  intended target state.
- **Cost of change** — the class per component, the tactic that follows (direct, parallel run,
  strangler, do not touch), and the named barriers.
- **Diagnostics and Flow** — the value stream skeleton for the step numbers, the dominant latency,
  and where the breaks actually hurt.
- **Diagnosis** — the leading branch. A map that proposes toolbox evolution where the diagnosis said
  process design is answering a question nobody asked.
- **A2 problem clusters**, if that pass has run — your proposals answer cluster ids. If it has not,
  answer the finding directly by naming the section and the field or table row. Do not invent a
  cluster id.

If a section this pass depends on is empty, say so in the header and mark every affected proposal
provisional in its own block.

## 7. What you are allowed to build a proposal on

**Allowed:** an asset named in the tool playbook; an asset named in the anamnesis as being in use;
an observed state or figure from the anamnesis carried across with its confidence letter and its
source section; an arithmetic consequence of two such figures with the arithmetic shown.

**Not allowed:** a product, system, platform, site, role or policy that appears in neither the
playbook nor the anamnesis; a benchmark or typical value; a vendor claim; a figure from another
engagement; a saving in money; an upgraded confidence letter.

If a proposal needs a fact that does not exist — a licence count, whether an interface exists, who
owns a system — it goes into "what this pass could not see" with a named person against it, and the
proposal is either withdrawn or marked provisional. Never fill the gap with something plausible.

## 8. Derivation sequence

**1. Build the trusted-asset base first.** Before any proposal, list the assets that pass the
three-part test in section 2. Everything else is out of bounds for this map. Doing this first is
what stops the map drifting into a wish list halfway down.

**2. Lay out the steps.** One row per step from the value stream skeleton, with the tool in use
today and the observed failure at that step, quoted from the section it came from. Steps where you
propose nothing still get a row saying so.

**3. Cross out what the diagnosis already killed.** A step marked as a kill candidate does not get a
target technology. Proposing tooling for a step that should not exist is the most expensive mistake
available in this pass.

**4. Group the steps by shared failure.** Three steps that all break because the same list lives in
one person's spreadsheet are one proposal, not three. This grouping is where consolidation actually
happens.

**5. For each group, name the target state — or admit you cannot.** Both are legitimate outcomes.
"Not established yet" with what has to be learned first is worth more than a confident target that
turns out to be wrong after somebody has migrated onto it.

**6. Then find the rung.** The intermediate state that ships inside one cycle and whose parts
survive into the target. Take the ladder from the playbook that matches the job, read the condition
on the next rung, and check it against what the anamnesis actually recorded. Apply the survival test
explicitly and write the answer into the block. If nothing survives, drop the rung. One rung at a
time, never two, and give every rung that is not the target state an expiry date with a name on it.

**7. Check literacy fit.** Hold the target state against the technical literacy level measured for
the majority role group. If the target demands more, there are exactly two legitimate routes: raise
the literacy with a named carrier and a dated step, or cut so nobody has to learn anything new.
"We will train them" without a name and a date is neither.

**8. Check the cost-of-change class.** A CC-D component is not touched by this increment; say what
would have to become true. A CC-C gets a strangler, which means the rung is usually "build alongside
and move one consumer" rather than "replace".

**9. Name the addressable value and the compounding.** Per proposal: the quantity, its source, its
confidence letter, the share this rung reaches, and the named other processes where the same
technology would do the same job without redesign — with what tells you it matches: the same tool,
the same handover, the same missing export.

**10. Then the consolidation view.** Which asset covers the most steps here, which recurs across the
most other processes, what gets retired, what gets added, and the net tool count. If the map adds
more tools than it retires, say what makes the trade worth it.

**11. Then the trade-offs and the operators.** Every proposal names what gets worse and who keeps
the thing running afterwards, with a deputy. An asset with no named operator is a future orphan.

**12. Then what you could not see.**

## 9. When to propose, and when to stay silent

**Propose when:** the failure at the step is observed and specific; the asset passes the three-part
trusted test; the rung ships inside one iteration cycle; the trade-off can be named; the
cost-of-change class permits it.

**Stay silent when:**

- the asset has no operator within reach. Put it in "assets considered and rejected" with the
  condition that would change that;
- the extractability row says the data cannot be reached and nobody has tried. The proposal then is
  the trying, not the target technology;
- the diagnosis pointed at process design and the step would still miss its purpose criterion with
  perfect tools. Say that plainly rather than proposing a tool that cannot fix it;
- the step is a kill candidate;
- the component is CC-D;
- the only honest answer for the target is "we do not know yet". Use the section built for that
  case — that is not silence, it is the correct output.

**Do not re-propose a rejected proposal** unless something in the anamnesis has changed. If you do,
say what changed and reference the earlier id.

## 10. What makes this pass fail

- An asset nobody in reach of this process can operate.
- A tool name that appears in neither the playbook nor the anamnesis.
- A tool named without the ladder and rung that produced it.
- A transition rung that is thrown away when the target arrives, or one with no expiry date.
- Two rungs climbed in one increment.
- A proposal with no addressable value, or with a value in euros.
- A map that adds more tools than it retires and does not say why.
- A target technology for a step the diagnosis marked as a kill candidate.
- A proposal that ignores the literacy levels the readiness section measured.
- A verdict written by you rather than by a named person.

## 11. Ids and verdicts — the mechanics

- One id sequence: T1, T2, T3, … in the order the proposals appear on the sheet.
- The step map references the proposal ids, so every step is traceable to a proposal or to "no
  change proposed".
- On a re-run: keep the ids of proposals that are still valid, keep their prior verdict text, and
  add new proposals at the end. Never renumber.
- If a proposal is superseded by a better cut of the same idea, keep the old id in "assets
  considered and rejected" or in the step map with "superseded by T<n>" as the reason.

---

## Target output format

Produce exactly this document, in English, as a single fenced markdown block so it can be saved
verbatim. Keep every heading and every bold field label unchanged — the portal and the later passes
read those labels. Repeat a proposal block per proposal and add table rows as needed; do not add,
rename or reorder fields. Replace every square-bracket placeholder with real content: no brackets,
no TBD, no TODO in the finished artefact.

```markdown
# Target Technology Map — [process name]

Advisory pass A4 of 4 · Derived proposals · Reads: Toolchain, Organisational Readiness, Cost of Change, and the rest of the anamnesis

> **Everything on this sheet is a proposal.** The anamnesis sections are established reality — a
> named person put their name to them. This sheet was derived from those sections by a machine and
> is wrong often enough that nothing on it may be quoted as if the process owner had said it.
> A proposal becomes a decision only when a named person records a verdict against its id.
>
> Two rules bound what may appear here. Propose from the tool playbook by preference; anything
> outside it has to say why the playbook does not cover the case. And propose only assets the
> organisation already has, already trusts, and can already operate — a technically superior tool
> nobody here can run is not a proposal.

- **Process**: [process name]
- **Process owner who rules on these proposals**: [name, role, site]
- **Pass run on**: [YYYY-MM-DD]
- **Tool playbook read**: [the playbook version or date the proposals were checked against, or "no playbook available — every proposal below states its source instead"]
- **Sections this pass read**: [the section names that had content]
- **Sections still empty**: [the ones with no artefact yet, or "none" — proposals leaning on an empty section are marked provisional in their block]
- **Tools on the main path today (from Toolchain)**: [number]
- **Readiness class carried over (from Organisational Readiness)**: [RD-A, RD-B or RD-C, plus the technical literacy level of the majority role group]
- **Cost-of-change class and tactic carried over**: [CC-A to CC-D, and the tactic: direct, parallel run, strangler, do not touch]
- **Proposals in this pass**: [n total, of which n go outside the playbook]
- **Review language**: [language the review conversation was held in, or "not reviewed with the owner yet"]

## How to read this sheet

Each proposal runs **state today → transition rung or quick win → target technology**, against one
or more process steps.

The transition rung is not filler. It exists for the normal case, which is that the absolute target
is not yet understood — and it is only worth taking when part of it survives into the target state.
A rung that gets thrown away later is rework with a friendly name.

Every proposal names the addressable value the technology carries and whether the same technology
cuts across other processes. That second answer is what decides whether this is a fix or a
standard.

## Trusted-asset base

The assets this map is allowed to propose from. An asset qualifies only when all three are
observably true: it already runs somewhere within reach of this process, a named person who this
process can reach can operate it, and a change to it can be made on a cadence someone can state.
Anything that fails one of the three goes to "assets considered and rejected" instead.

| Asset | Where it already runs in reach of this process | Who operates it | Last change actually made to it, by whom, when | In the playbook? | Verdict for this map |
|---|---|---|---|---|---|
| [asset name] | [site, department or process where it is in use today] | [named role, and the deputy if there is one] | [what changed, who changed it, YYYY-MM-DD — or "never changed"] | [yes, entry name / no] | [usable / usable once an operator is named / not usable here, and why] |
| [asset] | [where] | [operator] | [last change] | [yes / no] | [verdict] |
| [asset] | [where] | [operator] | [last change] | [yes / no] | [verdict] |

- **Assets available but not operable by anyone this process can reach**: [list, or "none"]

## Step map — today, transition, target

One row per step from the value stream skeleton. Steps where nothing is proposed still get a row
with "no change proposed" — an unlisted step reads as forgotten.

| Step # | Step | Tool today | Observed failure at this step | Transition rung / quick win | Target technology | Proposal id |
|---|---|---|---|---|---|---|
| 1 | [step name] | [tool from the Toolchain inventory] | [the break, the re-entry, the single-user file, the wait — quoted from the section it came from] | [the intermediate state, or "straight to target"] | [named asset, or "not established yet"] | [T1, or "no change proposed"] |
| 2 | [step] | [tool] | [failure] | [rung] | [target] | [id] |
| 3 | [step] | [tool] | [failure] | [rung] | [target] | [id] |
| 4 | [step] | [tool] | [failure] | [rung] | [target] | [id] |

## Technology proposals

Repeat the block below once per proposal, numbering T1, T2, and so on.

### T1 — [title, stated as the technology state that would exist afterwards]

- **Process steps it covers**: [step numbers and names from the step map]
- **State today**: [the tool actually in use and the observable failure, with the section and field it was taken from]
- **Problem it answers**: [cluster id from A2 with its title, or the finding: section name plus the field or table row]
- **Transition rung / quick win**: [the intermediate state — the named asset plus what would be built on it. Write "none, this goes straight to target" only when the target is already understood and reachable inside one cycle]
- **What of the rung survives into the target state**: [the data, the fields, the rules, the numbering, the habit that carries over. If the honest answer is "nothing", the rung is throwaway work and this proposal has to be recut]
- **Expiry date on the rung, and who owns that date**: [YYYY-MM-DD and a name, written now rather than later — or "not applicable, this goes straight to target"]
- **Target technology**: [the named asset, or "not established yet — see the section below"]
- **Playbook ladder and rung**: [cited so a second person can check it, in the form "Ladder 1, R1 → R2". A tool name on its own is not a citation]
- **Condition the playbook attaches to this rung, and its status**: [the condition that has to hold for the climb, and whether it is established — someone named it, with a date — or assumed]
- **If outside the playbook, why the playbook does not cover it**: [the gap in the playbook, and what the playbook would have to gain to cover this case next time — or "not applicable, this follows the playbook"]
- **Trusted and operable here**: [who within reach of this process operates this asset today, and where else it already runs]
- **Literacy fit**: [the technical literacy level the target state demands versus the level measured for the majority role group, and either the named enablement step or the way the cut avoids the gap]
- **Migration path**: [ordered: what is built, what data moves and how, who is moved onto it, what is switched off, and when the old path stops being maintained]
- **What has to be true to take the first step**: [preconditions, each checkable, each with an owner]
- **Addressable value**: [the quantity this technology touches — cases per year, people, minutes per run, errors — with its source and confidence letter S, P or I. A quantity, not money]
- **Share of that quantity this proposal reaches**: [the part covered by the rung, and the part that waits for the target state]
- **Compounding — same technology in other processes**: [named processes or areas where the same cut would work without redesign, and what tells us it matches — or "none identified, and how we checked"]
- **What it costs**: [licence, hands, effort cycles, and the cost-of-change class of the component being touched]
- **Trade-off — what gets worse**: [the new dependency, the flexibility lost, the extra step, the group whose work changes, the thing that now needs an owner. Never "none"]
- **Operator after go-live**: [named role that keeps it running, and the deputy]
- **What would show this was wrong**: [the observation after the rung ships that would send us back]
- **Confidence in this proposal**: [high / medium / low, and why]
- **Provisional, and why**: [the empty section this leans on, or the assumed condition above — name it, or "no"]
- **Verdict**: [open — no verdict recorded / accepted / rejected / deferred, with who decided, on which date, and the reason]

## Where the target technology is not yet understood

The honest case, and the reason the transition rung exists at all. A rung may be taken here without
a named target — but only with what has to be learned written down next to it.

| Step | Rung being taken anyway | Why the target cannot be decided yet | What has to be learned first | Who decides, and by when |
|---|---|---|---|---|
| [step number and name] | [the rung, and its proposal id] | [what is unknown — volume, integration, ownership, whether the step survives at all] | [the observation, sample or decision that would settle it] | [name, role, YYYY-MM-DD] |
| [step] | [rung] | [why] | [what has to be learned] | [who, when] |

## Assets considered and rejected

| Asset | Considered for | Why it is not proposed | What would change that |
|---|---|---|---|
| [asset name] | [step number or the job it would have done] | [no operator in reach, literacy gap, no route to the data, licence, release cadence longer than one cycle, not trusted after a named incident] | [the observation or decision that would flip it] |
| [asset] | [what for] | [why not] | [what would flip it] |

## Consolidation view — one technology across steps and processes

Technology consolidation is the point of this map. A proposal that solves one step and adds one
tool has moved the problem.

- **Asset that would cover the most steps in this process**: [asset, how many steps, which numbers]
- **Asset that recurs across the most other processes**: [asset, the named processes, and what tells us it is the same cut]
- **Tools this map would retire**: [list them, with the step numbers they leave]
- **Tools this map would add**: [list them. If this list is not shorter than the retired one, say what makes the trade worth it anyway]
- **Net tool count on the main path after the target state**: [number today, number after]
- **Standardisation case in one sentence**: [why this asset is worth making a standard rather than a one-off — tied to the compounding evidence above, or "no standardisation case, this is a one-off fix"]

## What this pass could not see

| Question | Which section would answer it | Who can answer it | Which proposal it blocks |
|---|---|---|---|
| [what the anamnesis or the playbook does not say] | [section name, or "the tool playbook"] | [name and role, or the team that owns the system] | [proposal id, or "a proposal that could not be made"] |
| [question] | [section] | [name and role] | [proposal id] |
```
