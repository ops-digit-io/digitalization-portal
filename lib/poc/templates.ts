/**
 * PoC stack templates — the tech-specific file sets a scaffolded `uc-*` repository
 * gets, chosen by what the PoC should PROVE.
 *
 * `scaffold.ts` lays the case skeleton (README, CODEOWNERS, intake). This module
 * adds the runnable proof: a Streamlit or Dash app, a FastAPI service, an HTML
 * mockup built from the demand's requirements, a self-contained dashboard, a
 * Grafana model, a Jupyter analysis. Every file is written under `poc/`, so the
 * case record at the repo root stays clean and the whole proof is one directory.
 *
 * A stack is data, not code paths: adding one is a single entry in `POC_STACKS`.
 * Everything is a pure function of the seed (+ the demand's requirements when we
 * have them), so a template is unit-tested without a filesystem or a git host, the
 * same bargain the mockup generator already makes. Nothing here reaches the network
 * — a generated app runs offline against its own committed `data/sample.csv`.
 */

import type { ScaffoldFile, UseCaseSeed } from "./scaffold.js";
import type { ArtifactKind } from "./spec.js";
import { generateDashboardMockup } from "./mockup.js";

/** What the templates can be told about the demand beyond the seed. */
export interface TemplateContext {
  /** Short requirement/feature lines from the demand, to drive a mockup's UI. */
  requirements?: string[];
}

export interface PocStack {
  /** Stable id used in the URL/API — `python-streamlit`, `html-mockup`, … */
  id: string;
  label: string;
  /** The GitHub template repository (name, in the deployment's org) this stack
   *  materializes as. Used for generate-from-template when the org has it and
   *  `POC_USE_TEMPLATE_REPOS` is on; otherwise the files below are written directly. */
  templateRepo: string;
  /** Which PoC category it satisfies — reuses the spec's taxonomy. */
  category: ArtifactKind;
  language: "python" | "html" | "json" | "sql";
  /** One line: what you get and when to pick it. */
  description: string;
  /** How a reviewer runs it, shown in the UI. */
  run: string;
  /** The files laid under `poc/` at scaffold time. */
  files(seed: UseCaseSeed, ctx?: TemplateContext): ScaffoldFile[];
  /** A self-contained HTML evidence snapshot for the review PR + iframe preview.
   *  Defaults to the dashboard mockup so a reviewer who cannot run the stack still
   *  sees the expected output. */
  previewHtml(seed: UseCaseSeed, ctx?: TemplateContext): string;
}

// The picker's category grouping lives in the light metadata module (no server
// template code), and is re-exported here for callers that already import the registry.
export { STACK_CATEGORIES } from "./stacks-meta.js";

// --- shared helpers ---------------------------------------------------------

/** A tiny deterministic hash walk, so sample data looks real and never varies. */
function walk(seedStr: string, n: number, base: number, spread: number): number[] {
  let h = 0;
  for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) % 997;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h = (h * 31 + i * 17) % 997;
    out.push(Math.round(base + (h / 997) * spread));
  }
  return out;
}

const PERIODS = ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"];
const CATEGORIES = ["Line A", "Line B", "Line C"];

/** The one dataset every runnable stack reads — committed so the PoC runs offline. */
function sampleCsv(seed: UseCaseSeed): string {
  const rows = ["period,category,value"];
  CATEGORIES.forEach((cat, ci) => {
    const vals = walk(seed.id + cat, PERIODS.length, 20 + ci * 10, 60);
    PERIODS.forEach((p, pi) => rows.push(`${p},${cat},${vals[pi]}`));
  });
  return rows.join("\n") + "\n";
}

const PY_GITIGNORE = `__pycache__/
*.py[cod]
.venv/
venv/
.env
.ipynb_checkpoints/
.streamlit/secrets.toml
`;

