# Tool playbook

Which tool for which job, why, and what it costs you afterwards.

This is the reference the **target technology** and **improvement** advisory passes propose from.
It is not an approval list and it is not an architecture. It is what a competent person would
already know before walking into the room, written down so that the same answer comes out twice.

**Read this first, or the rest of the document will mislead you.**

- Everything in here is a **default with a condition attached**. A default without its condition is
  a slogan. Every recommendation below names the state that has to be true for it to hold, and the
  state that makes it wrong.
- **This playbook does not know OESL's licence position, approved platforms, or who administers
  what.** Nothing of that kind has been established. Where an answer depends on it, the document
  says so and sends you to *What has to be established* at the end. A proposal that assumes a
  licence is a proposal that gets rejected in the room, and it costs the unit credibility it does
  not yet have.
- **Nothing in here is a finding.** The anamnesis is established reality — a named person put their
  name to it. Anything you build out of this playbook is a derived proposal that has to carry an id
  and collect a verdict.

---

## 1. The decision, in five questions

Before naming any tool, answer these. If you cannot answer them, you are not deciding, you are
guessing with vocabulary.

1. **What is the job?** One sentence, written as a state someone could walk in and observe — not as
   a tool and not as a project. "Every open case is visible to the whole shift in one place" is a
   job. "SharePoint" is not.
2. **What actually breaks today?** Taken from the toolchain, flow and diagnostics artefacts, not
   from imagination. If nobody can point at what breaks, there is no tool decision to make yet.
3. **Who owns the result in year two, by name?** Not a department. If there is no name, every rung
   above the lowest is a liability, whatever it costs to build.
4. **What is the smallest rung that removes exactly what breaks?** Not the ideal end state. The
   next rung. (Section 4 holds the ladders.)
5. **What does the cost-of-change class allow this cycle?** CC-A iterates directly. CC-C gets a
   strangler or a smaller cut. CC-D does not get built as it stands, however good the idea is.

### The qualification test

Per the north star, a tool qualifies on **two** counts, not one. Both are observable; neither is a
matter of taste.

| Test | The question that settles it | What a good answer looks like |
|---|---|---|
| **Addressable value** | How many cases, people and minutes does this piece touch, and how many other processes would take the same cut with no redesign? | A quantity with a source and a confidence letter (S told to us, P sampled, I from a system), plus named processes |
| **Turn speed** | After this is in place, how long does the *next* change to it take, and who can make it without joining somebody else's queue? | An observable statement: "the department changed it twice last month itself", or "the last change request went in during January and went live in August" |

A tool that raises value but **lowers** turn speed — because every future change now sits in a queue
owned elsewhere — may still be the right answer. It is never the right answer silently. Write the
trade in the proposal.

---

## 2. Purpose to tool

The default answer, the condition that makes the default wrong, and where to go instead. Read the
row, then check the middle column before you say anything out loud.

