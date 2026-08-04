#!/usr/bin/env node
/**
 * Record the portal's product video with Playwright.
 *
 * The whole tour runs in ONE page of ONE context, so Playwright writes ONE
 * continuous `.webm` — chapter cards, the lower third and the pointer are drawn
 * into the page by `lib/tour-overlay.mjs` and are therefore part of the capture.
 * Nothing is simulated: every screen is the running app, and the portfolio it
 * shows is whatever `demo-seed.mjs` captured through the real intake.
 *
 *   npm run build && npm start -- -p 3111       # a production server, for smooth frames
 *   CRON_SECRET=… node scripts/demo-seed.mjs    # give the funnel something to show
 *   node scripts/video.mjs                      # → video/digitalization-portal-tour.webm
 *
 * Env: BASE_URL (default http://127.0.0.1:3111), OUT_DIR (default video),
 *      SPEED (1 = normal; 2 = twice as fast, for iterating on the script).
 *
 * Every chapter is wrapped: a screen that fails to load costs its chapter, not
 * the video. Failures are reported at the end with a non-zero exit.
 */

import { chromium } from "playwright";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { launchOptions } from "./lib/browser.mjs";
import { OVERLAY_SCRIPT } from "./lib/tour-overlay.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3111";
const OUT_DIR = process.env.OUT_DIR ?? "video";
const SPEED = Number(process.env.SPEED ?? 1) || 1;
const OUT_NAME = "digitalization-portal-tour.webm";

/** 16:9. Recorded 1:1 — a viewport this size keeps the app's own type readable. */
const SIZE = { width: 1440, height: 810 };

const failures = [];

/* ------------------------------------------------------------------ helpers */

const wait = (page, ms) => page.waitForTimeout(Math.max(1, Math.round(ms / SPEED)));

/**
 * Show a full-bleed chapter card, hold, then fade it out over the next screen.
 * The pointer goes away for the duration — there is nothing on a card to point at,
 * and a cursor floating over the title reads as a stray artifact.
 */
async function chapterCard(page, { eyebrow, title, sub, hold = 2600 }) {
  await page.evaluate((o) => {
    window.__tour.cursorHide();
    window.__tour.card(o);
  }, { eyebrow, title, sub });
  await wait(page, 620 + hold);
}
async function cardOut(page) {
  await page.evaluate(() => {
    window.__tour.cardOut();
    window.__tour.cursorShow();
  });
  await wait(page, 560);
}

/** The lower third. Re-applied automatically after every navigation. */
let activeCaption = null;
async function caption(page, o) {
  activeCaption = o;
  await page.evaluate((c) => window.__tour.caption(c), o);
  await wait(page, 420);
}
async function captionOut(page) {
  activeCaption = null;
  await page.evaluate(() => window.__tour.captionOut());
  await wait(page, 340);
}

/**
 * Re-apply the overlay state a fresh document threw away. Every full navigation
 * re-runs the init script, which mounts a blank overlay: without this the caption
 * disappears and the pointer teleports back to the centre of the screen.
 */
let lastCursor = { x: SIZE.width / 2, y: SIZE.height / 2 };
async function restoreOverlay(page) {
  await page.evaluate(([c, p]) => {
    window.__tour.cursorAt(p.x, p.y);
    window.__tour.cursorShow();
    if (c) window.__tour.caption(c);
  }, [activeCaption, lastCursor]);
}

async function goto(page, path, { settle = 700 } = {}) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
  await restoreOverlay(page);
  await wait(page, settle);
}

const scroll = (page, y, ms = 1400) =>
  page.evaluate(([to, d]) => window.__tour.smoothScroll(to, d), [y, Math.round(ms / SPEED)]);

/** Move the pointer to an element's centre. Returns false when it isn't there. */
async function pointAt(page, locator, ms = 700) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  lastCursor = { x, y };
  await page.evaluate(([px, py, d]) => window.__tour.cursorTo(px, py, d), [x, y, Math.round(ms / SPEED)]);
  await wait(page, ms);
  return true;
}

/**
 * Point at a control, ripple, then actually click it. Pass `nav` when the control
 * navigates (a link, not an in-page toggle) so the overlay is put back afterwards.
 */
async function clickAt(page, locator, { move = 700, after = 700, nav = false } = {}) {
  if (!(await pointAt(page, locator, move))) return false;
  await page.evaluate(() => window.__tour.ripple());
  await wait(page, 220);
  await locator.click({ timeout: 8000 });
  if (nav) {
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await restoreOverlay(page);
  }
  await wait(page, after);
  return true;
}

