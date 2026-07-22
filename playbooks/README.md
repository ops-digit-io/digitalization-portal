# Agent playbooks

Extension seam (established M5). Each playbook is a markdown file with runner
semantics and checkpoints; suspension state lives in the job store. Adding a
playbook is dropping in a file — no core change. A playbook orchestrates skills
and tools; it never merges and no step passes a gate. Confirmation checkpoints
keep the human in the decision.

Planned playbooks by milestone (`docs/11-playbooks.md`, `docs/15-roadmap.md`):

- M5: `portfolio-query`
- M6: `s1-intake` (with both confirmation checkpoints)
- M7: `s1-intake-async`, `s2-triage-sweep`
- M8: `s3-business-case`, `s4-poc-eval`
- M9: `s8-value-review`
- M10: S6 and S7 playbooks
