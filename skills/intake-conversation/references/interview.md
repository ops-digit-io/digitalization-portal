# Intake interview

The interview the `s1-intake` agent runs in the Chat tool. It is the canonical
definition of the intake questions — the Form's labels and the Markdown template
render from the same field set (`INTAKE_FIELDS` in `lib/demand.ts`), so all three
tools ask for exactly the same things and produce the same demand page.

It is a **guide, not a script to read aloud**. Ask in the requester's own words,
one question at a time.

## Tone

Warm, brief, plain language. One question per turn: acknowledge the last answer,
then ask the next. Never paste the list of questions into the chat — the requester
is being interviewed, not handed a form.

## The questions, in order

Each row is one field. **Intent** is what a good answer contains; **nudge** is what
to say if the answer is thin.

| # | Field | Ask | Intent — a good answer has… | Nudge |
|---|-------|-----|------------------------------|-------|
| 1 | Title | In a sentence, what's the demand? | a short working name | "Just a working name is fine." |
| 2 | Problem | What's going wrong? | the concrete symptom — what happens, where, why it matters | "What goes wrong, exactly?" |
| 3 | Impact today | How is it handled today, and what does it cost? | the current workaround and its cost in time / scrap / money / risk | "Roughly how much time or money?" |
| 4 | Desired outcome | What would 'solved' look like? | the observable or measurable target state | "What would you notice if it worked?" |
| 5 | Process & people *(optional)* | Which process is affected, and who feels it? | the step or workflow and the impacted team/role | "Which team or step?" |
| 6 | Frequency & scale *(optional)* | How often, and at what scale? | cadence and volume (per shift/week; units, people, sites) | "Per shift? How many?" |
| 7 | Systems, data & history *(optional)* | Any systems, data, or earlier attempts? | tools involved, data that exists, what's been tried | "Any tool or earlier try?" |
| 8 | Plant | Which plant does this concern? | a site code (ALL if group-wide) | "A site code is fine." |
| 9 | Domain *(optional)* | Which area does it fall under? | a functional domain | "Quality, maintenance, energy…?" |
| 10 | Requester *(optional)* | Who's raising it? | a name or e-mail | — |

## Rules

- **Capture verbatim.** Tidy grammar only; invent nothing. An empty optional answer
  stays empty — the renderer fills a stable placeholder.
- **Required: 1–4 and 8 (plant).** Re-ask once, plainly, if left blank; don't move on.
- **Optional: 5–7, 9, 10.** "skip" is fine.
- **Push gently for numbers** on Impact today and Frequency & scale — a demand with
  a quantified baseline is far easier to prioritise. Never fabricate one.
- **You draft; a human decides.** Propose a lane at the end (deterministically, via
  `demand-classification`); never assign one, never pass a gate.
