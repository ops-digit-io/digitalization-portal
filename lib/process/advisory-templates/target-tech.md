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
