import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3111";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const launchOpts = {};
const exe = ["/opt/pw-browsers/chromium/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => existsSync(p));
if (exe) launchOpts.executablePath = exe;

const browser = await chromium.launch(launchOpts);

async function shot(name, path, { vw = 1280, vh = 1000, full = true } = {}) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  const res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(`shot ${name} ${path} ${res ? res.status() : "?"}`);
  await page.close();
}

// Static analysis + simulation surfaces
await shot("10-analysis-quarter", "/analysis?horizon=quarter");
await shot("11-analysis-year", "/analysis?horizon=year");
await shot("12-simulate", "/uc/UC-2026-0041/simulate");
await shot("13-analysis-mobile", "/analysis?horizon=quarter", { vw: 390, vh: 844 });
await shot("14-simulate-mobile", "/uc/UC-2026-0041/simulate", { vw: 390, vh: 844 });

// Chat with a live agent interaction
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Analyse this quarter/i }).click();
  await page.getByText(/offline analyst|live model/i).waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/09-chat-agent.png`, fullPage: true });
  console.log("shot 09-chat-agent (with agent reply)");
  await page.close();
}

await browser.close();
console.log("done");
