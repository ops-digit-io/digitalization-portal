import { describe, it, expect } from "vitest";
import { POC_STACKS, pocStack, stacksForCategory, extractRequirementLines } from "./templates.js";
import { POC_STACK_META } from "./stacks-meta.js";
import type { UseCaseSeed } from "./scaffold.js";

const seed: UseCaseSeed = {
  id: "UC-2026-0041",
  title: "Scrap attribution at shift granularity",
  slug: "scrap-attribution",
  plant: "DE-ALD",
  lane: "transform",
  domain: "quality",
  createdOn: "2026-05-19",
};

describe("every stack produces a runnable, self-contained file set under poc/", () => {
  for (const stack of POC_STACKS) {
    it(`${stack.id}: files live under poc/ and carry a README`, () => {
      const files = stack.files(seed);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.path.startsWith("poc/"))).toBe(true);
      expect(files.some((f) => /readme/i.test(f.path))).toBe(true);
      // No file is empty, and none reaches out to a CDN.
      for (const f of files) {
        expect(f.content.length, `${stack.id} · ${f.path} is empty`).toBeGreaterThan(0);
        expect(f.content).not.toMatch(/https?:\/\/[^"'\s]*\.(js|css)\b/);
      }
    });
  }
});

describe("stacks carry the tech they claim", () => {
  it("streamlit imports streamlit and pins it in requirements", () => {
    const files = pocStack("python-streamlit")!.files(seed);
    expect(files.find((f) => f.path === "poc/app.py")!.content).toMatch(/import streamlit/);
    expect(files.find((f) => f.path === "poc/requirements.txt")!.content).toMatch(/streamlit/);
  });

  it("dash imports dash", () => {
    expect(pocStack("python-dash")!.files(seed).find((f) => f.path === "poc/app.py")!.content).toMatch(/from dash import/);
  });

  it("fastapi ships an app, a Dockerfile and a smoke test", () => {
    const paths = pocStack("fastapi-service")!.files(seed).map((f) => f.path);
    expect(paths).toContain("poc/main.py");
    expect(paths).toContain("poc/Dockerfile");
    expect(paths).toContain("poc/tests/test_main.py");
  });

  it("grafana dashboard.json is valid JSON with panels", () => {
    const json = pocStack("grafana-dashboard")!.files(seed).find((f) => f.path === "poc/dashboard.json")!.content;
    const model = JSON.parse(json);
    expect(Array.isArray(model.panels)).toBe(true);
    expect(model.panels.length).toBeGreaterThan(0);
  });

  it("jupyter analysis.ipynb is a valid notebook with cells", () => {
    const nb = JSON.parse(pocStack("jupyter-report")!.files(seed).find((f) => f.path === "poc/analysis.ipynb")!.content);
    expect(nb.nbformat).toBe(4);
    expect(nb.cells.some((c: { cell_type: string }) => c.cell_type === "code")).toBe(true);
  });
});

describe("the requirements-driven HTML mockup", () => {
  it("renders the demand's requirement lines when given them", () => {
    const reqs = ["As a supervisor I see scrap by shift", "Filter by line and cause code"];
    const html = pocStack("html-mockup")!.files(seed, { requirements: reqs }).find((f) => f.path === "poc/index.html")!.content;
    expect(html).toContain("scrap by shift");
    expect(html).toContain("Filter by line and cause code");
    expect(html).toMatch(/<!doctype html>/i);
  });

  it("falls back to sensible defaults with no requirements", () => {
    const html = pocStack("html-mockup")!.files(seed).find((f) => f.path === "poc/index.html")!.content;
    expect(html).toContain(seed.title.toLowerCase());
  });
});

describe("extractRequirementLines", () => {
  it("pulls user-story headings and bullets, skipping section labels", () => {
    const md = "## Stories\n\n#### As a lead I attribute scrap\n\n- Filter by cause code\n- **Epic:** ignore this\n";
    const lines = extractRequirementLines(md);
    expect(lines).toContain("As a lead I attribute scrap");
    expect(lines).toContain("Filter by cause code");
    expect(lines.some((l) => /^epic/i.test(l))).toBe(false);
  });

  it("is empty for missing input", () => {
    expect(extractRequirementLines(undefined)).toEqual([]);
  });
});

describe("the light picker metadata stays in step with the registry", () => {
  it("has exactly the same ids, labels, and categories, in the same order", () => {
    expect(POC_STACK_META.map((m) => m.id)).toEqual(POC_STACKS.map((s) => s.id));
    for (const m of POC_STACK_META) {
      const s = pocStack(m.id)!;
      expect(`${m.id}:${m.label}:${m.category}:${m.language}:${m.run}`).toBe(`${s.id}:${s.label}:${s.category}:${s.language}:${s.run}`);
    }
  });

  it("stacksForCategory groups correctly", () => {
    expect(stacksForCategory("app").map((s) => s.id)).toContain("python-streamlit");
    expect(stacksForCategory("dashboard").length).toBeGreaterThanOrEqual(2);
  });
});
