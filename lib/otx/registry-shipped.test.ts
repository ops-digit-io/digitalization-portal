/**
 * The registry masters that ship with the app.
 *
 * They ship EMPTY — every one of them is a column contract and a vocabulary, with
 * no rows. A register seeded with plausible plants, systems, technologies or
 * applications reads as fact within a week, and every finding the portal then
 * produces is a finding about fiction. So this file guards two things:
 *
 *   1. the files stay empty, so nothing invented is ever inherited;
 *   2. the CONTRACT holds — each header carries exactly the columns its parser
 *      reads, because a renamed column silently empties a field rather than
 *      failing, and referential and invariant checks across the masters still
 *      pass. Those checks are vacuous today and become real the moment a
 *      deployment fills a file in, which is exactly when they are needed.
 *
 * The behaviour of the engines is tested against fixtures in their own files
 * (`landscape.test.ts`, `rollout.test.ts`, `toolscape.test.ts`,
 * `consolidate.test.ts`) — not against shipped data.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { readRegistry, type RegistryFile } from "./source.js";
import { parseLandscape, parsePlants, parseUns } from "./landscape.js";
import { parseTechnology, parseRollout, unadoptedWaves } from "./rollout.js";
import { parseAiPortfolio, evaluate, refusals } from "./ai-portfolio.js";
import { parseTools, TOOL_COLUMNS } from "./toolscape.js";
import { consolidate, registerGaps, declaredTools } from "./consolidate.js";
import { listDemandDocs } from "../demands-store.js";

/** The columns each master's parser reads. Renaming one silently empties a field. */
const COLUMNS: Record<Exclude<RegistryFile, "tools">, string[]> = {
  landscape: ["Plant", "ISA-95", "System", "Vendor", "Role", "Integration", "Interface", "UNS topic root", "Data owner", "Freshness", "Barrier"],
  plants: ["Code", "Name", "Country", "Region", "Site role", "Ops IT owner", "Notes"],
  uns: ["Level", "Segment", "Example topic", "Owner", "Standard ref", "Status"],
  technology: ["ID", "Technology", "Layer", "Status", "Trialled at", "Evidence", "Decision", "Decided on", "Decided by", "Supersedes"],
  rollout: ["Wave", "Capability", "Technology", "Plant", "State", "Gate", "Owner", "Start", "Live", "Blocker"],
  "ai-portfolio": ["ID", "Use case", "Plant", "Domain", "Model class", "Stage", "Authority", "Control surface", "Envelope", "Fallback", "Abort condition", "Human owner", "Demand"],
  handovers: ["ID", "Title", "Plant", "Domain", "Service", "Region", "Team owner", "Severity / SLA", "Requester", "Decided", "By", "External ref", "Status"],
};

/** The header row of a master's one table, as a list of column names. */
function header(md: string | undefined): string[] {
  const line = (md ?? "").split("\n").find((l) => l.trim().startsWith("|") && !/^\|[-:| ]+\|$/.test(l.trim())) ?? "";
  return line.split("|").map((c) => c.trim()).filter((c) => c !== "");
}

/** Data rows — everything after the header and separator. */
function dataRows(md: string | undefined): string[] {
  const lines = (md ?? "").split("\n").filter((l) => l.trim().startsWith("|"));
  return lines.slice(2);
}

describe("every shipped master is an empty contract", () => {
  const files = [...(Object.keys(COLUMNS) as RegistryFile[]), "tools" as const];

  for (const name of files) {
    it(`registry/${name}.md ships with its columns and no rows`, async () => {
      const md = await readRegistry(name);
      expect(md, `registry/${name}.md is missing`).toBeDefined();
      expect(dataRows(md), `registry/${name}.md ships ${dataRows(md).length} seeded row(s)`).toEqual([]);
    });

    it(`registry/${name}.md carries exactly the columns its parser reads`, async () => {
      const expected = name === "tools" ? [...TOOL_COLUMNS] : COLUMNS[name as Exclude<RegistryFile, "tools">];
      expect(header(await readRegistry(name))).toEqual(expected);
    });
  }

  it("says out loud that it ships empty, so nobody fills it with a demo", async () => {
    for (const name of files) {
      expect((await readRegistry(name)) ?? "", `registry/${name}.md`).toContain("Ships EMPTY");
    }
  });
});

