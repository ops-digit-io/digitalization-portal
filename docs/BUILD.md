# BUILD — Instructions for an AI coding agent

You are implementing the Digital Unit Portal from the specification in `docs/`.
Read this file first, then `docs/15-roadmap.md`, then the documents for the
milestone you are building.

## What this is

A control plane for enterprise change demand. Employees describe problems; the
portal captures them, triages them into lanes, and orchestrates the
Digital-Unit-owned ones through an eight-stage gated lifecycle. Each use case is
a Git repository of markdown documents. The portal reads and writes those
repositories through pull requests.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js, App Router, server-side route handlers |
| Language | TypeScript, strict |
| UI | shadcn/ui — component registry, tokens, and portal components in `docs/16-ui.md` |
| Tables | TanStack Table over shadcn `table` primitives |
| Forms | React Hook Form + Zod |
| Auth | Auth.js with the corporate OIDC provider, tenant pinned |
| Git access | GitHub App via Octokit |
| Model | Anthropic API |
| Hosting | Vercel, EU region |
| Job state | Vercel KV or equivalent |

## Non-negotiable constraints

These are architectural, not stylistic. Violating any of them breaks the
governance model the specification exists to implement.

1. **No route, tool, or function merges a pull request.** Search your
   implementation for merge calls before every commit. The gate boundary depends
   entirely on this. `docs/13-security.md §13.4`

2. **No agent tool passes a gate.** Not gated by permission — absent from every
   tool array in every configuration. `docs/08-ai-architecture.md §8.4`

3. **The agent's authority is the invoking session's authority.** Agent tool
   calls go through the same route handlers and the same `can()` checks as the
   interface. No privileged path, no service escalation.
   `docs/08-ai-architecture.md §8.1`

4. **Every artifact is markdown.** No YAML, no JSON, no frontmatter in use-case
   repositories. `docs/03-data-model.md`

5. **Content from outside the current user's turn is wrapped before it reaches
   the model.** The retrieval layer wraps; never ask the model to wrap its own
   inputs. `docs/08-ai-architecture.md §8.6`

6. **No per-requester analytics.** No view, query, export, or metric that ranks
   or compares individuals. This is a regulatory boundary, not a product
   decision. `docs/14-compliance.md §14.1`

7. **Credentials never reach the browser.** All GitHub and Anthropic calls happen
   in server-side route handlers.

8. **Value figures carry their confidence state.** An indicative figure must
   never render as committed. `docs/07-value-model.md §7.2`

## Build order

Follow `docs/15-roadmap.md`. Summary:

| M | Deliverable | Exit test |
|---|---|---|
| M1 | Templates, markdown parser, CODEOWNERS generation | Parser extracts state from a sample `README.md`; malformed input flags rather than throws |
| M2 | OIDC auth, session with roles and scopes, `can()`, read-only board | Non-member gets 403; plant-scoped gatekeeper sees but cannot act on another plant |
| M3 | Intake form, repo creation, registry, reconciler, G1/G2, run-lane handover | Form submission creates a valid repo, appears on board, routes to either lane |
| M4 | Stage machine, G3–G7, scaffold materialization, kill/park, webhooks | Test use case traverses S1→S8, every gate a merged PR |
| M5 | Agent read-only: capability loader, skill loader, `portfolio-query`, traces, kill switch | Agent answers within visibility, refuses beyond it; traces complete |
| M6 | Agent intake: intake/classification/dedupe skills, `s1-intake`, injection wrapping | Conversational demand produces valid classified use case; injection eval passes |
| M7 | Async channels, `s2-triage-sweep`, digests | Mail-originated demand appears with clarification request |
| M8 | Drafting skills, `s3-business-case`, `s4-poc-eval` | Drafted case leaves unsupported figures as "needs input" |
| M9 | Value loop, `s8-value-review`, portfolio value views | S8 use case publishes variance unprompted |
| M10 | S6/S7 skills and playbooks | — |

**M3 is the first milestone with standalone value.** Everything before is
foundation. Do not build agent capability before M5 — you would be debugging two
systems at once.

## The markdown parser

The most load-bearing piece of code. `lib/parse.ts`.

Reads state from `README.md` by heading structure:

- `## State` — definition list, `- **Key:** value`
- `## Gates` — table with fixed columns: Gate, Status, Date, By, Note

Requirements:

- **Never throw.** Return a result with a `parseErrors` array. A use case with an
  unreadable state section renders on the board marked "needs attention" — it
  does not vanish.
- Tolerate whitespace variation, bold/non-bold keys, and extra sections.
- Case-insensitive on keys and enum values.
- Unknown keys in `## State` are preserved and ignored, not errors.

Write this with tests first, against fixtures including deliberately malformed
documents. Everything downstream depends on it.

## Enforcement placement

Because artifacts are unvalidated markdown, the checks in
`docs/03-data-model.md §3.14` run **in the portal, before opening a gate pull
request** — not in repository CI.

Implement them in one module (`lib/gates.ts`) as a single function that takes a
parsed use case and a target gate and returns permitted-or-refused-with-reason.
Call it from the gate route and from the interface, so the button is disabled
with the same reason the API would give.

Checks: gate sequence, sponsor and value owner before G3, baseline verified
before G5, confidence not committed before S5, value owner after handover before
G7, self-approval.

## What to ask about rather than assume

The specification leaves these open (`docs/15-roadmap.md §15.5`). If you hit one,
ask rather than picking:

- Gatekeeper scope: per-plant, per-domain, or both (schema-shaping)
- Multi-plant gate rule: all listed plants, or portfolio forum only
- Whether `local`-lane use cases require a sponsor
- Value categories central or plant-configurable

## Definition of done, per milestone

- Exit test in the roadmap passes
- No merge call anywhere in the codebase
- No gate tool in any agent tool array
- New routes call `can()` with the correct capability and context
- Interface copy follows `docs/16-ui.md §16.5`
- Keyboard operable; focus visible
- Works at 360px width

## Testing priorities

In order:

1. The markdown parser, against malformed fixtures
2. `can()` — every role against every capability against every scope
3. Gate sequence enforcement, including attempts to skip
4. Agent tool filtering — that withheld tools are actually absent
5. Injection cases from `docs/09-system-prompt.md §9.4`
6. Idempotency — same intake twice produces one use case

## A note on the specification

Where the spec and your judgement conflict on a **stylistic** matter, use your
judgement. Where they conflict on one of the eight constraints above, the spec
wins — those exist because the alternative fails an audit, a works council
review, or a regulatory classification.

Where the spec is silent, prefer the option that keeps state in Git, keeps the
human in the decision, and keeps the artifact readable by someone who has never
seen the system.
