# Iteration Hook — [process name]

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
- **Escalation threshold**: [the value at which this stops being the process owner's call and goes up, and to whom]
