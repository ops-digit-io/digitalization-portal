# Digital Unit Portal

The single front door and control plane for enterprise change demand. It captures
every demand once, triages it into a lane, and orchestrates Digital-Unit-owned
demand through an eight-stage / seven-gate lifecycle with explicit gates, named
accountabilities, and measured value.

**Git is the system of record.** Every use case is a repository of markdown
documents. The portal reads and writes those repositories through pull requests
and **never merges** — the merge under `CODEOWNERS` is the human decision the
governance model rests on. The full specification is in [`docs/`](docs/); start
with [`docs/BUILD.md`](docs/BUILD.md).

## Status

Foundation built portal-side and markdown-native: **M1** (enforcement core) plus
the **M2** and **M5** *logic seams* that need no external OIDC/GitHub — the pieces
are pure logic and unit-tested, so only the Auth.js / Octokit / model wiring
remains for later. See the build plan for the full roadmap (M0–M10) and the two
locked decisions (portal-side enforcement; no gatekeeper role).

## What's here

| Module | Purpose |
|---|---|
| `lib/parse.ts` | Markdown state extraction. Never throws; unreadable state → "needs attention". |
| `lib/gates.ts` | The single gate-enforcement point, called before any gate PR is opened. |
| `lib/rbac.ts` · `lib/session.ts` | `can()` capability resolution (no gatekeeper) + session resolution from IdP group claims. |
| `lib/registry.ts` · `lib/reconcile.ts` | Registry index parse ⇄ serialize (reconciler cache), round-trip stable. |
| `lib/board.ts` · `lib/visibility.ts` | Server-side redacted board assembly (portfolio-transparent; confidential to view_all). |
| `lib/stages.ts` · `lib/lanes.ts` · `lib/value.ts` | Data-driven transition table, lane taxonomy, value model (extensibility seams). |
| `lib/codeowners.ts` | CODEOWNERS generation (no gatekeeper entries). |
| `lib/agent/*` | Agent-tool contract + registry (no gate/merge tool, enforced at registration), skill/playbook loader, kill switch, example tools. |
| `registry/*.md` · `templates/*.md` · `skills/*` · `playbooks/*` | Human-editable registries, artifact templates, and example agent skill/playbook. |

## Extending the portal (the point of the seams)

Adding a capability is additive, never a core change:

- **A new agent tool** — implement `AgentTool`, register it in `lib/agent/registry.ts`.
  Registration **throws** if it requires a gate/merge/decision capability, so the
  "no tool passes a gate" invariant cannot be violated by a later tool. See
  `lib/agent/tools/simulate-value.ts` — the business-case simulation from the build
  plan — as a worked example: one file, one registry line, zero core change.
- **A new skill / playbook** — drop a markdown file with frontmatter into `skills/`
  or `playbooks/`; the loader reads it.
- **A new lane / value category / stage artifact** — a table entry in the
  corresponding data module.

## Design commitments (non-negotiable — `docs/BUILD.md`)

1. No route/tool/function merges a pull request.
2. No agent tool passes a gate.
3. Agent authority equals the invoking session's authority.
4. Every artifact is markdown — no YAML/JSON/frontmatter in use-case repos.
5. External content is wrapped before it reaches the model.
6. No per-requester analytics.
7. Credentials never reach the browser.
8. Value figures carry their confidence state.

## Extensibility

The portal is a platform, not a fixed feature set. New capabilities — e.g. a
business-case simulation tool — are added at defined seams (skills, playbooks,
agent tools, capabilities, templates, lanes, value categories) without touching
the core. Because the parser reads only `## State`/`## Gates` and treats the rest
as prose, a new tool can append a new document section with zero schema change.

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit, strict
npm test            # vitest — parser, gates, rbac, codeowners, stages/value
npm run check       # both
```

Tests-first is the rule for `lib/parse.ts`: fixtures (including deliberately
malformed documents) live in `test/fixtures/`.
