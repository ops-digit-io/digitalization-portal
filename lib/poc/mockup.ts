/**
 * Dashboard-mockup artifact generator (Feature 3, step 3: "build the artifact via
 * agents"). Produces a SELF-CONTAINED HTML dashboard (inline CSS/SVG, no external
 * requests) so it renders anywhere — in an iframe preview, in the repo, offline.
 *
 * Deterministic here; in live mode the model authors the artifact. Either way it
 * is committed to `poc/` and opened as a pull request — never merged by the portal.
 */

import type { UseCaseSeed } from "./scaffold.js";

/** A small deterministic series derived from the id, so the mockup looks real. */
function series(seed: string, n: number, base: number, spread: number): number[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 997;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (h * 31 + i * 17) % 997;
    out.push(Math.round(base + (h / 997) * spread));
  }
  return out;
}

function barsSvg(values: number[], color: string): string {
  const w = 320, h = 120, pad = 8;
  const max = Math.max(...values, 1);
  const bw = (w - pad * 2) / values.length;
  const bars = values
    .map((v, i) => {
      const bh = (v / max) * (h - pad * 2);
      const x = pad + i * bw + 2;
      const y = h - pad - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${color}"/>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">${bars}</svg>`;
}

export function generateDashboardMockup(seed: UseCaseSeed): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = series(seed.id + "trend", 6, 20, 60);
  const causes = series(seed.id + "cause", 5, 10, 40);
  const kpiNow = trend[trend.length - 1] ?? 0;
  const kpiPrev = trend[0] ?? 0;
  const delta = kpiPrev ? Math.round(((kpiNow - kpiPrev) / kpiPrev) * 100) : 0;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${seed.id} · PoC dashboard</title>
<style>
  :root{--bg:#0b0b0d;--card:#17171b;--fg:#f4f4f5;--mut:#a1a1aa;--ok:#2f9e5c;--info:#3577c9;--warn:#c79a1f;--bd:#2a2a30}
  *{box-sizing:border-box} body{margin:0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
  .wrap{max-width:860px;margin:0 auto;padding:24px}
  .head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}
  h1{font-size:18px;margin:0} .sub{color:var(--mut);font-size:13px}
  .tag{font-size:11px;border:1px solid var(--bd);border-radius:6px;padding:1px 6px;color:var(--mut)}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
  .card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px}
  .kpi{font-size:26px;font-weight:600} .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
  .charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .note{margin-top:16px;color:var(--mut);font-size:12px;border-top:1px solid var(--bd);padding-top:12px}
  .down{color:var(--ok)} .up{color:var(--warn)}
  @media(max-width:640px){.grid,.charts{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
  <div class="head">
    <h1>${seed.title}</h1>
    <span class="tag">${seed.plant}</span>
    <span class="tag">${seed.domain ?? "process"}</span>
    <span class="tag">PoC mockup</span>
  </div>
  <div class="sub">Agent-generated proof-of-concept dashboard · ${seed.id} · not production data</div>

  <div class="grid">
    <div class="card"><div class="lbl">Current metric</div><div class="kpi">${kpiNow}%</div>
      <div class="${delta <= 0 ? "down" : "up"}">${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs. start</div></div>
    <div class="card"><div class="lbl">Coverage</div><div class="kpi">78%</div><div class="sub">of cases from existing data</div></div>
    <div class="card"><div class="lbl">Latency</div><div class="kpi">8 min</div><div class="sub">median to availability</div></div>
  </div>

  <div class="charts">
    <div class="card"><div class="lbl">Trend (${months.join(" · ")})</div>${barsSvg(trend, "#3577c9")}</div>
    <div class="card"><div class="lbl">Top drivers</div>${barsSvg(causes, "#c79a1f")}</div>
  </div>

  <div class="note">
    Drafted by the Digitalization Portal assistant as PoC evidence. Figures are
    illustrative, computed from existing records. This artifact is committed to
    <code>poc/</code> and opened as a pull request — a human reviews and merges.
  </div>
</div></body></html>`;
}
