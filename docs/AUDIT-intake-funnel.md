# Audit — Demand Intake & AI Enhancement Funnel

**Scope:** usability of the demand-intake funnel and AI-agent demand enhancement.
**Method:** static read of the intake surface (`app/intake/*`, `app/api/intake/*`),
the demand model and agents (`lib/demand.ts`, `lib/intake-agent.ts`, `lib/agent/*`),
and the downstream funnel views (`/demands`, `/triage`, `/funnel`, `/board`,
`/uc/[id]`). References are `file:line`.
**Date:** 2026-07-24.

---

## 1. Verdict

The **capture** step is genuinely strong: three coherent intake tools that all
render one deterministic demand page, AI that drafts while the human decides, a
clean offline fallback, and visible governance. As a *form*, intake works.

As a **funnel**, it does not yet close. The path a user actually needs —
*capture → see it → get it accepted (G1) → move it forward* — breaks immediately
after "Save". The demand you capture cannot be opened, cannot be enhanced after
capture, and never appears in the Triage queue that is supposed to accept it.
Triage is static, seed-only, and read-only. So the requester's mandatory
requirement — "a proper intake funnel that is working for the user" — is **not
met end-to-end today**. The good news: every break is at a *seam the codebase was
built to fill*, and the fixes are small and localized.

Overall: **capture = ready; funnel continuity = broken; AI enhancement = works
but under-discovered and over-promised.**

---

## 2. The funnel, end to end — where it breaks

| Step | Route | Reads from | Works for a *captured* demand? |
|---|---|---|---|
| 1. Choose a tool | `/intake` | static | ✅ |
| 2. Capture | `/intake/{chat,form,md}` | — | ✅ |
| 3. Save | `POST /api/intake` → `saveDemand` | writes `demands/<ID>/README.md` | ⚠️ persists only if GitHub App configured (see §5) |
| 4. See it in the list | `/demands` → `listDemands()` | live funnel / working tree | ✅ appears, but **row is not a link** — dead end |
| 5. Open / read it | `/uc/[id]` → `loadCase()` | **GitHub creds required**, else seed | ❌ offline: not viewable; and nothing links here anyway |
| 6. **Accept it (G1)** | `/triage` | **hardcoded `SEED_ROWS`** | ❌ **captured demand never appears; buttons are non-functional** |
| 7. Show in funnel/board | `/funnel`, `/board` → `loadPortfolioRows()` | live funnel / **seed if offline** | ⚠️ only when GitHub App configured |

The three ❌/⚠️ rows are the funnel. Details:

### 2.1 Triage is a mock — the funnel's dead end (critical)
`app/triage/page.tsx:10` builds its queue from `SEED_ROWS`, not from captured
demands:
```ts
const queue = SEED_ROWS.filter((r) => r.stage === "S1" || r.stage === "S2");
```
The Accept / Assign lane / Reject controls are plain `<span>`s
(`app/triage/page.tsx:37-41`) — no handlers, no route, no write. The page's own
footer admits it: *"Keyboard-first triage … lands with M3 write paths."*

Consequence: the demand a user just captured **cannot be accepted**. Every intake
tool tells the user the opposite — the chat says *"a human accepts it at triage"*
(`app/intake/chat/page.tsx:88`), the chooser says *"opens at S1 with G1 open,
awaiting triage"* (`app/intake/page.tsx:61`), and the intake playbook makes G1 the
whole point of handoff. The promise is made four times and kept nowhere. This is
the single biggest gap against "a funnel that works for the user."

### 2.2 The demands list is a dead end (high)
`app/demands/page.tsx:49-61` renders each captured demand as a **non-clickable**
table row. There is no way to open, review, enhance, edit, or advance a demand
from the one page that reliably lists it. Compare `/triage`, whose rows *do* link
to `/uc/[id]` — but only for seed data.

### 2.3 Detail view is gated on GitHub creds (high, offline)
`app/uc/[id]/page.tsx:42-51` (`loadCase`) reads a captured demand only when
`hasGitHubCredentials()` is true; otherwise it falls back to `SEED_README` /
`SEED_ROWS` and returns `notFound()` for a real captured id. So in the default
(no-GitHub) demo, a demand can be captured and listed but not opened.

---

## 3. Demand intake (capture) — usability

### What's good
- **One artifact, three doors.** Chat, Form, Markdown all normalise through
  `buildDemand` (`lib/demand.ts:189`), so output is byte-identical regardless of
  tool (`app/api/intake/route.ts:52`). Excellent, honest design.