| The job to be done | Default answer | The default is wrong when | Then |
|---|---|---|---|
| A list several people read and a few maintain | SharePoint list — typed columns, views instead of copies, per-item history | The value of the workbook is the **calculation**, not the rows; or exceptions are handled by editing cells by hand; or it is one person's working file nobody else reads | Leave it as a file and fix what actually breaks — or kill the step. Ladder 1, and read the do-not-climb column |
| A document several people work on | Document library with versioning and co-authoring; metadata columns instead of folder trees | The "document" is really one row per case wearing a Word costume | Ladder 1 — it is a list problem |
| Someone must be told that work is ready | A **status on the record**, and a view that shows the queue | There is no record yet to put a status on | Ladder 2, rung 1 first. Never automate a notification before a status exists |
| A notification, escalation or reminder chain | Trigger from the list or library in whichever orchestrator is administered here | The receiver does not work in that tool at all; or nobody will watch the failure queue | Ladder 2 — and if nobody watches failures, a human-driven rung is genuinely more reliable |
| Structured intake from many people | Microsoft Forms into a list | Answers must validate against master data, or the submitter has to find and edit their own case later | A form app over the list (Ladder 1, R3) |
| A form with logic, offline use, a camera or a scanner | Canvas app on the platform the organisation already administers | More than a handful of screens, several roles, a real relational model, or external users at scale | Ladder 6, R3 — and only if a platform team exists |
| Data must move from system A to system B on a schedule | Whichever orchestrator is approved and administered here | The native interface already exists and was never asked for; or the volume is bulk (tens of thousands of rows) | Ask the system owner. Ladder 5 — the cheapest rung is often a permission, not a build |
| Somebody retypes what is already on another screen | Nothing new: open the export or the interface (diagnosis branch *Interfaces 1b*) | Access was asked for, by a named person on a named date, and refused | Ladder 5, R2 or R3 — and record the refusal, because it is the finding |
| A recurring report someone builds by hand | One repeatable extract, then one refreshing model with each measure written down | The number underneath is not trusted, or has no source | Fix the source first. A dashboard on a disputed number manufactures arguments at higher speed |
| A calculation with audit weight, or on master data | A change request in the system that owns the data | Its change lead time is longer than several iteration cycles and a date cannot be named (EF4) | A ladder tool as an explicit **interim**, with a written expiry date and a named owner of that expiry |
| An application with several roles and real users | Ladder 6, one rung at a time | Nobody is named as its owner for year two | Do not build it. Go back down the ladder until the owner question has an answer |
| Something that only exists as code — a model, a parser, an odd protocol, a device | A container service on the approved runtime, with a named operating team | There is no team that will run it in year two | Do not build it. Buy it, do without, or leave the step manual and count the cost honestly |
| An approval | The approval capability of the system that owns the record; otherwise status plus a recorded approver, name and date | A signature with legal or customer weight is required | Establish the requirement with the person responsible for it before proposing anything. Ladder 3, R4 |
| A one-off analysis | Excel. This is a complete answer and needs no ladder | It has quietly become weekly | Ladder 4 |
| Knowledge living in one person's head | One page, in the place the team already works, with a date on it | It is a controlled procedure with a revision requirement | The document system that carries controlled procedures here — which is **not established**; ask |

---

## 3. The families

Each family below: what it is genuinely good at, what it gets used for that it is bad at, the
operating cost nobody mentions in the meeting where it is proposed, and what it costs to leave.

**Exit cost is used consistently:**
*Low* — the data exports and the logic is trivial to re-express elsewhere.
*Medium* — the data exports, the logic has to be rebuilt.
*High* — the logic lives in a vendor's model and the move is a project of its own.

### 3.1 Plain files — Excel, mail, shared drives, paper

The starting point of almost every legacy process. Treat it with respect: it is where the process
actually works today, and the people using it are not doing anything wrong.

**Genuinely good at**
- Starting. A shape nobody has to agree on in advance, changed by one person in one afternoon.
- Modelling and one-off analysis, where the value *is* the calculation.
- Carrying the exceptions. The hand-edited cells are usually the real specification of the process,
  and no other tool in this playbook holds them as cheaply.
- The lowest literacy threshold in the building. At TL1–TL2 this may be the only rung that works.

**Routinely misused for**
- A multi-user database. One editor at a time, or someone merges versions by hand on Friday.
- A workflow engine. Cell colour as status, a "Bemerkung" column as an audit trail.
- An interface. Copy-paste between two workbooks, both of which now drift.
- A permission model. A tab named "confidential" in a file on a share everyone can open.
- A reporting layer, once there are linked workbooks and the refresh order matters.

**Operating cost nobody mentions**
- No concurrency and no real change history — "last modified by" is not who changed which cell.
- The formulas are unreviewed code with no tests, and the macros are worse.
- Access equals folder access, which is usually broader than anyone thinks.
- Durability is DU3 by default: it works while one person keeps paying attention to it.

**When the person who built it leaves.** Typically nobody changes it again. The tell is a sentence
you will hear in the session: *"we don't touch that column."* From then on it is copied rather than
changed, and the copies diverge. This is the single most common decay path in the whole playbook.

**Exit cost.** Low for a flat table — export the rows and go. High for a model, because the
exceptions are undocumented and only surface when the replacement gets them wrong.

### 3.2 Microsoft 365 and SharePoint — lists, libraries, Teams, Forms

**Genuinely good at**
- A shared list with a real schema, item-level history, and views instead of six copies.
- Documents with versioning and genuine co-authoring.
- Permissions that follow the directory that already exists, without a new user administration.
- Being where people already are: no new login, usually no new client, usually no new licence.
- Having a **URL**. That alone stops a large share of copy divergence, and it costs nothing.
- Simple structured intake through Forms.

**Routinely misused for**
- Transactional volume. Large lists hit view and throttling limits, and the failure looks like
  "it is slow today" for months before anyone names it.