/** Type into a field at a human cadence, with the pointer parked on it. */
async function typeInto(page, locator, text, { delay = 28, after = 500 } = {}) {
  await pointAt(page, locator, 600);
  await locator.click({ timeout: 8000 });
  await locator.pressSequentially(text, { delay: Math.max(4, Math.round(delay / SPEED)) });
  await wait(page, after);
}

/** Run one chapter; a failure inside it never aborts the recording. */
async function chapter(name, fn) {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    failures.push(`${name}: ${msg}`);
    console.error(`  ✗ ${name} — ${msg}`);
  }
}

/* -------------------------------------------------------------------- tour */

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch(launchOptions());
const context = await browser.newContext({
  viewport: SIZE,
  recordVideo: { dir: OUT_DIR, size: SIZE },
  reducedMotion: "no-preference",
});
await context.addInitScript(OVERLAY_SCRIPT);

const page = await context.newPage();
const t0 = Date.now();

/* 00 — Title -------------------------------------------------------------- */
await chapter("title", async () => {
  await goto(page, "/", { settle: 300 });
  await page.evaluate(() => window.__tour.cursorHide());
  await chapterCard(page, {
    eyebrow: "Digital Unit",
    title: "The Digitalization Portal",
    sub: "One front door for every change demand — captured once, triaged into a lane, and carried to measured value.",
    hold: 2720,
  });
  // The title card doubles as the poster frame, so an embed has something to show
  // before playback starts. Taken from the page, not carved out of the video.
  await page.screenshot({ path: join(OUT_DIR, "poster.png") });
  await cardOut(page);
});

/* 01 — Launchpad ---------------------------------------------------------- */
await chapter("launchpad", async () => {
  await page.evaluate(() => window.__tour.cursorShow());
  await caption(page, {
    eyebrow: "01 · Launchpad",
    title: "Every tool behind one door",
    sub: "Diagnose, intake, analyse, steer, build, govern — grouped by what you are trying to do, not by which system owns it.",
  });
  await wait(page, 1482);
  await scroll(page, 460, 1700);
  await wait(page, 1170);
  await scroll(page, 940, 1500);
  await wait(page, 1248);
  await scroll(page, 0, 1100);

  // The inline filter — 38 tools stay findable.
  const search = page.locator('main input[placeholder*="Search"]').first();
  await typeInto(page, search, "value", { after: 1500 });
  await caption(page, {
    eyebrow: "01 · Launchpad",
    title: "38 tools, one search",
    sub: "Filter the launchpad inline, or hit ⌘K anywhere in the portal.",
  });
  await wait(page, 1170);
});

/* 02 — Intake ------------------------------------------------------------- */
await chapter("intake", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act I · Capture",
    title: "Three ways in, one demand page",
    sub: "Chat, form or markdown. Whichever you pick, the same deterministic page is written to the funnel.",
    hold: 2295,
  });
  await goto(page, "/intake", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "Act I · Capture",
    title: "Nobody is turned away for using the wrong tool",
    sub: "The same answers always render the same markdown — so preview and saved page can never disagree.",
  });
  await wait(page, 2028);
  await scroll(page, 380, 1400);
  await wait(page, 1404);
});

/* 03 — Guided interview --------------------------------------------------- */
await chapter("intake-chat", async () => {
  await goto(page, "/intake/chat", { settle: 1400 });
  // Top-right: the chat's composer sits exactly where the default panel would be.
  await caption(page, {
    at: "top-right",
    eyebrow: "03 · Guided intake",
    title: "An interview, not a form to survive",
    sub: "The agent runs the s1-intake playbook: one question at a time, in the requester's own words.",
  });
  await wait(page, 1170);

  const input = page.locator('input[type="text"], textarea').last();
  await typeInto(page, input, "Downtime reasons are typed free-hand, so nobody can tell why the line actually stops.", {
    delay: 22,
    after: 400,
  });
  await page.keyboard.press("Enter");
  await wait(page, 1638);

  await typeInto(page, page.locator('input[type="text"], textarea').last(),
    "Maintenance rebuilds the reason list by hand every week — about a day, and the result is still argued about.",
    { delay: 22, after: 400 });
  await page.keyboard.press("Enter");
  await wait(page, 1794);

  await caption(page, {
    at: "top-right",
    eyebrow: "03 · Guided intake",
    title: "Classified while you type",
    sub: "The proposed lane is visible from the first answer — and triage, not the tool, confirms it.",
  });
  await page.evaluate(() => window.__tour.scrollElement("main", -1, 900));
  await wait(page, 1560);
});