/** Requirement lines a mockup can render — pulled from the demand's requirements.md. */
export function extractRequirementLines(markdown: string | undefined): string[] {
  if (!markdown) return [];
  const out: string[] = [];
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const m = /^####\s+(.*)$/.exec(line) ?? /^[-*]\s+(.*)$/.exec(line);
    const text = m?.[1]?.replace(/\*\*/g, "").replace(/`/g, "").trim();
    if (text && text.length > 3 && !/^(epic|nfr|assumption|risk|out of scope)/i.test(text)) out.push(text);
    if (out.length >= 8) break;
  }
  return out;
}

/** The features a mockup lists — requirements when we have them, else a sane default. */
function featureLines(seed: UseCaseSeed, ctx?: TemplateContext): string[] {
  if (ctx?.requirements && ctx.requirements.length) return ctx.requirements;
  return [
    `See the current state of ${seed.title.toLowerCase()} at a glance`,
    `Filter by line and time window`,
    `Drill into the dimension that drives the problem`,
    `Export the evidence for the gate review`,
  ];
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const runNote = (seed: UseCaseSeed): string =>
  `PoC for ${seed.id} · ${seed.plant}${seed.domain ? ` · ${seed.domain}` : ""} — proof-of-concept, not production data.`;

// --- Python: Streamlit ------------------------------------------------------

function streamlitFiles(seed: UseCaseSeed): ScaffoldFile[] {
  const app = `"""${seed.id} · ${seed.title} — Streamlit PoC.

Run: streamlit run app.py   (from the poc/ directory)
Reads its own data/sample.csv, so it runs offline. Not production data.
"""
import pandas as pd
import plotly.express as px
import streamlit as st

st.set_page_config(page_title="${seed.id} · ${seed.title}", layout="wide")
st.title("${seed.title}")
st.caption("${runNote(seed)}")

df = pd.read_csv("data/sample.csv", parse_dates=["period"])
trend = df.groupby("period")["value"].sum().sort_index()

c1, c2, c3 = st.columns(3)
c1.metric("Current", f"{trend.iloc[-1]:.0f}")
c2.metric("vs. start", f"{trend.iloc[-1] - trend.iloc[0]:+.0f}")
c3.metric("Coverage", "78% of cases")

left, right = st.columns(2)
with left:
    st.subheader("Trend")
    st.plotly_chart(px.line(trend.reset_index(), x="period", y="value"), use_container_width=True)
with right:
    st.subheader("By line")
    by_cat = df.groupby("category", as_index=False)["value"].sum()
    st.plotly_chart(px.bar(by_cat, x="category", y="value"), use_container_width=True)

with st.expander("What this PoC proves"):
    st.write(
        "The headline metric is computable from existing data, and a supervisor can "
        "read the current state in seconds. Success and kill criteria live in poc/spec.md."
    )
`;
  return [
    { path: "poc/app.py", content: app },
    { path: "poc/requirements.txt", content: "streamlit>=1.36\npandas>=2.2\nplotly>=5.22\n" },
    { path: "poc/data/sample.csv", content: sampleCsv(seed) },
    { path: "poc/.streamlit/config.toml", content: `[theme]\nbase = "light"\nprimaryColor = "#3577c9"\n` },
    { path: "poc/.gitignore", content: PY_GITIGNORE },
    {
      path: "poc/README.md",
      content: `# ${seed.id} · Streamlit PoC\n\n${runNote(seed)}\n\n\`\`\`bash\ncd poc\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\nstreamlit run app.py\n\`\`\`\n\nData is \`data/sample.csv\` (illustrative). Swap it for a real extract to validate.\n`,
    },
  ];
}

// --- Python: Dash -----------------------------------------------------------

function dashFiles(seed: UseCaseSeed): ScaffoldFile[] {
  const app = `"""${seed.id} · ${seed.title} — Plotly Dash PoC.

Run: python app.py   (from the poc/ directory), then open http://127.0.0.1:8050
Reads its own data/sample.csv, so it runs offline. Not production data.
"""
import pandas as pd
import plotly.express as px
from dash import Dash, dcc, html

df = pd.read_csv("data/sample.csv", parse_dates=["period"])
trend = df.groupby("period", as_index=False)["value"].sum()
by_cat = df.groupby("category", as_index=False)["value"].sum()

app = Dash(__name__)
app.title = "${seed.id} · ${seed.title}"
app.layout = html.Div(
    className="wrap",
    children=[
        html.H1("${seed.title}"),
        html.P("${runNote(seed)}", className="sub"),
        html.Div(
            className="charts",
            children=[
                dcc.Graph(figure=px.line(trend, x="period", y="value", title="Trend")),
                dcc.Graph(figure=px.bar(by_cat, x="category", y="value", title="By line")),
            ],
        ),
    ],
)

if __name__ == "__main__":
    app.run(debug=True)
`;
  return [
    { path: "poc/app.py", content: app },
    { path: "poc/requirements.txt", content: "dash>=2.17\npandas>=2.2\nplotly>=5.22\n" },
    { path: "poc/data/sample.csv", content: sampleCsv(seed) },
    { path: "poc/assets/style.css", content: `.wrap{max-width:960px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif}\n.sub{color:#6b7280}\n.charts{display:grid;grid-template-columns:1fr 1fr;gap:16px}\n@media(max-width:720px){.charts{grid-template-columns:1fr}}\n` },
    { path: "poc/.gitignore", content: PY_GITIGNORE },
    {
      path: "poc/README.md",
      content: `# ${seed.id} · Dash PoC\n\n${runNote(seed)}\n\n\`\`\`bash\ncd poc\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\npython app.py   # http://127.0.0.1:8050\n\`\`\`\n`,
    },
  ];
}