describe("whatever a deployment records parses cleanly", () => {
  // Vacuous while the files are empty, and the real guard the moment they are not:
  // every parser keeps a bad row and marks it rather than throwing, so without this
  // a mistyped hand edit degrades to a badge nobody looks at.
  it("no unreadable row in any master", async () => {
    const [systems, plants, uns, tech, waves, ai, tools] = await Promise.all([
      readRegistry("landscape").then(parseLandscape),
      readRegistry("plants").then(parsePlants),
      readRegistry("uns").then(parseUns),
      readRegistry("technology").then(parseTechnology),
      readRegistry("rollout").then(parseRollout),
      readRegistry("ai-portfolio").then(parseAiPortfolio),
      readRegistry("tools").then(parseTools),
    ]);
    expect(systems.filter((s) => s.needsAttention).map((s) => `landscape ${s.plant}/${s.system}: ${s.issues.join(", ")}`)).toEqual([]);
    expect(plants.filter((p) => p.needsAttention).map((p) => `plants ${p.code}: ${p.issues.join(", ")}`)).toEqual([]);
    expect(uns.filter((u) => u.needsAttention).map((u) => `uns ${u.level}: ${u.issues.join(", ")}`)).toEqual([]);
    expect(tech.filter((t) => t.needsAttention).map((t) => `technology ${t.id}: ${t.issues.join(", ")}`)).toEqual([]);
    expect(waves.filter((w) => w.needsAttention).map((w) => `rollout ${w.wave}/${w.plant}: ${w.issues.join(", ")}`)).toEqual([]);
    expect(ai.filter((r) => r.needsAttention).map((r) => `ai ${r.id}: ${r.issues.join(", ")}`)).toEqual([]);
    expect(tools.filter((t) => t.needsAttention).map((t) => `tools ${t.id}: ${t.issues.join(", ")}`)).toEqual([]);
  });

  it("every plant code used anywhere exists in the plant master", async () => {
    const [systems, waves, ai, plants] = await Promise.all([
      readRegistry("landscape").then(parseLandscape),
      readRegistry("rollout").then(parseRollout),
      readRegistry("ai-portfolio").then(parseAiPortfolio),
      readRegistry("plants").then(parsePlants),
    ]);
    const known = new Set(plants.map((p) => p.code));
    const used = [...systems.map((s) => s.plant), ...waves.map((w) => w.plant), ...ai.map((r) => r.plant)];
    expect([...new Set(used)].filter((p) => p !== "" && !known.has(p))).toEqual([]);
  });

  it("every tool names a domain that exists in the domain taxonomy", async () => {
    const [tools, domainsMd] = await Promise.all([
      readRegistry("tools").then(parseTools),
      readFile(new URL("../../registry/domains.md", import.meta.url), "utf8"),
    ]);
    const known = new Set([...domainsMd.matchAll(/^\| ([a-z_]+) \|/gm)].map((m) => m[1]));
    expect(known.size, "the domain taxonomy is a vocabulary and must NOT ship empty").toBeGreaterThan(5);
    expect([...new Set(tools.map((t) => t.domain))].filter((d) => d !== "" && !known.has(d))).toEqual([]);
  });

  it("no wave scales a technology nobody adopted", async () => {
    const [tech, waves] = await Promise.all([
      readRegistry("technology").then(parseTechnology),
      readRegistry("rollout").then(parseRollout),
    ]);
    expect(unadoptedWaves(waves, tech).map((v) => `${v.wave.wave}/${v.wave.plant}: ${v.reason}`)).toEqual([]);
  });

  it("every refused AI row is refused for a missing safety case, not a typo", async () => {
    const rows = parseAiPortfolio(await readRegistry("ai-portfolio"));
    for (const r of refusals(evaluate(rows))) {
      expect(r.reason).toMatch(/envelope|fallback|abort condition/i);
    }
  });
});

describe("the consolidated register over empty masters", () => {
  it("is empty, and says so rather than inventing a portfolio", async () => {
    const [tools, systems] = await Promise.all([
      readRegistry("tools").then(parseTools),
      readRegistry("landscape").then(parseLandscape),
    ]);
    expect(consolidate({ register: tools, systems })).toEqual([]);
  });

  it("fills only from what a demand declares — and every such tool is a register gap", async () => {
    const [tools, systems, demands] = await Promise.all([
      readRegistry("tools").then(parseTools),
      readRegistry("landscape").then(parseLandscape),
      listDemandDocs(),
    ]);
    const entries = consolidate({ register: tools, systems, demands });
    const declared = new Set(demands.flatMap((d) => declaredTools(d.markdown)).map((n) => n.toLowerCase()));
    expect(entries.length).toBe(declared.size);
    expect(registerGaps(entries).length).toBe(entries.length);
  });
});