/* 04 — The demand page ---------------------------------------------------- */
await chapter("demand-page", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act I · Capture",
    title: "Git is the system of record",
    sub: "Every demand is one markdown page. No hidden database row, no schema to migrate — the artifact is the truth.",
    hold: 2465,
  });
  await goto(page, "/uc/UC-2026-0001", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "04 · Demand record",
    title: "State, gates and history on the page itself",
    sub: "The parser reads only ## State and ## Gates — everything else is prose it will never break on.",
  });
  await wait(page, 1872);
  await scroll(page, 520, 1600);
  await wait(page, 1482);
  await scroll(page, 1180, 1500);
  await wait(page, 1482);
});

/* 05 — Triage ------------------------------------------------------------- */
await chapter("triage", async () => {
  await goto(page, "/triage", { settle: 900 });
  await caption(page, {
    eyebrow: "05 · Triage",
    title: "A lane, a sponsor, a named decision",
    sub: "Accepting a demand records the gate passage against a person. Authority is the session's — no tool can pass a gate.",
  });
  await wait(page, 2028);
  await scroll(page, 420, 1400);
  await wait(page, 1560);
});

/* 06 — Portfolio board ---------------------------------------------------- */
await chapter("board", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act II · Steer",
    title: "The whole portfolio, one board",
    sub: "Eight stages, seven gates. Flow, stalls and health at a glance — and value that never overstates itself.",
    hold: 2380,
  });
  await goto(page, "/board", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "06 · Portfolio board",
    title: "Demand by stage, S1 to S8",
    sub: "Pipeline value is shown as indicative and is never summed with realized value into one flattering headline.",
  });
  await wait(page, 2184);

  // Re-cut the same board by lane — same data, a different question. The grouping
  // tabs are links (each grouping is a URL), not buttons.
  const laneTab = page.getByRole("link", { name: /^Lane$/ }).first();
  if (await clickAt(page, laneTab, { after: 1400, nav: true }).catch(() => false)) {
    await caption(page, {
      eyebrow: "06 · Portfolio board",
      title: "Re-cut it by lane or by plant",
      sub: "The lane decides ownership and how far through the lifecycle a demand runs. Same demands, different question.",
    });
    await wait(page, 1872);
  }
  await scroll(page, 380, 1300);
  await wait(page, 1326);
});

/* 07 — Requirements ------------------------------------------------------- */
await chapter("requirements", async () => {
  await goto(page, "/requirements", { settle: 900 });
  await caption(page, {
    eyebrow: "07 · Requirements",
    title: "From a paragraph of pain to epics and stories",
    sub: "The intake is analysed, enhanced with domain knowledge, and turned into standardized requirements a team can take.",
  });
  await wait(page, 2028);
  await goto(page, "/requirements/UC-2026-0001", { settle: 1000 });
  await wait(page, 1404);
  await scroll(page, 620, 1600);
  await wait(page, 1638);
});

/* 08 — Analysis + simulation ---------------------------------------------- */
await chapter("analysis", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act III · Decide",
    title: "Workload against value",
    sub: "What the portfolio would cost to build, what it is worth, and how confident that number is allowed to be.",
    hold: 2380,
  });
  await goto(page, "/analysis?horizon=quarter", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "08 · Implementation analysis",
    title: "Can the team actually do this?",
    sub: "Person-weeks of work against business value for the active portfolio — sized for the team you have.",
  });
  await wait(page, 2184);
  await scroll(page, 480, 1500);
  await wait(page, 1638);

  await goto(page, "/simulate", { settle: 1000 });
  await caption(page, {
    eyebrow: "09 · Business case simulation",
    title: "A band, not a single number",
    sub: "P10 / P50 / P90 with the assumptions that drive them — indicative until a pilot measures the baseline.",
  });
  await wait(page, 2184);
  await scroll(page, 520, 1500);
  await wait(page, 1560);
});

/* 09 — Value cockpit ------------------------------------------------------ */
await chapter("value", async () => {
  await goto(page, "/value", { settle: 900 });
  await caption(page, {
    eyebrow: "10 · Value cockpit",
    title: "Pipeline, committed and realized are different objects",
    sub: "They are never summed into one headline. Portfolio value counts committed plus realized only.",
  });
  await wait(page, 2652);
  await scroll(page, 320, 1300);
  await wait(page, 1404);
});