- **Deterministic, reviewable output** with a stable placeholder for every empty
  field — the shape never drifts (`lib/demand.ts:163-167`).
- **The offline chat agent is well-built.** `lib/intake-agent.ts` handles `back`,
  `why`, `skip`, thin-answer nudging, and corrections — genuinely conversational
  without a model.
- **Live/offline parity**: the same playbook drives both paths, and live failures
  fall back to the deterministic agent without breaking the interview
  (`app/api/intake/turn/route.ts:78-81`).
- **Clear "still needed" affordance** in Form and Markdown (`missingRequired`),
  with the Save button disabled until required fields are present.

### Issues
| # | Sev | Finding | Where |
|---|---|---|---|
| I1 | High | **No draft persistence.** A page refresh or accidental navigation loses the entire in-progress intake — chat history, form answers, markdown. There is no localStorage/autosave. High abandonment risk on the longer chat. | all three tools |
| I2 | Med | **Live chat state doesn't accumulate.** In live mode, `state.answers` is only populated when the model finally calls `save_demand`; per-turn it returns `{ ...prev, done:false }` (`app/api/intake/turn/route.ts:75-77`). If the model calls `save_demand` early with thin required fields, the chat shows a finished "demand page" preview, but `POST /api/intake` then rejects it with a 400 (`route.ts:63`). The user reaches "done" and cannot save. Relies entirely on model discipline. | turn route |
| I3 | Med | **No back-out / edit in chat before save.** The chat preview is read-only; the only correction path once "done" is *Start over*, which discards everything. | `app/intake/chat/page.tsx:154-166` |
| I4 | Low | **Lane copy contradicts itself.** The chooser says a demand "opens … awaiting triage" and implies `unassigned`, but `classifyDemand` already assigns a concrete lane (defaulting to `transform`) that is written into the saved page (`lib/demand.ts:324`, `route.ts:58`). Users see a lane they never chose. | chooser vs. classify |
| I5 | Low | **Markdown tool is expert-hostile on error.** "Still needed: … fill the matching section(s)" requires the user to know which `## Section` maps to which field. No inline pointer. | `app/intake/md/page.tsx:53-55` |
| I6 | Low | **Requester is free-text and optional**, so most demands will have no owner and no contactable requester — weakens every downstream follow-up. Consider defaulting from the OIDC session. | `lib/demand.ts:146-150` |

---

## 4. AI demand enhancement — usability

The enhancement agent (`lib/agent/intake-enhance.ts`, UI `app/intake/enhancer.tsx`)
is the second focus. The **design is right**: it sharpens the *answers* (not the
rendered markdown), never invents numbers, flags gaps deterministically, scores
signal strength (weak/adequate/strong), and surfaces open questions — all as
drafts the human applies field-by-field. Governance is shown and linked.

### Issues
| # | Sev | Finding | Where |
|---|---|---|---|
| E1 | High | **Enhancement only exists in the Form.** `IntakeEnhancer` is imported only by `app/intake/form/page.tsx:8,70`. The Chat and Markdown paths — including the *entire live AI interview* — offer no "sharpen" step. So "demand enhancement using AI agents" is reachable from one of three doors, and *not* from the AI-native one. | form only |
| E2 | High | **Offline enhancement looks broken.** With no model key (the default), `enhanceOffline` only tidies whitespace and capitalises the first letter (`intake-enhance.ts:89-93,158`). For normal prose input, `changed` is almost always `false`, so **no "Apply" buttons render** (`enhancer.tsx:124-137`). The user clicks "Sharpen", sees no field changes, and reasonably concludes it did nothing — even though the real offline value (assessment + open questions) *is* there. The button label "Sharpen" over-promises what offline mode delivers. | offline path |
| E3 | Med | **Low discoverability.** The enhancer is a dashed box below the fields that only appears after `problem` or `title` is non-empty (`form/page.tsx:68`), with no callout. Many users will submit a weak demand without ever triggering it — defeating its purpose (strengthen *before* triage). | form |
| E4 | Med | **"Sharpen" is manual and blocking.** No proactive "this demand is weak — sharpen it?" nudge tied to the `weak` assessment; the score is only shown *after* the user opts in. The signal (`assess()`) exists but isn't used to prompt the user. | enhancer/form |
| E5 | Low | **Open questions are read-only.** The model asks 4 good clarifying questions but there's no way to answer them in place — the user must scroll up and edit fields manually. A round-trip "answer these" loop would close the gap the questions identify. | `enhancer.tsx:150-157` |