// --- Python: FastAPI service ------------------------------------------------

function fastapiFiles(seed: UseCaseSeed): ScaffoldFile[] {
  const main = `"""${seed.id} · ${seed.title} — FastAPI PoC service.

Run: uvicorn main:app --reload   (from the poc/ directory)
Serves the metric computed from data/sample.csv. Offline; not production data.
"""
from pathlib import Path

import pandas as pd
from fastapi import FastAPI

app = FastAPI(title="${seed.id} · ${seed.title}")
DATA = Path(__file__).parent / "data" / "sample.csv"


def _frame() -> pd.DataFrame:
    return pd.read_csv(DATA, parse_dates=["period"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "case": "${seed.id}"}


@app.get("/metric")
def metric() -> dict:
    df = _frame()
    return {
        "current": float(df["value"].sum()),
        "by_category": df.groupby("category")["value"].sum().round().to_dict(),
    }
`;
  const test = `from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_metric_has_categories():
    body = client.get("/metric").json()
    assert body["current"] > 0
    assert body["by_category"]
`;
  return [
    { path: "poc/main.py", content: main },
    { path: "poc/tests/test_main.py", content: test },
    { path: "poc/requirements.txt", content: "fastapi>=0.111\nuvicorn[standard]>=0.30\npandas>=2.2\nhttpx>=0.27\npytest>=8.2\n" },
    { path: "poc/data/sample.csv", content: sampleCsv(seed) },
    { path: "poc/.gitignore", content: PY_GITIGNORE },
    {
      path: "poc/Dockerfile",
      content: `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]\n`,
    },
    {
      path: "poc/README.md",
      content: `# ${seed.id} · FastAPI PoC\n\n${runNote(seed)}\n\n\`\`\`bash\ncd poc\npip install -r requirements.txt\nuvicorn main:app --reload   # http://127.0.0.1:8000/metric\npytest                      # smoke tests\n\`\`\`\n`,
    },
  ];
}

// --- Mockup: requirements-driven HTML --------------------------------------

