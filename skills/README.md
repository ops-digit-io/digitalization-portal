# Agent skills

Extension seam (established M5). Each skill is a markdown file with frontmatter
that the skill loader reads. Adding a skill is dropping in a file — no core change.
Skills are guidance the agent loads to draft artifacts; they never pass a gate or
merge. Changes here require a second approver (`docs/04-rbac.md §4.5`) and are
evaluated against the sandbox fleet before merge (`docs/12-architecture.md §12.11`).

Planned skills by milestone (`docs/10-skills.md`, `docs/15-roadmap.md`):

- M5: `portfolio-analysis`
- M6: `intake-conversation`, `demand-classification`, `duplicate-detection`, `lane-proposal`
- M8: `business-case-drafting`, `value-quantification`, `success-criteria-authoring`, `poc-evaluation`
- M9: `kpi-specification`, `adoption-analysis`, `value-variance-analysis`
- M10: `scale-templating`, `rollout-planning`, `handover-authoring`