- A replacement system of record for data that belongs in ERP or MES.
- A rebuilt file share — the same folder tree, migrated, changing nothing. That is a move, not an
  improvement, and it should not be sold as one.
- An application platform, by piling columns, views and conditional formatting onto one list until
  no one can state the possible states of an item.

**Operating cost nobody mentions**
- Licensing is usually inside an M365 plan, but not for every capability, and not for every user
  type — shop-floor and frontline populations are often on a different plan. **Verify, do not
  assume.**
- Site provisioning, retention, sharing and sensitivity policy are central IT decisions. Whether
  provisioning is self-service and what the lead time is: not established here.
- The builder ends up as site owner, and permissions drift from there quietly.
- Sprawl. Six sites, one of them current, no one able to say which.
- List formatting, hidden columns and view logic are invisible to the next person, who will assume
  the list is simpler than it is.

**When the builder leaves.** Better than a workbook — the schema is visible and the history is per
item. The *views, rules and formatting* are not, and they carry more of the meaning than people
expect.

**Exit cost.** Low to medium. Rows and documents export. What breaks is everything anchored to the
URL — bookmarks, flows, other flows, embedded reports — and naive moves drop metadata and version
history. Inventory the links before you promise a move is cheap.

### 3.3 Power Automate and the Power Platform — Power Apps, Power Automate, Dataverse, Power BI

**Genuinely good at**
- Reacting to events that happen inside M365: an item added, a file arrived, a form submitted, an
  approval needed.
- Putting a validating form in front of a list, with roles separated.
- Approvals that leave a record with a name and a date.
- Scheduled pulls where a supported connector already exists.
- Letting a spoke build without joining a build queue. That is a **turn-speed** argument, and it is
  the strongest argument this family has.

**Routinely misused for**
- An integration bus. High-volume system-to-system traffic on a per-item connector is slow,
  expensive and hard to observe.
- Business logic that belongs in the system of record, now maintained in two places by two teams.
- Flows calling flows calling flows, with no one able to draw the chain.
- Overnight batches of tens of thousands of rows.
- An application, when the data model is really a dozen related lists.

**Operating cost nobody mentions**
- **Licence tiers decide the design.** Standard connectors behave differently from premium ones,
  and Dataverse is a paid capability. Which of these the affected population has, and who carries
  the budget: **not established here**. A design that quietly assumes premium is a design that gets
  stopped at the first invoice.
- **A flow runs under its maker's connections.** When that account is disabled, changes password,
  or the person leaves, the flow stops — often silently, often noticed weeks later by a downstream
  team. This is the most common production failure in this family. The mitigation is to own flows
  from a service account or a group from day one, and it has to be a rule, not a good habit.
- Tenant-level data-loss-prevention policy can block a connector *after* something is built.
- Environment strategy is an administration problem — everything landing in the default environment
  is a known, avoidable mess.
- No source control by default. Solution export and import is the migration story, and someone has
  to learn it before it is needed rather than during a crisis.

**Exit cost.** Medium to high. Flow definitions are proprietary; moving the logic is a rewrite.
Dataverse data exports cleanly; model-driven apps and business rules do not travel with it.

### 3.4 n8n

**Genuinely good at**
- Orchestration where no connector exists, or where the connector is premium and the licence is not.
- HTTP and API work, and transformations too fiddly to express in a flow.
- Scheduled extract-transform-load between systems that both have an API but no vendor connector.
- Self-hosting, so data does not leave the boundary — which sometimes decides the whole question.
- Readability. A second person can look at the graph and see what it does. That is worth more than
  it sounds when the builder is on holiday.

**Routinely misused for**
- Business-critical production jobs with nobody watching the failure queue.
- Routing around a system owner instead of asking them for a proper interface.
- A shadow integration layer, built by one capable enthusiast, that becomes load-bearing without
  anyone deciding that it should.
- A data store. It is not one.

**Operating cost nobody mentions**
- **It is a server.** Somebody patches it, backs it up, restores it in a test at least once, and
  owns its uptime.
- **It holds credentials to other systems.** That makes it a security asset with a classification,
  an owner, and — in a company of this size — almost certainly a review before it may hold anything
  production. Budget for that review, not around it.
- Upgrades occasionally break individual nodes; someone has to be responsible for noticing.
- If it is not already an approved, administered service, the honest cost of a proposal is *stand up
  and staff a service*, not *install a tool*. Whether such a service exists at OESL is **not
  established here.**