function htmlMockupFiles(seed: UseCaseSeed, ctx?: TemplateContext): string {
  const features = featureLines(seed, ctx);
  const cards = features
    .map(
      (f, i) => `      <label class="feat"><input type="checkbox" ${i < 2 ? "checked" : ""}/> <span>${esc(f)}</span></label>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(seed.id)} · ${esc(seed.title)} — mockup</title>
<style>
  :root{--bg:#f7f7f8;--card:#fff;--fg:#18181b;--mut:#6b7280;--acc:#3577c9;--bd:#e4e4e7}
  *{box-sizing:border-box} body{margin:0;font:15px/1.55 system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
  .wrap{max-width:840px;margin:0 auto;padding:28px}
  header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
  h1{font-size:20px;margin:0} .tag{font-size:11px;border:1px solid var(--bd);border-radius:6px;padding:1px 7px;color:var(--mut)}
  .sub{color:var(--mut);font-size:13px;margin:4px 0 20px}
  .panel{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-bottom:16px}
  .panel h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);margin:0 0 12px}
  .feat{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--bd)}
  .feat:first-of-type{border-top:0}
  .row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .stat{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px}
  .stat b{font-size:24px} .lbl{font-size:11px;text-transform:uppercase;color:var(--mut);letter-spacing:.03em}
  button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer}
  @media(max-width:640px){.row{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
  <header>
    <h1>${esc(seed.title)}</h1>
    <span class="tag">${esc(seed.plant)}</span>
    <span class="tag">${esc(seed.domain ?? "process")}</span>
    <span class="tag">clickable mockup</span>
  </header>
  <div class="sub">${esc(runNote(seed))}</div>

  <div class="row">
    <div class="stat"><div class="lbl">Current</div><b>72%</b></div>
    <div class="stat"><div class="lbl">Target</div><b>85%</b></div>
    <div class="stat"><div class="lbl">Coverage</div><b>78%</b></div>
  </div>

  <div class="panel">
    <h2>What it does — from the requirements</h2>
${cards}
  </div>

  <div class="panel">
    <h2>Next</h2>
    <p style="margin:.2em 0 1em;color:var(--mut)">This is a static mockup for the gate review. Wire it to a real extract to prove the signal.</p>
    <button onclick="alert('Mockup only — no backend wired yet.')">Open the cockpit</button>
  </div>
</div></body></html>`;
}

// --- Dashboard: Grafana model ----------------------------------------------

function grafanaDashboard(seed: UseCaseSeed): string {
  const model = {
    title: `${seed.id} · ${seed.title}`,
    tags: ["poc", seed.plant, seed.domain ?? "process"],
    timezone: "browser",
    schemaVersion: 39,
    version: 1,
    refresh: "1m",
    time: { from: "now-6M", to: "now" },
    templating: {
      list: [
        { name: "line", type: "custom", query: CATEGORIES.join(","), current: { text: "All", value: "$__all" }, includeAll: true },
      ],
    },
    panels: [
      { id: 1, type: "stat", title: "Current metric", gridPos: { h: 6, w: 6, x: 0, y: 0 }, targets: [{ refId: "A" }] },
      { id: 2, type: "timeseries", title: "Trend", gridPos: { h: 9, w: 12, x: 6, y: 0 }, targets: [{ refId: "A" }] },
      { id: 3, type: "barchart", title: "By line", gridPos: { h: 9, w: 6, x: 0, y: 6 }, targets: [{ refId: "A" }] },
    ],
  };
  return JSON.stringify(model, null, 2) + "\n";
}

function grafanaFiles(seed: UseCaseSeed): ScaffoldFile[] {
  return [
    { path: "poc/dashboard.json", content: grafanaDashboard(seed) },
    {
      path: "poc/provisioning/dashboards.yaml",
      content: `apiVersion: 1\nproviders:\n  - name: '${seed.id}'\n    folder: 'PoC'\n    type: file\n    options:\n      path: /var/lib/grafana/dashboards\n`,
    },
    {
      path: "poc/README.md",
      content: `# ${seed.id} · Grafana dashboard PoC\n\n${runNote(seed)}\n\nImport \`dashboard.json\` (Grafana → Dashboards → Import), or provision it with\n\`provisioning/dashboards.yaml\`. Point the panels at your datasource, then set the\nqueries for the current metric, its trend, and the by-line breakdown.\n`,
    },
  ];
}

// --- Report: Jupyter analysis ----------------------------------------------

function jupyterNotebook(seed: UseCaseSeed): string {
  const md = (text: string) => ({ cell_type: "markdown", metadata: {}, source: [text] });
  const code = (src: string[]) => ({ cell_type: "code", execution_count: null, metadata: {}, outputs: [], source: src });
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" } },
    cells: [
      md(`# ${seed.id} · ${seed.title}\n\n${runNote(seed)}`),
      code(["import pandas as pd\n", "df = pd.read_csv('data/sample.csv', parse_dates=['period'])\n", "df.head()"]),
      md("## Trend"),
      code(["df.groupby('period')['value'].sum().plot(title='Trend')"]),
      md("## By line"),
      code(["df.groupby('category')['value'].sum().plot.bar(title='By line')"]),
      md("## Finding\n\n_State whether the signal is computable and worth a pilot. Success/kill criteria are in `poc/spec.md`._"),
    ],
  };
  return JSON.stringify(nb, null, 1) + "\n";
}