---

## 5. Deployment / persistence caveat (cross-cutting)

Without the GitHub App configured, `saveDemand` writes to the **local working
tree** via `writeFile` (`lib/demands-store.ts:224-235`). On an ephemeral/serverless
host (e.g. Vercel) that filesystem is read-only or per-invocation, so a "saved"
demand may fail to persist or disappear on the next request — while the UI reports
success. The funnel is only trustworthy with the GitHub App on. This should be
surfaced in the UI (the status chip already knows `git.live`), and offline saves
should warn that they are non-durable.

---

## 6. Findings, ranked

| Rank | Sev | Finding | Fix locus |
|---|---|---|---|
| 1 | **Critical** | Triage can't see or accept captured demands (§2.1) | `app/triage/page.tsx` |
| 2 | High | Demands list rows aren't clickable — no path to a captured demand (§2.2) | `app/demands/page.tsx` |
| 3 | High | Captured-demand detail requires GitHub creds; unreachable offline (§2.3) | `app/uc/[id]/page.tsx` |
| 4 | High | Enhancement absent from Chat & Markdown paths (E1) | `enhancer.tsx` reuse |
| 5 | High | Offline enhancement appears to do nothing (E2) | `intake-enhance.ts`, `enhancer.tsx` |
| 6 | High | No draft persistence — refresh loses everything (I1) | all intake tools |
| 7 | Med | Live chat can reach un-saveable "done" (I2) | `api/intake/turn` |
| 8 | Med | Enhancement discoverability & proactive nudge (E3, E4) | `form/page.tsx` |
| 9 | Med | No edit/back-out in chat before save (I3) | `intake/chat` |
| 10 | Low | Lane copy contradiction; markdown error mapping; optional requester (I4–I6) | misc |

---

## 7. Recommendations (prioritized, minimal-change)

**P0 — close the funnel (makes it "work for the user"):**
1. **Make Triage live.** Read the S1/S2 queue from `listDemandRows()` (as
   `/funnel` and `/board` already do via `loadPortfolioRows`), not `SEED_ROWS`.
   Then wire the three actions to a write path — reuse the existing gate/advance
   machinery (`app/api/demands/[id]/advance/route.ts`, `lib/gates.ts`,
   `lib/demand-advance.ts`) so Accept opens G1. This alone converts intake from a
   form into a funnel.
2. **Link the demands list** rows to `/uc/[id]` (one `<Link>`), and **let
   `/uc/[id]` read a captured demand offline** by calling `readDemand(id)` from the
   working tree before the seed fallback — decouple it from `hasGitHubCredentials()`.

**P1 — make AI enhancement pay off:**
3. **Reuse `IntakeEnhancer` on the Chat "done" screen** (and optionally Markdown),
   so the AI-native path can sharpen before save.
4. **Fix the offline "did nothing" perception:** when `live === false`, relabel the
   panel (e.g. "Review & strengthen" instead of "Sharpen with AI"), always show the
   assessment + open questions prominently, and state that field rewrites need a
   model key. Optionally make offline do light structural rewrites (split run-ons)
   so at least one `changed` field appears.
5. **Proactively nudge** on a `weak` score: run a lightweight assessment on blur and
   surface a one-line "This demand is thin — strengthen it?" before Save.

**P2 — resilience & polish:**
6. **Autosave drafts** to `localStorage` per tool (answers / chat state / markdown),
   restore on load. Cheap, removes the biggest abandonment risk.
7. **Guard live-chat save:** have the turn route reject a `save_demand` call that
   omits required fields and re-prompt, so the chat never reaches an un-saveable
   "done".
8. **Warn on non-durable offline saves**, and **default the requester** from the
   session identity.
9. Fix the lane copy so the proposed lane is explained, not contradicted.

---

## 8. One-line summary for the requester

Intake *capture* is well-built and genuinely reproducible; the **funnel is not yet
connected past "Save"** — Triage is a static mock, captured demands can't be opened
from the list, and AI enhancement is hidden in one of three tools and looks inert
offline. Fixing items P0-1, P0-2 and P1-3/P1-4 (all small, at existing seams) is
what turns this into "a proper intake funnel that works for the user."