**Exit cost.** Low to medium — workflows are exportable JSON and re-implementable by a competent
person. The real trap is not exit, it is that nothing forces one: everything it schedules stops the
day it stops, and usually nobody has written down what that would be.

### 3.5 Low-code application platforms — the Mendix / OutSystems class

**Genuinely good at**
- Applications with several roles, a real relational model, and a governed life cycle
  (development, test, production) with an audit trail and vendor support.
- The case where a department genuinely needs an application and the organisation needs it to
  survive its author.
- Delivery faster than bespoke code — **when a platform team already exists.** Without one, it is
  not faster than anything.

**Routinely misused for**
- The first answer to a list problem. Once the licence is paid, everything starts looking like an
  app, and the platform fills up with rebuilt spreadsheets.
- Single-department tools that a list and a form would have carried.
- Avoiding a slow ERP change — which produces a second system of record holding a diverging copy of
  master data, and that bill arrives for years.

**Operating cost nobody mentions**
- The licence is a real budget line, typically scaled by application, user and environment. Whether
  such a platform is licensed at OESL at all: **not established here.**
- It needs a **platform team**: environments, upgrades, deployment, review. Not a role someone does
  on the side.
- It needs developers trained on that specific platform, and the skill does not transfer to the next
  vendor.
- Major version upgrades are projects, on the vendor's calendar rather than yours.

**When the builder leaves.** Better than everything above it — *if* the platform team exists.
Without one it is the worst case in this document: a proprietary application nobody in the building
can open.

**Exit cost.** The highest here apart from the system of record. The logic lives in the vendor's
model; leaving means rewriting. Data exports; the application does not. Treat adoption as a
multi-year commitment, not a project decision — and never justify it with a single application.

### 3.6 Container services and container apps — bespoke code

**Genuinely good at**
- What nothing else can do: an unusual protocol, a model, a parser, heavy computation, a device
  integration, a service with a real API contract.
- Situations where a team already builds and runs software and this is simply their next service.
- Full control of the data path, when that control is genuinely required rather than preferred.

**Routinely misused for**
- Anything a list would have carried.
- "We will just build it properly ourselves" for a five-user internal tool.
- A service built by one person, on a stack they chose, which becomes production without anyone
  deciding that it should.

**Operating cost nobody mentions** — this is where the gap between the estimate and the truth is
widest. Before the first container is worth running you need: a runtime someone provisions and
patches, an image pipeline, secrets management, logging you can search, monitoring that pages a
human, a backup **and a restore that has actually been tested**, and a security review. None of that
is in the builder's estimate, and all of it is in the cost.

**When the builder leaves.** Worst case, unless at least two people can deploy it and the
repository, pipeline and runbook sit somewhere the organisation owns. Ask *before*: which
repository, whose pipeline, who is called at 03:00.

**Exit cost.** Lowest in principle — it is your code and your database. Highest in practice, because
nobody ever rewrites a service that works, so the operating cost is permanent from the day it ships.

**The rule.** Propose this only when the increment artefact can name the team that runs it in year
two. Which container runtime is approved at OESL and who operates it: **not established here.**

### 3.7 The system that already owns the data — ERP, MES, PLM and their kind

Not a family anyone "chooses", which is exactly why it belongs in this playbook: most legacy
processes sit next to one, and the most valuable recommendation this document makes is often *do
not build beside it*.

**Genuinely good at**
- Being the record. Being backed up, audited, and still there in ten years.
- Holding master data correctly, once.

**What happens instead.** Its change route is slow and owned by someone else (EF3, often EF4), so a
satellite gets built. The satellite is faster this quarter and then holds a second copy of master
data forever. Every satellite is also a line item in the next migration of the big system — a cost
that is invisible now and unavoidable later.

**The decision rule.** If the data is master data, or the calculation has to be auditable, the
default is a change request in the system of record. A ladder tool is then an explicit **interim**,
and an interim without a written expiry date and a named owner of that expiry is just a satellite
with better manners.

**What to establish per system:** who owns it, what the change lead time actually is (ask for the
last two change requests and their dates), and whether an interface exists that was simply never
opened.

### 3.8 Family comparison

