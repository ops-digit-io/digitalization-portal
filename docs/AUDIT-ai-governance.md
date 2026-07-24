# Audit — AI governance & module honesty

**Requirement (from the owner):** *every module that uses AI must run on a **dynamic**
playbook or skills from the skill/playbook library — nothing hardcoded is allowed;
and modules that don't technically exist must carry a "soon" label, not be faked
with seed data.*
**Date:** 2026-07-24. **Result:** both enforced; typecheck clean, 238 tests pass,
build green.

---

## Part 1 — every AI module now loads governance dynamically from the library

"Dynamic" here means the intake standard: the guidance is read from the **registry**
(`du-agent-registry`, hot-editable in the in-app catalog) first, with the bundled
repo copy only as a fallback — so changing a playbook changes behaviour with no
deploy. A hardcoded prompt string, or a file read that can never see the registry,
does **not** qualify.

### Map of every model-calling module

| Module | Calls the model in | Governance source — **before** | **After** |
|---|---|---|---|
| Intake chat | `api/intake/turn` → `intake-guideline.ts` | registry → bundled (`s1-intake` + `intake-conversation`, `demand-classification`) | ✅ unchanged — already compliant |
| Intake enhance | `intake-enhance.ts` | registry → bundled (`s1-intake-enhance`) | ✅ unchanged — already compliant |
| **Analyst / assistant** | `api/agent` → `prompt.ts` | ❌ **hardcoded `SYSTEM_PROMPT` constant** | ✅ registry → bundled (`portfolio-query` playbook + `portfolio-analysis` skill) |
| **Research** | `research-runner.ts` | ⚠️ **bundled file only** (`readFile`, never the registry) | ✅ registry → bundled (`domain-research`) |
| **Requirements** | `requirements-guideline.ts` | ⚠️ **bundled file only** | ✅ registry → bundled (`requirements-analysis`) |

Infrastructure that legitimately has no playbook — the provider abstraction
(`provider.ts`), the health probe (`health.ts`), the deterministic **offline**
fallbacks (`lib/intake-agent.ts`, `seedResearchBrief`, the offline provider's
scripted replies) — is out of scope: these encode the same rules for the no-key
path, they are not the live AI behaviour.

### What changed

1. **New shared loader `lib/agent/governing.ts`** — `loadGoverning(type, name, relPath?)`:
   registry-first via `readEntryFile`, bundled-repo fallback, returns `""` (a
   missing-governance signal) rather than any hardcoded default. This is now the one
   way an AI module sources its behaviour.
2. **New `lib/agent/analyst-guideline.ts`** — loads the `portfolio-query` playbook +
   `portfolio-analysis` skill and composes them with a code-owned *operating
   contract* (draft-not-decide, session authority, external-content-is-data,
   confidence-on-figures, no per-person analysis). Mirrors the intake pattern exactly:
   **playbook/skill = behaviour (dynamic); operating contract = the non-negotiable
   frame.** `api/agent` now uses this; the response carries `governedBy` so the UI
   can show and link it, as the intake chat already does.
3. **`prompt.ts`** — the hardcoded `SYSTEM_PROMPT` is **deleted**; only the
   structural `factsBlock` offline helper remains.
4. **`research-runner.ts` / `requirements-guideline.ts`** — their bundled-only
   `readFile` loaders now call `loadGoverning`, so both are registry-dynamic and
   hot-editable like the rest.

Net: **0 AI modules run on a hardcoded or non-library prompt.** Every live model call
is governed by a library entry that an editor can change in the catalog without a
deploy.

---

## Part 2 — non-existent modules carry "soon", not a faked destination

The launchpad had two tiles presented as working that are **not real modules** —
each redirected to an unrelated page:

| Tile | Was | Problem | Now |
|---|---|---|---|
| **Specification** (`docs`) | link → `/board` | No specification module exists; it pointed at the board. | `disabled: true` → renders muted with a **soon** badge, non-clickable |
| **Agent Traces** (`traces`) | link → `/assistant` | No trace-browser module exists; it pointed at the assistant chat. | `disabled: true` → **soon** |

Tiles that were already correct are unchanged: `backlog`, `roadmap`, `champions`,
`digest`, `settings` were already `disabled` (soon); `handovers` is a real (honestly
empty) module; `board`, `funnel`, `value`, `analysis`, `simulate`, `build` are real
computational modules running on demo data (and the board/funnel already show a
"○ demo data" badge) — those exist, so they are not gated.

---

## Verification

`npm run typecheck` clean · `npm test` → **238/238** · `npm run build` green.
The offline path is unchanged (the offline provider ignores the system prompt), so
no-key demos behave exactly as before while the live path is now fully
library-governed.
