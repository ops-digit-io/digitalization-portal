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

Milestone **M1 — Template & enforcement foundation** (portal-side, markdown-native).
This is the load-bearing base every later milestone inherits; it is pure logic and
runs without auth, GitHub, or a UI. See the build plan for the full roadmap
(M0–M10) and the two locked decisions (portal-side enforcement; no gatekeeper role).

## What's here (M1)

| Module | Purpose |
|---|---|
| `lib/parse.ts` | Markdown state extraction. Never throws; unreadable state → "needs attention". |
| `lib/gates.ts` | The single gate-enforcement point, called before any gate PR is opened. |
| `lib/rbac.ts` | `can()` capability resolution (adapted: no gatekeeper). |
| `lib/stages.ts` | Stage machine transition table + template materialisation map (data-driven seam). |
| `lib/lanes.ts` | Lane taxonomy and triage routing (data-driven seam). |
| `lib/value.ts` | Confidence states and value categories (data-driven seam). |
| `lib/codeowners.ts` | CODEOWNERS generation (no gatekeeper entries). |
| `registry/*.md` | Human-editable registries: roles, plants, domains, value model, fleet index, handovers. |
| `templates/*.md` | Artifact templates; guidance in HTML comments, materialised on gate passage. |

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