| Family | Who can change it after go-live | What the change route depends on | Licence exposure | Exit cost |
|---|---|---|---|---|
| Plain files | Whoever can open the file | Nothing — and that is both the strength and the failure mode | None beyond what exists | Low for a table, high for a model |
| M365 / SharePoint | The site owner, usually the builder | Site permissions and central policy | Usually inside the plan — verify per user population | Low to medium; links break |
| Power Platform | The maker; the admin for anything else | Licence tier, DLP policy, environment | Standard vs premium decides the design | Medium to high; logic is proprietary |
| n8n | Whoever has access to the instance | That the instance is an administered service | No licence cost; a real operating cost | Low to medium; nothing forces an exit |
| Low-code platform | The platform team | Their release process | Substantial, per app/user/environment | High; the logic is the vendor's model |
| Container service | The owning engineering team | Their pipeline and on-call | Infrastructure and people | Low in principle, permanent in practice |
| System of record | The system owner's queue | Their release calendar | Existing | Not applicable — you are not leaving |

---

## 4. The migration ladders

Six ladders. Each rung is a place a process can legitimately sit — being on rung 1 is not a failure,
it is a fact to record in the toolchain artefact.

**Rules that apply to every ladder:**

- **One rung per increment.** A rung that does not deliver value on its own is a phase, and the
  increment section will send it back.
- **Never skip two rungs.** Skipping is how you buy a platform to solve a naming problem.
- **Check the diagnosis first.** If the leading branch is *Kill*, no ladder applies — you are about
  to industrialise a step that should disappear.
- **An interim rung gets an expiry date and a named owner of that date**, written at the time it is
  built, not later.
- **Climbing costs turn speed as often as it buys it.** Every rung up usually means fewer people who
  can change the thing. Say so in the proposal; do not discover it afterwards.

### Ladder 1 — The shared list

Thomas's own example, and the most common single decision this unit will make.

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | A workbook on a personal drive, mailed around | Two copies already exist, or more than one person edits | — |
| R1 | One canonical file, one location, versioning on | Rows are records with the same fields; people filter and sort more than they calculate; concurrency clashes have actually happened; the volume is moderate and growing slowly | The value is the calculation, not the rows; exceptions are handled by editing cells; it is one person's working file nobody else reads |
| R2 | A SharePoint list: typed columns, views instead of copies, per-item history | Entry errors are countable; a role must not see everything; there is more than one entry channel; entry happens on a device or on the floor | The entry problem is a training problem; the form would duplicate one that already exists in the system of record |
| R3 | List plus a validating form, roles separated | Several related tables; more than two roles; referential integrity matters; another system will read it | Nobody owns it in year two; there is no platform team; this one application does not justify a platform decision |
| R4 | A real data model — Dataverse, a low-code platform, or a service | It is master data, or an audit needs it, and the system-of-record change can be dated | The system-of-record route was never asked for |
| R5 | The field lives in the system of record | — | — |

**The most common mistake on this ladder** is climbing R1→R2 for a workbook whose real content is a
model with 40 formulas and 15 hand-corrected exceptions. The rows move; the exceptions do not; the
list gets abandoned in six weeks and the workbook comes back — now in two places.

### Ladder 2 — The handover: telling the next person that work is ready

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | A phone call, a shout, a walk to a desk, an ad-hoc mail | More than one person receives, or things get lost when someone is away | — |
| R1 | One shared mailbox or one channel — a single queue with a visible backlog | The work items are records somewhere, not just messages | The items exist only as messages: build the record first (Ladder 1) |
| R2 | Status on the record itself; the queue is a **view**, not a message | People check the view but miss the moment something becomes ready | Nobody looks at the view yet — a notification will not create the habit |
| R3 | Automatic notification on the status change, to a defined receiving role | Missed handovers are countable; escalation or retry rules exist and someone can state them | The receiver does not work in that tool at all |
| R4 | Escalation, retries and time limits in an orchestrator | — | No one watches the failure queue |

**Never automate a notification before there is a status field.** You get a faster version of the
same confusion, and now with an audit trail of it. And a notification never fixes a queue that is
simply too long — that is capacity or batch size, which is section 5.