function jupyterFiles(seed: UseCaseSeed): ScaffoldFile[] {
  return [
    { path: "poc/analysis.ipynb", content: jupyterNotebook(seed) },
    { path: "poc/requirements.txt", content: "pandas>=2.2\nmatplotlib>=3.9\nnotebook>=7.2\n" },
    { path: "poc/data/sample.csv", content: sampleCsv(seed) },
    { path: "poc/.gitignore", content: PY_GITIGNORE },
    {
      path: "poc/README.md",
      content: `# ${seed.id} · Analysis notebook PoC\n\n${runNote(seed)}\n\n\`\`\`bash\ncd poc\npip install -r requirements.txt\njupyter notebook analysis.ipynb\n\`\`\`\n`,
    },
  ];
}

// --- the registry -----------------------------------------------------------

export const POC_STACKS: readonly PocStack[] = [
  {
    id: "python-streamlit",
    templateRepo: "du-template-streamlit",
    label: "Streamlit app (Python)",
    category: "app",
    language: "python",
    description: "A data app in pure Python — KPIs, trend, and a breakdown from a CSV extract.",
    run: "streamlit run app.py",
    files: (seed) => streamlitFiles(seed),
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
  {
    id: "python-dash",
    templateRepo: "du-template-dash",
    label: "Dash app (Python)",
    category: "app",
    language: "python",
    description: "A Plotly Dash app when you want callback-driven interactivity in Python.",
    run: "python app.py",
    files: (seed) => dashFiles(seed),
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
  {
    id: "fastapi-service",
    templateRepo: "du-template-fastapi",
    label: "FastAPI service (Python)",
    category: "app",
    language: "python",
    description: "A small HTTP API exposing the computed metric — when the PoC is a service, not a screen.",
    run: "uvicorn main:app --reload",
    files: (seed) => fastapiFiles(seed),
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
  {
    id: "html-mockup",
    templateRepo: "du-template-html-mockup",
    label: "HTML mockup (from requirements)",
    category: "mockup",
    language: "html",
    description: "A self-contained clickable mockup whose features are read from the demand's requirements.",
    run: "open index.html",
    files: (seed, ctx) => [
      { path: "poc/index.html", content: htmlMockupFiles(seed, ctx) },
      {
        path: "poc/README.md",
        content: `# ${seed.id} · HTML mockup\n\n${runNote(seed)}\n\nOpen \`index.html\` in a browser — it is self-contained (no build, no network). The\nfeature list is drawn from the demand's requirements.\n`,
      },
    ],
    previewHtml: (seed, ctx) => htmlMockupFiles(seed, ctx),
  },
  {
    id: "html-dashboard",
    templateRepo: "du-template-html-dashboard",
    label: "Self-contained HTML dashboard",
    category: "dashboard",
    language: "html",
    description: "One HTML file — inline CSS/SVG charts, renders anywhere, offline. The fastest evidence.",
    run: "open index.html",
    files: (seed) => [
      { path: "poc/index.html", content: generateDashboardMockup(seed) },
      {
        path: "poc/README.md",
        content: `# ${seed.id} · HTML dashboard\n\n${runNote(seed)}\n\nOpen \`index.html\` — self-contained, no build or network. Figures are illustrative.\n`,
      },
    ],
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
  {
    id: "grafana-dashboard",
    templateRepo: "du-template-grafana",
    label: "Grafana dashboard (JSON)",
    category: "dashboard",
    language: "json",
    description: "An importable Grafana model when the PoC lands on the plant's existing observability stack.",
    run: "import dashboard.json",
    files: (seed) => grafanaFiles(seed),
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
  {
    id: "jupyter-report",
    templateRepo: "du-template-jupyter",
    label: "Jupyter analysis (Python)",
    category: "report",
    language: "python",
    description: "A notebook that reads the extract, plots the signal, and states the finding for the gate.",
    run: "jupyter notebook analysis.ipynb",
    files: (seed) => jupyterFiles(seed),
    previewHtml: (seed) => generateDashboardMockup(seed),
  },
];

const BY_ID = new Map(POC_STACKS.map((s) => [s.id, s]));

export function pocStack(id: string | undefined): PocStack | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The default stack for a bare category — keeps the old kind-only API working. */
export function defaultStackFor(category: ArtifactKind): PocStack {
  return POC_STACKS.find((s) => s.category === category) ?? POC_STACKS[0]!;
}

export function stacksForCategory(category: ArtifactKind): PocStack[] {
  return POC_STACKS.filter((s) => s.category === category);
}
