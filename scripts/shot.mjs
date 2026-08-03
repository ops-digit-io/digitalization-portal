import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./lib/browser.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3111";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

// Prefer the pre-installed Chromium whatever its build number; fall back to
// Playwright's own resolver.
const launchOpts = launchOptions();

const shots = [
  { name: "01-chat-desktop", path: "/", vw: 1280, vh: 900, full: false },
  { name: "02-board-desktop", path: "/board", vw: 1280, vh: 900, full: true },
  { name: "03-usecase-desktop", path: "/uc/UC-2026-0041", vw: 1280, vh: 1000, full: true },
  { name: "04-board-mobile", path: "/board", vw: 390, vh: 844, full: true },
  { name: "05-usecase-mobile", path: "/uc/UC-2026-0041", vw: 390, vh: 844, full: true },
  { name: "06-chat-mobile", path: "/", vw: 390, vh: 844, full: false },
];

const browser = await chromium.launch(launchOpts);
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.vw, height: s.vh }, deviceScaleFactor: 2 });
  const res = await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 30000 });
  if (!res || !res.ok()) {
    console.error(`FAIL ${s.path} → ${res ? res.status() : "no response"}`);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: s.full });
  console.log(`shot ${s.name}  ${s.path}  ${res ? res.status() : "?"}`);
  await page.close();
}
await browser.close();
console.log("done");
