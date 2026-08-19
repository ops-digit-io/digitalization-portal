/**
 * The scout end to end, against a FIXTURE landscape.
 *
 * The unit tests prove each piece; this proves the pipeline produces something a
 * human would actually act on — that the offline seed, scored against a landscape
 * with real gaps in it, ranks the candidate that unblocks recorded work above the
 * one that does not. A scoring function that is individually correct and
 * collectively useless would pass everything else in this directory.
 *
 * The fixture is here rather than in `registry/` because the shipped masters ship
 * EMPTY — nothing invented is inherited by a deployment — and a pipeline test that
 * needs data has to carry its own.
 */

import { describe, it, expect } from "vitest";
import { runScout } from "../agent/scout-runner.js";
import { readRegistry } from "../otx/source.js";
import { parseLandscape } from "../otx/landscape.js";
import { parseTechnology } from "../otx/rollout.js";
import { rank, dedupe } from "./fit.js";

/** A small plant landscape with unreadable systems at several ISA-95 levels. */
const LANDSCAPE = `
| Plant | ISA-95 | System | Vendor | Role | Integration | Interface | UNS topic root | Data owner | Freshness | Barrier |
|---|---|---|---|---|---|---|---|---|---|---|
| DE-ALD | L3 | MES | Critical Manufacturing | Order execution | broker-published | REST | acme/ald | Ops IT | live | |
| DE-ALD | L3 | Historian | AVEVA PI | Process archive | uns-modelled | OPC-UA | acme/ald | Ops IT | live | |
| DE-VIE | L3 | MES | In-house | Order execution | point-to-point | SQL | | Ops IT | hourly | No broker on site |
| DE-VIE | L2 | SCADA extrusion | Siemens WinCC | Line supervision | none | none | | Ops IT | on-request | Closed vendor system |
| SK-PUC | L2 | SCADA fabrication | Rockwell | Line supervision | none | none | | Ops IT | on-request | No read interface |
| SK-PUC | L1 | PLC welding cell 2 | Rockwell ControlLogix | Control | none | none | | Ops IT | on-request | Legacy CPU |
`;

/** A technology register that has already adopted an L2 shopfloor standard. */
const TECHNOLOGY = `
| ID | Technology | Layer | Status | Trialled at | Evidence | Decision | Decided on | Decided by | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| TEC-001 | MQTT Sparkplug B | L2 | adopt | DE-ALD | UC-2026-0033 | Group default for shopfloor publish. | 2026-03-12 | Architecture board | |
| TEC-002 | HiveMQ broker | L3 | adopt | DE-ALD | UC-2026-0033 | Group default broker. | 2026-03-12 | Architecture board | |
| TEC-003 | Proprietary line gateway | L2 | hold | DE-VIE | | Closed protocol, no second source. | 2026-04-02 | Architecture board | |
`;

async function sweep() {
  const systems = parseLandscape(LANDSCAPE);
  const known = parseTechnology(TECHNOLOGY);
  const res = await runScout("", known.map((t) => t.technology));
  const fresh = dedupe(res.candidates.map((c) => c.candidate), known);
  const ids = new Set(fresh.map((c) => c.id));
  const ranked = rank(
    res.candidates.filter((c) => ids.has(c.candidate.id)).map((c) => ({ candidate: c.candidate, relevance: c.relevance })),
    systems,
    known,
  );
  return { ranked, res, systems, known };
}

describe("scout pipeline against a landscape with gaps", () => {
  it("produces a ranked shortlist without a model configured", async () => {
    const { ranked, res } = await sweep();
    expect(res.live).toBe(false);
    expect(res.note ?? "").not.toBe("");
    expect(ranked.length).toBeGreaterThan(0);
  });

  it("scores the top candidate above zero — it found real gaps to measure against", async () => {
    const { ranked } = await sweep();
    expect(ranked[0]!.fit.score).toBeGreaterThan(0);
  });

  it("ranks a candidate that unblocks recorded systems above one that unblocks none", async () => {
    const { ranked } = await sweep();
    const withUnblocks = ranked.filter((r) => r.fit.unblocks.length > 0);
    const without = ranked.filter((r) => r.fit.unblocks.length === 0);
    expect(withUnblocks.length).toBeGreaterThan(0);
    for (const w of withUnblocks) {
      for (const n of without) expect(w.fit.score).toBeGreaterThanOrEqual(n.fit.score);
    }
  });

  it("is sorted by fit, descending", async () => {
    const { ranked } = await sweep();
    const scores = ranked.map((r) => r.fit.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("every factor cites portal-held evidence, so the score can be argued with", async () => {
    const { ranked } = await sweep();
    for (const r of ranked) {
      expect(r.fit.factors.length).toBeGreaterThan(0);
      for (const f of r.fit.factors) expect(f.detail.trim().length).toBeGreaterThan(10);
    }
  });

  it("drops anything the register already holds", async () => {
    const { ranked, known } = await sweep();
    const names = new Set(known.map((t) => t.technology.toLowerCase()));
    for (const r of ranked) expect(names.has(r.candidate.name.toLowerCase())).toBe(false);
  });

  it("penalises the layer where a standard is already adopted", async () => {
    // The register adopts an L2 shopfloor-publish standard, so an L2 candidate must
    // carry the duplication penalty rather than compete blind.
    const { ranked } = await sweep();
    const l2 = ranked.filter((r) => r.candidate.layer === "L2");
    for (const r of l2) expect(r.fit.duplicatesAdopted).toBe(true);
  });

  it("degrades to an honest empty answer against the shipped (empty) registry", async () => {
    // A deployment that has recorded nothing yet has no gaps to score against. The
    // pipeline must still run and rank — every candidate simply scores on relevance
    // alone — rather than pretending to know what would unblock work.
    const [systems, known] = await Promise.all([
      readRegistry("landscape").then(parseLandscape),
      readRegistry("technology").then(parseTechnology),
    ]);
    expect(systems).toEqual([]);
    const res = await runScout("", known.map((t) => t.technology));
    const ranked = rank(
      res.candidates.map((c) => ({ candidate: c.candidate, relevance: c.relevance })),
      systems,
      known,
    );
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked) expect(r.fit.unblocks).toEqual([]);
  });
});