### Ladder 3 — The document and its approval

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | Paper; print, sign, scan | The paper is already being scanned anyway | The signature has legal or customer weight and that has been confirmed — then go to R4 and nowhere else |
| R1 | A PDF in a library with a naming convention | People search for documents and cannot find them; the same document exists under two names | The document is generated from data — then it should be generated from the system, not filed as an artefact |
| R2 | Library with metadata columns instead of folder trees, versioning on, approval recorded as a field with name and date | The approval is chased by mail; who approved what is reconstructed afterwards | The approver does not work in that tool |
| R3 | Workflow approval, with the result written back onto the record | A signature with legal or customer weight is required, and the requirement has been confirmed with the person responsible for it | The requirement was assumed rather than confirmed |
| R4 | E-signature, or the approval capability of the system of record | — | — |

R3 is **not** a substitute for R4. Establish what the signature requirement actually is, with the
person accountable for it, before proposing either.

### Ladder 4 — The recurring report

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | Someone rebuilds a workbook each week from screenshots and exports | It is genuinely recurring, and a named person acts on it | Nobody acts on it — that is a kill candidate, not a reporting problem |
| R1 | One documented, repeatable extract: same query, same fields, saved, with a date column | The manual step is only the assembly, and the numbers are trusted | The number is disputed. Fix the source first — diagnostics, not dashboards |
| R2 | Scheduled extract to one place, one workbook that refreshes | More than one person reads it; the measure definitions differ between readers | Only the author reads it |
| R3 | One model on the source, each measure defined in writing | The metric is a management metric with a cadence and consequences | No one has agreed what the measure means |
| R4 | The metric produced by the system that owns the process, on a cadence | — | — |

A dashboard built on a number nobody trusts is worse than the workbook it replaces: same dispute,
higher speed, and now with an owner and a maintenance cost.

### Ladder 5 — The system break: data crossing between two systems

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | Retyping | The fields and volumes are countable, and errors get corrected downstream | The second system should be removed instead — check that first |
| R1 | Export and import with a stable file format — still manual, but no keying | It happens on a rhythm and someone would notice a missed run | The export route has never actually been requested. Ask; a permission is cheaper than a build |
| R2 | Scheduled export-import to a defined place | The file arriving late or wrong causes countable damage | Nobody watches whether the run happened |
| R3 | Connector or API integration in an orchestrator, with error handling and a named owner | Both system owners will support and monitor an interface, and volume or criticality justifies it | No one is on the hook for the error queue — **R2 with a human who notices is more reliable than R3 nobody watches** |
| R4 | A native interface owned by both system owners | — | — |

**Before any rung on this ladder:** check whether the interface already exists and was simply never
opened. Building an integration to route around a refusal that was never actually requested is the
most expensive avoidable decision in this document. If it was requested and refused, record who
refused, when, and on what grounds — that is a finding for the anamnesis, not a reason to build.

### Ladder 6 — The departmental application

| Rung | What it is | Climb when all of these are true | Do **not** climb when |
|---|---|---|---|
| R0 | A macro workbook or an Access database, one author | Someone other than the author needs to change it, or it has broken once with the author away | — |
| R1 | List plus form on the platform already administered here (Ladder 1, R2–R3) | The data model needs relations and roles that a list genuinely cannot hold | The complaint is about look and feel |
| R2 | An app over a proper data model, still inside the administered platform | Several roles, a governed life cycle, an audit trail, and vendor support are all genuinely required | Any of those four is a preference rather than a requirement |
| R3 | An application on a low-code platform with dev/test/prod and a platform team | The platform cannot express what is needed, and an engineering team will own and operate the result | There is no platform team — then R3 is worse than R1 |
| R4 | A bespoke service in a container, with a team on call | — | No named operating team for year two |

At every rung ask the same question: **who owns this in year two, by name?** If the answer is one
person, do not climb — climbing multiplies the things only that person understands. And count
before you climb: put the addressable quantity next to the rung. A handful of users and a couple of
hundred cases a year does not carry a platform decision, however badly the workbook behaves — and
if nobody can state the quantity, that is the thing to establish before the rung is proposed.

---

## 5. When the right answer is no technology at all

Often the strongest proposal in the target-technology pass is that no tool should be added. These
are not soft options; they are usually the fastest value in the document.