/* 10 — Funnel ------------------------------------------------------------- */
await chapter("funnel", async () => {
  await goto(page, "/funnel", { settle: 900 });
  await caption(page, {
    eyebrow: "11 · Use-case funnel",
    title: "Killing a case early is the system working",
    sub: "Conversion, drop-off, dwell and kill rate by gate — so a stalled portfolio is visible before it is expensive.",
  });
  await wait(page, 2340);
  await scroll(page, 520, 1600);
  await wait(page, 1716);
});

/* 11 — Process funnel (pre-funnel) ---------------------------------------- */
await chapter("process", async () => {
  await goto(page, "/process", { settle: 900 });
  await caption(page, {
    eyebrow: "12 · Process funnel",
    title: "Diagnose the process before you digitalize it",
    sub: "Score a process first, cut the smallest shippable increment, and let the evidenced result become the demand.",
  });
  await wait(page, 2340);
  await scroll(page, 460, 1500);
  await wait(page, 1560);
});

/* 12 — The people half ---------------------------------------------------- */
await chapter("people", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act IV · The people half",
    title: "A hub only scales if the work is carried locally",
    sub: "Who carries digitalization in each plant, where the network has holes, and who is actually asking.",
    hold: 2380,
  });
  await goto(page, "/champions", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "13 · Digital champions",
    title: "Network coverage, and where it is thin",
    sub: "Coverage and gaps per plant and domain — the portfolio's people risk, on the same page as its demand.",
  });
  await wait(page, 2184);
  await scroll(page, 420, 1400);
  await wait(page, 1404);

  await goto(page, "/personas", { settle: 900 });
  await caption(page, {
    eyebrow: "14 · Persona analyst",
    title: "Who is asking, and what they actually do all day",
    sub: "Requestor profiles and cohorts — so requirements cite a real role instead of an imagined user.",
  });
  await wait(page, 2184);
});

/* 13 — Governance --------------------------------------------------------- */
await chapter("governance", async () => {
  await captionOut(page);
  await chapterCard(page, {
    eyebrow: "Act V · Govern",
    title: "The portal never merges",
    sub: "It opens pull requests. The merge under CODEOWNERS stays the human decision the whole governance model rests on.",
    hold: 2720,
  });
  await goto(page, "/settings", { settle: 200 });
  await cardOut(page);
  await caption(page, {
    eyebrow: "15 · Configuration",
    title: "Every integration, and whether it is really wired",
    sub: "Read-only status: SSO, the GitHub App, the model provider. Credentials are server-side and never reach the browser.",
  });
  await wait(page, 2340);
  await scroll(page, 480, 1500);
  await wait(page, 1560);
});

/* 14 — Built for the floor: dark mode, German ----------------------------- */
await chapter("locale-theme", async () => {
  await goto(page, "/", { settle: 700 });
  await caption(page, {
    eyebrow: "16 · Made to be used",
    title: "Light or dark, English or German",
    sub: "Four plants, one portal — the interface meets people where they work.",
  });
  await wait(page, 1200);

  await clickAt(page, page.getByRole("button", { name: /Toggle theme/i }).first(), { after: 1600 });

  const lang = page.getByRole("button", { name: /Language/i }).first();
  if (await clickAt(page, lang, { after: 700 }).catch(() => false)) {
    await clickAt(page, page.getByRole("button", { name: /Deutsch|German|DE/i }).first(), { after: 2200 });
  }
  await scroll(page, 420, 1400);
  await wait(page, 1404);
});

/* 15 — Close -------------------------------------------------------------- */
await chapter("close", async () => {
  await captionOut(page);
  await page.evaluate(() => window.__tour.cursorHide());
  await chapterCard(page, {
    eyebrow: "Digital Unit",
    title: "Capture once. Decide in the open. Measure what shipped.",
    sub: "The Digitalization Portal — git is the system of record, and every artifact is markdown.",
    hold: 3400,
  });
});

/* ------------------------------------------------------------------ finish */

const seconds = Math.round((Date.now() - t0) / 1000);
await page.close();
await context.close();
await browser.close();

// Playwright names the file after the page's guid; give it the name we ship.
const src = await (async () => {
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".webm") && f !== OUT_NAME);
  return files.length ? join(OUT_DIR, files.sort().pop()) : null;
})();

if (src) {
  await rm(join(OUT_DIR, OUT_NAME), { force: true });
  await rename(src, join(OUT_DIR, OUT_NAME));
  console.log(`\n${join(OUT_DIR, OUT_NAME)}  ·  ~${seconds}s of tour`);
} else {
  console.error("\nno video file was produced");
  process.exitCode = 1;
}

if (failures.length) {
  console.error(`\n${failures.length} chapter(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log("all chapters recorded");
}
