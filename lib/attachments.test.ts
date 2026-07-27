import { describe, it, expect } from "vitest";
import { addAttachment, removeAttachment, listAttachments, isValidUrl } from "./attachments.js";
import { buildDemand, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase } from "./parse.js";

const demand = () =>
  buildDemand(
    { id: "UC-2026-0110", createdOn: "2026-06-01", lane: "transform" },
    { ...EMPTY_ANSWERS, title: "T", plant: "DE-ALD", problem: "x", currentPain: "y", desiredOutcome: "z" },
  );

describe("isValidUrl", () => {
  it("accepts http(s) links and rejects the rest", () => {
    expect(isValidUrl("https://blob.example.com/f.pdf")).toBe(true);
    expect(isValidUrl("http://x.io/a.xlsx")).toBe(true);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("/local/path")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("addAttachment / listAttachments", () => {
  it("creates the ## Attachments section before ## History on first add", () => {
    const res = addAttachment(demand(), { label: "Plan.xlsx", url: "https://blob.example.com/plan.xlsx" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown.indexOf("## Attachments")).toBeLessThan(res.markdown.indexOf("## History"));
    expect(listAttachments(res.markdown)).toEqual([{ label: "Plan.xlsx", url: "https://blob.example.com/plan.xlsx" }]);
  });

  it("appends further attachments and keeps ordering", () => {
    let md = demand();
    md = (addAttachment(md, { label: "A.pdf", url: "https://x.io/a.pdf" }) as { markdown: string }).markdown;
    md = (addAttachment(md, { label: "B.ppt", url: "https://x.io/b.ppt" }) as { markdown: string }).markdown;
    expect(listAttachments(md).map((a) => a.label)).toEqual(["A.pdf", "B.ppt"]);
  });

  it("is idempotent by URL", () => {
    let md = demand();
    md = (addAttachment(md, { label: "A", url: "https://x.io/a.pdf" }) as { markdown: string }).markdown;
    const again = addAttachment(md, { label: "A renamed", url: "https://x.io/a.pdf" });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(listAttachments(again.markdown)).toHaveLength(1);
  });

  it("rejects a non-http(s) url", () => {
    const res = addAttachment(demand(), { label: "x", url: "ftp://x.io/a" });
    expect(res.ok).toBe(false);
  });

  it("does not disturb the State or Gates sections", () => {
    const res = addAttachment(demand(), { label: "A", url: "https://x.io/a.pdf" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = parseUseCase(res.markdown);
    expect(p.state.stage).toBe("S1");
    expect(p.gates.find((g) => g.id === "G1")?.status).toBe("open");
  });
});

describe("removeAttachment", () => {
  it("removes a link by URL", () => {
    let md = demand();
    md = (addAttachment(md, { label: "A", url: "https://x.io/a.pdf" }) as { markdown: string }).markdown;
    md = (addAttachment(md, { label: "B", url: "https://x.io/b.pdf" }) as { markdown: string }).markdown;
    const res = removeAttachment(md, "https://x.io/a.pdf");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(listAttachments(res.markdown).map((a) => a.url)).toEqual(["https://x.io/b.pdf"]);
  });

  it("renders _None._ when the last attachment is removed", () => {
    let md = demand();
    md = (addAttachment(md, { label: "A", url: "https://x.io/a.pdf" }) as { markdown: string }).markdown;
    const res = removeAttachment(md, "https://x.io/a.pdf");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(listAttachments(res.markdown)).toEqual([]);
    expect(res.markdown).toContain("_None._");
  });
});
