import { describe, it, expect } from "vitest";
import { normalizeCustom, customToStack } from "./custom-templates.js";
import { templateRepoFiles, TEMPLATE_SEED } from "./template-provision.js";
import { templateStatuses } from "./template-status.js";
import { pocStack } from "./templates.js";
import type { GitHost } from "../git/host.js";

describe("custom templates", () => {
  it("normalises a registration with sane defaults", () => {
    const c = normalizeCustom({ label: "Next.js Prototype", category: "app" });
    expect(c.id).toBe("next-js-prototype");
    expect(c.templateRepo).toBe("du-template-next-js-prototype");
    expect(c.category).toBe("app");
  });

  it("defaults an unknown category to app and rejects a non-https upstream", () => {
    expect(normalizeCustom({ label: "x", category: "nope" as never }).category).toBe("app");
    expect(() => normalizeCustom({ label: "x", upstream: { name: "y", url: "ftp://z" } })).toThrow();
  });

  it("requires a name", () => {
    expect(() => normalizeCustom({})).toThrow();
  });

  it("customToStack yields a PocStack that contributes no files (repo provides them)", () => {
    const s = customToStack(normalizeCustom({ label: "Grafana Cloud", category: "dashboard", templateRepo: "du-template-gc" }));
    expect(s.files(TEMPLATE_SEED)).toEqual([]);
    expect(s.templateRepo).toBe("du-template-gc");
    expect(s.previewHtml(TEMPLATE_SEED)).toMatch(/<!doctype html>/i);
  });
});

describe("template provisioning", () => {
  it("templateRepoFiles is the README plus the stack's files, with neutral placeholders", () => {
    const stack = pocStack("python-streamlit")!;
    const files = templateRepoFiles(stack);
    expect(files[0]!.path).toBe("README.md");
    expect(files[0]!.content).toContain(stack.templateRepo);
    expect(files.some((f) => f.path === "poc/streamlit_app.py")).toBe(true);
    // Not a real case — the portal overlays that on generate.
    expect(files.find((f) => f.path === "poc/streamlit_app.py")!.content).toContain("UC-XXXX-XXXX");
  });
});

describe("template status", () => {
  const stub = (meta: Record<string, { exists: boolean; isTemplate: boolean }>): GitHost =>
    ({
      kind: "github",
      async getRepoMeta(name: string) {
        return meta[name] ?? { exists: false, isTemplate: false };
      },
      async listDir() {
        return [{ name: "streamlit_app.py", type: "file" as const, path: "poc/streamlit_app.py" }];
      },
    }) as unknown as GitHost;

  it("classifies ready / not-template / missing", async () => {
    const host = stub({
      "du-template-streamlit": { exists: true, isTemplate: true },
      "du-template-dash": { exists: true, isTemplate: false },
      // fastapi absent → missing
    });
    const stacks = ["python-streamlit", "python-dash", "fastapi-service"].map((id) => ({ stack: pocStack(id)!, custom: false }));
    const st = await templateStatuses(host, stacks, "ops-digit-io");
    expect(st.find((s) => s.id === "python-streamlit")!.state).toBe("ready");
    expect(st.find((s) => s.id === "python-streamlit")!.populated).toBe(true);
    expect(st.find((s) => s.id === "python-dash")!.state).toBe("not-template");
    expect(st.find((s) => s.id === "fastapi-service")!.state).toBe("missing");
  });

  it("reports unknown when the host cannot look up repos (no App)", async () => {
    const host = { kind: "local", async listDir() { return []; } } as unknown as GitHost;
    const st = await templateStatuses(host, [{ stack: pocStack("python-streamlit")!, custom: false }], "org");
    expect(st[0]!.state).toBe("unknown");
  });
});