| Move | The test that establishes it | What it looks like when it is right |
|---|---|---|
| **Delete the step** | Who reads this output, by name, and what did they do with it last time? | Nobody can name a consumer, or the named consumer says they stopped using it |
| **Change who does it** | Who has the information at the moment the decision is needed? | The decision moves to the person who already holds the data; a specialist queue disappears |
| **Change when it runs** | How long does an item wait for the next scheduled run? | A weekly cycle becomes daily or continuous; average waiting time falls without anything being built |
| **Change the rule** | When was the last time this approval or check actually rejected something? | A threshold is moved and most cases stop needing a step nobody has ever failed |
| **Stop producing an output** | Does the report still exist because someone needs it, or because it always has? | The distribution list is asked, and nobody claims it |
| **Fix the input instead of validating downstream** | Where does the bad data enter, and who enters it? | One correction at the source removes checks in three later steps |
| **Give someone the permission they lack** | What exactly is blocked, who grants it, has anyone asked? | An access right or an export permission removes a whole manual step. Frequently the cheapest intervention available |

**Two honesty rules.**

- A no-technology change is not free. It usually scores **higher** on friction, because it moves
  work between people or makes invisible work visible — often FR3 or above. Cheap in effort,
  expensive in friction. Write both.
- Do not propose deletion from the outside. The kill test belongs in the diagnosis session with the
  process owner present. A proposal to delete a step is a proposal, with an id and a verdict, like
  every other line in the advisory layer.

**Signals that you are looking at a no-technology case:** the workaround exists because of a rule,
not a tool; nobody can show you what the tool actually prevents when asked to demonstrate it; the
same fact is approved twice by two people; the step is explained with "we have always done that".

---

## 6. What has to be established before this playbook is more than a shape

None of the following is known. Every one of them changes at least one recommendation above. Ask
them, record the name of whoever answered, and keep the answers with the engagement — they are the
same for every process and only have to be collected once.

| # | What to establish | Why it changes the answer |
|---|---|---|
| 1 | Which M365 plan the affected population has — including shop-floor and frontline users | Decides whether SharePoint, Forms and Power Platform are available to the people in the process at all |
| 2 | Whether Power Platform premium connectors and Dataverse are licensed, and who carries that budget | Decides whether half of section 3.3 is available or is a purchase decision |
| 3 | The tenant DLP policy — which connectors are permitted | A design can be blocked after it is built |
| 4 | Whether SharePoint site and list provisioning is self-service or a request, and its lead time | Decides whether Ladder 1, R2 is a same-week move or a project |
| 5 | Whether a low-code platform is licensed, with which platform team and which route to production | Without a platform team, Ladder 6, R3 is worse than R1 |
| 6 | Whether an orchestration service (n8n or another) exists as an administered, security-reviewed service, and who runs it | Decides whether n8n is a tool to use or a service to establish |
| 7 | Which container runtime is approved, who operates it, and the route to production | Decides whether Ladder 6, R4 exists as an option |
| 8 | Whether shop-floor staff have individual accounts and devices, or shared ones | Shared accounts break per-item history, permissions and every approval rung |
| 9 | The works-council and data-protection route per site for anything that records timestamps | Decides whether measurement can start at all, and at what friction level |
| 10 | Which systems are the systems of record, and each one's real change lead time | Decides interim versus permanent for every satellite proposal |
| 11 | Data classification and residency rules for anything leaving the tenant | Decides which hosting options may be proposed at all |

Until an item here is answered by a named person, a proposal that depends on it is **provisional**
and says so on its face. Do not fill one of these with a plausible answer; a guess made in a
proposal comes back as a commitment.

---

## 7. How the advisory pass uses this document

- **Everything derived from this playbook is a proposal, never a finding.** It carries a stable id
  so a verdict can be attached, and it never appears in an anamnesis artefact. The process owner
  said what they said; this document did not.
- **Cite the ladder and the rung.** "Ladder 1, R1→R2" is checkable by a second person. "Move it to
  SharePoint" is not.
- **State the condition and its status.** Every proposal names the condition it rests on and whether
  that condition is *established* (someone named it, with a date) or *assumed* (section 6). An
  assumed condition makes the proposal provisional.
- **State the trade, not just the upside.** What gets slower, who loses the ability to change it,
  what the exit costs, and what the friction lands on people who did not ask.
- **Respect the cost-of-change class.** A proposal that ignores a CC-D is not bold, it is noise.
- **If the playbook does not cover the case, say so and say why**, then propose anyway — and that
  gap is worth more than the proposal. It is how this document gets its next revision.

**Not covered here, deliberately:** the measurement and instrumentation ladder (it belongs to the
diagnostics section and is contract there, not here), anything about specific vendors' current
pricing or version numbers (it goes stale and would be invented), and any statement about which
platforms OESL has approved — see section 6.
