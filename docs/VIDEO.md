# The product video

`npm run video` records a ~3 minute product tour of the running portal with
Playwright and writes it to `video/digitalization-portal-tour.webm`, plus a
`video/poster.png` title frame for embeds.

Nothing in the video is a mock-up. The whole tour runs in one page of one browser
context, so Playwright produces one continuous take; the chapter cards, the lower
third and the pointer are drawn *into the page* by `scripts/lib/tour-overlay.mjs`,
which is why they end up in the recording at all. Every screen is the real app,
and the portfolio on it is real too — captured through the real intake by
`scripts/demo-seed.mjs`.

## Recording it

The video needs a portal that is (a) fast and (b) not empty. Both matter: `next
dev` recompiles on navigation and the pauses land in the take, and an unseeded
funnel films an empty board.

```bash
npm run build
CRON_SECRET=demo-video npx next start -p 3111 &

# Give the funnel something to show (9 cases, spread across S1–S5).
CRON_SECRET=demo-video npm run demo:seed

npm run video

# Put the working tree back.
npm run demo:clean
```

`BASE_URL` points the recorder somewhere else (default `http://127.0.0.1:3111`),
`OUT_DIR` changes where the file lands, and `SPEED` divides every dwell — use
`SPEED=3` to check a script change in about a minute without waiting through the
full take.

## What the demo seed does, and does not, do

`demands/` still starts empty, exactly as its README promises. The seeder does not
write fixtures into it: it captures each case through `POST /api/intake` and then
moves it with the same routes a human uses — `edit` to name the sponsor and value
owner, `triage` for the lane, `business-case` to quantify it, `advance` to pass
each gate. What the video shows is therefore the real write path.

The ids it created are recorded in `.demo-seed.json` (gitignored), and
`npm run demo:clean` removes exactly those case folders and the interim buffer —
never anything else in `demands/`.

Two things worth knowing about the seed:

- **The intake submit throttle applies.** It is 10 per user per 5 minutes, and the
  seed captures 9. The limiter is in-process when KV is not configured, so a server
  restart clears it if you need to re-seed immediately.
- **S5 is the ceiling.** `advanceDemand` calls `canOpenGate` without the case's
  business case, so G5's "baseline must be verified" precondition can never be met
  through `/api/demands/[id]/advance`. Cases stop at S5; nothing in the seed can
  reach S6–S8 until that route passes the business case through.

The Process Funnel is not seeded — it has its own store (`.process-workspace/`).
To film an engagement with a filled digest on a deployment with no model key,
create one and paste a digest into it (see `docs/PROCESS-DIGEST.md`).

## Changing the script

`scripts/video.mjs` is the narrative — one `chapter()` per beat, in order. A
chapter is wrapped, so a screen that fails to load costs that chapter and not the
recording; failures are listed at the end and set a non-zero exit code.

The helpers worth knowing:

| Helper | What it does |
|---|---|
| `chapterCard` / `cardOut` | Full-bleed act card; hides the pointer while it is up. |
| `caption` / `captionOut` | The lower third. `at: "top-right"` moves it off a screen whose own controls sit bottom-left (the chat composer, for instance). |
| `goto` | Navigates *and* re-applies the overlay — a full navigation re-runs the init script and drops caption and pointer position. |
| `pointAt` / `clickAt` | Moves the drawn pointer to an element, ripples, then really clicks it. Pass `nav: true` for a control that navigates. |
| `typeInto` | Types at a human cadence with the pointer parked on the field. |

Two things that will bite when editing `scripts/lib/tour-overlay.mjs`: it is one
big template literal, so **no backticks inside it**, and no `*/` inside a block
comment in any of these files.

## Format

VP8/WebM, 1440×810, 25 fps — what Playwright's bundled encoder produces, and it
plays in every current browser. The viewport is recorded 1:1 rather than upscaled
to 1080p so the app's own 14px type stays legible.

For an MP4 (PowerPoint, Keynote, LinkedIn), convert with a full ffmpeg — the one
Playwright bundles only encodes VP8:

```bash
ffmpeg -i video/digitalization-portal-tour.webm \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p \
  video/digitalization-portal-tour.mp4
```
