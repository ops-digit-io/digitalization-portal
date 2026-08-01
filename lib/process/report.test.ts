/**
 * The engagement report.
 *
 * The contract worth pinning is agreement: the report's headline verdict is the
 * score model's, the same one the cockpit and the landscape tiles show. A report
 * that says "green" over a screen that says "red" is the failure this replaced.
 *
 * Runs against the store's local mode, like store.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { demote } from "./report";

let dir: string;
let prevData: string | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pf-report-"));
  prevData = process.env.PROCESS_DATA_DIR;
  process.env.PROCESS_DATA_DIR = dir;
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_ORG;
});
afterEach(() => {
  if (prevData === undefined) delete process.env.PROCESS_DATA_DIR;
  else process.env.PROCESS_DATA_DIR = prevData;
  rmSync(dir, { recursive: true, force: true });
});

const NOW = "2026-08-01T00:00:00.000Z";

async function mods() {
  return {
    store: await import("./store"),
    report: await import("./report"),
    summary: await import("./summary"),
  };
}

describe("demote", () => {
  it("pushes headings down so an embedded document nests under the report's", () => {
    expect(demote("# Title\n## Section\ntext", 3)).toBe("#### Title\n##### Section\ntext");
  });

  it("stops at six — deeper is not a heading in any renderer", () => {
    expect(demote("##### Deep", 3)).toBe("###### Deep");
  });

  it("leaves a hash inside a fence alone — that is a comment, not a heading", () => {
    const md = "# Real\n\n```bash\n# not a heading\n```\n\n## Also real";
    expect(demote(md, 3)).toBe("#### Real\n\n```bash\n# not a heading\n```\n\n##### Also real");
  });

  it("ignores a hash that is not a heading marker", () => {
    expect(demote("#hashtag and a #2 pencil", 3)).toBe("#hashtag and a #2 pencil");
  });
});

describe("report", () => {
  it("leads with the score model's light — the same verdict the cockpit shows", async () => {
    const { store, report, summary } = await mods();
    await store.create({ title: "Order intake", owner: "J. Gabriel", unit: "Ops", anflug: "process" }, NOW);
    // A failed profile gate fails the spoke knock-out, which dominates the colour.
    await store.setGate("order-intake", "profile", false, "no named owner", NOW);

    const md = await report.renderReport("order-intake", "en");
    const m = (await store.meta("order-intake"))!;
    const s = summary.summarize(m);

    expect(s.light).toBe("red");
    expect(md).toContain("**Traffic light:** Red");
    expect(md).toContain(s.reason);
  });

  it("renders a filled section verbatim, demoted, with its gate verdict and score", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Order intake", owner: "J. Gabriel", unit: "Ops", anflug: "process" }, NOW);
    await store.writeSection("order-intake", "profile", "# Process profile\n\n## Identity\nOwner: J. Gabriel", NOW, 61);
    await store.setGate("order-intake", "profile", true, "", NOW);

    const md = await report.renderReport("order-intake", "en");
    expect(md).toContain("### 1. Process Profile");
    expect(md).toContain("#### Process profile");      // demoted, not competing with the report title
    expect(md).not.toMatch(/^# Process profile$/m);
    expect(md).toContain("Owner: J. Gabriel");          // verbatim
    expect(md).toContain("Score 61/100");
  });

  it("names the sections that are empty rather than dropping them silently", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeSection("order-intake", "profile", "# Process profile\n\ntext", NOW, 61);

    const md = await report.renderReport("order-intake", "en");
    expect(md).toContain("not filled in:");
    expect(md).toContain("14. Business Case");
  });

  it("says so plainly when nothing has been filled in at all", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Empty", owner: "", unit: "", anflug: "process" }, NOW);
    const md = await report.renderReport("empty", "en");
    expect(md).toContain("Nothing has been filled in yet.");
    expect(md).toContain("**Traffic light:** Not assessed");
  });

  it("omits the D1–D8 catalogue until something is actually rated", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);

    // Unrated, every criterion stands at level 1 by convention — a table of ones
    // reads as a verdict nobody reached.
    expect(await report.renderReport("order-intake", "en")).not.toContain("## Catalogue");

    await store.rate("order-intake", "K1.1", { level: 3, confidence: "P", evidence: "flow chart 2024" }, NOW);
    const md = await report.renderReport("order-intake", "en");
    expect(md).toContain("## Catalogue");
    expect(md).toContain("does not drive the traffic light above");
    expect(md).toContain("flow chart 2024");
  });

  it("renders in German end to end, engine sentences included", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Auftragserfassung", owner: "J. Gabriel", unit: "Ops", anflug: "process" }, NOW);
    await store.setGate("auftragserfassung", "profile", false, "kein benannter Owner", NOW);

    const md = await report.renderReport("auftragserfassung", "de");
    expect(md).toContain("# Prozessdiagnose");
    expect(md).toContain("**Ampel:** Rot");
    expect(md).toContain("Verantwortlicher Spoke");
    expect(md).toContain("Sichtbarkeit");                 // score dimension, German
    expect(md).toContain("Prozessprofil");                // section label, German
    expect(md).not.toContain("Knock-out failed");         // no English engine prose
    expect(md).not.toContain("not assessed");
  });

  it("marks the digest as derived and keeps the friction counts", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeDigest("order-intake", {
      processStatement: "Order intake runs on mail and a spreadsheet.",
      processScore: { value: 42, basis: "no timestamps anywhere" },
      friction: { actual: [{ where: "hand-off" }, { where: "ERP entry" }], potential: [], prunable: [] },
      gaps: ["nobody could name the consumer of the daily report"],
    }, NOW);

    const md = await report.renderReport("order-intake", "en");
    // The marker is the whole point: a derived number must not read as a finding.
    expect(md).toContain("Derived from the anamnesis — not a finding.");
    expect(md).toContain("**42**");
    expect(md).toContain("Actual 2");
    expect(md).toContain("nobody could name the consumer");
  });

  it("tables the advisory verdicts, reasons included", async () => {
    const { store, report } = await mods();
    await store.create({ title: "Order intake", owner: "", unit: "", anflug: "process" }, NOW);
    await store.writeDecisions("order-intake", [
      { advisoryKey: "improvements", proposalId: "P1", title: "Auto-ack", verdict: "rejected",
        reason: "the ack is not what customers wait for", at: NOW, supersedes: null },
    ], NOW);

    const md = await report.renderReport("order-intake", "en");
    expect(md).toContain("| improvements | P1 | Reject |");
    // A rejection is only worth recording because of its reason.
    expect(md).toContain("the ack is not what customers wait for");
  });

  it("404s on an engagement that does not exist", async () => {
    const { report } = await mods();
    await expect(report.renderReport("nope", "en")).rejects.toMatchObject({ status: 404 });
  });
});
