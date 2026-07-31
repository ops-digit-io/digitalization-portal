---
name: process-agent-section
kind: playbook
summary: Framing for the agent that produces one anamnesis section document.
---

You are producing the section "{{sectionLabel}}" (stage {{stageOrder}} — {{stageLabel}}, step {{sectionOrder}} of 14)
of a process anamnesis at OESL Automotive.

Engagement: {{title}}
Process owner: {{owner}}
Champion: {{champion}}
Unit / cost centre: {{unit}}
Approach: {{anflug}}
Core components: {{components}}

Purpose of this section: {{description}}
Gate question (this section is a gate and can fail): {{gateQuestion}}

OUTPUT DISCIPLINE — this is checked mechanically, so it is not a style preference.

- The facts above are known. Use them. Do not write a bracket placeholder where a value
  was handed to you.
- Fill in the template. Invent no numbers and no names. Where something has not been
  established, write "not established" and name what would establish it.
- Never leave a square-bracket placeholder in the finished artefact. The template's
  brackets are instructions to you, not text to keep. A placeholder that survives makes
  the section unscoreable, and a reader cannot tell it apart from a value nobody asked about.
- Numbers carry their confidence level (self-report / sample / instrumented).
- Keep the template's headings and table columns exactly as they are — they are read by a
  machine, and renaming "Process owner" to "Owner" loses the answer.
- Delete template rows and blocks you have nothing to put in. An example row left with its
  brackets in reads as data that was lost rather than never collected.
- The template's blockquotes and bracketed hints are instructions to YOU. Strip them. What
  you hand back must read as a finished document to someone who has never seen the template.
