/**
 * Lightweight PoC-stack metadata for the client picker.
 *
 * The full registry (`lib/poc/templates.ts`) carries every file generator — server
 * code that must not ship to the browser just so a picker can render a label. This
 * module is the small, serialisable half: id, label, category, language, one-line
 * description, run command. `templates.test.ts` asserts the two lists stay in step,
 * so this can never silently drift from the real stacks.
 */

import type { ArtifactKind } from "./spec.js";

export interface StackMeta {
  id: string;
  label: string;
  category: ArtifactKind;
  language: "python" | "html" | "json" | "sql";
  description: string;
  run: string;
}

/** How the picker groups the stacks — the PoC categories that exist. */
export const STACK_CATEGORIES: { category: ArtifactKind; label: string }[] = [
  { category: "app", label: "Web apps" },
  { category: "mockup", label: "Mockups" },
  { category: "dashboard", label: "Dashboards" },
  { category: "report", label: "Analysis & data" },
];

export const POC_STACK_META: readonly StackMeta[] = [
  {
    id: "python-streamlit",
    label: "Streamlit app (Python)",
    category: "app",
    language: "python",
    description: "A data app in pure Python — KPIs, trend, and a breakdown from a CSV extract.",
    run: "streamlit run app.py",
  },
  {
    id: "python-dash",
    label: "Dash app (Python)",
    category: "app",
    language: "python",
    description: "A Plotly Dash app when you want callback-driven interactivity in Python.",
    run: "python app.py",
  },
  {
    id: "fastapi-service",
    label: "FastAPI service (Python)",
    category: "app",
    language: "python",
    description: "A small HTTP API exposing the computed metric — when the PoC is a service, not a screen.",
    run: "uvicorn main:app --reload",
  },
  {
    id: "html-mockup",
    label: "HTML mockup (from requirements)",
    category: "mockup",
    language: "html",
    description: "A self-contained clickable mockup whose features are read from the demand's requirements.",
    run: "open index.html",
  },
  {
    id: "html-dashboard",
    label: "Self-contained HTML dashboard",
    category: "dashboard",
    language: "html",
    description: "One HTML file — inline CSS/SVG charts, renders anywhere, offline. The fastest evidence.",
    run: "open index.html",
  },
  {
    id: "grafana-dashboard",
    label: "Grafana dashboard (JSON)",
    category: "dashboard",
    language: "json",
    description: "An importable Grafana model when the PoC lands on the plant's existing observability stack.",
    run: "import dashboard.json",
  },
  {
    id: "jupyter-report",
    label: "Jupyter analysis (Python)",
    category: "report",
    language: "python",
    description: "A notebook that reads the extract, plots the signal, and states the finding for the gate.",
    run: "jupyter notebook analysis.ipynb",
  },
];
