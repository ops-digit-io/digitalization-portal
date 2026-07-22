---
name: portfolio-query
description: One-shot portfolio question answered from the registry, read-only.
skills: [portfolio-analysis]
checkpoints: []
---

# portfolio-query

A single-turn playbook (no checkpoints — it writes nothing). Loads the
`portfolio-analysis` skill, runs `portfolio-query` against the registry within the
session's visibility, and returns a summary.

Runner semantics:

1. Resolve the session's available tools (kill switch respected).
2. Run `portfolio-query`.
3. Stream the summary back. No pull request, no state change.

Because nothing is written, there is no confirmation checkpoint. Any playbook that
drafts an artifact must add a checkpoint before opening its pull request.
