/**
 * The registry masters that SHIP with the app are well-formed.
 *
 * `lib/otx/landscape.ts` never throws — a bad row is kept and marked. That is the
 * right behaviour at runtime and exactly why it needs a second guard here: without
 * one, a mistyped hand edit degrades quietly to a "needs attention" badge nobody
 * looks at. This test says the shipped data has no such rows, so the badge means
 * something when it does appear.
 */

import { describe, it, expect } from "vitest";
import { readRegistry } from "./source.js";
import { parseLandscape, parsePlants, parseUns, summarise, blockers } from "./landscape.js";
import { parseTechnology, parseRollout, unadoptedWaves, declined } from "./rollout.js";
import { parseAiPortfolio, evaluate, refusals } from "./ai-portfolio.js";

describe("shipped registry masters", () => {
  it("registry/landscape.md parses with no unreadable rows", async () => {
    const systems = parseLandscape(await readRegistry("landscape"));
    expect(systems.length).toBeGreaterThan(40);
    expect(systems.filter((s) => s.needsAttention).map((s) => `${s.plant}/${s.system}: ${s.issues.join(", ")}`)).toEqual([]);
  });

  it("registry/plants.md parses with no unreadable rows", async () => {
    const plants = parsePlants(await readRegistry("plants"));
    expect(plants.length).toBeGreaterThan(10);
    expect(plants.filter((p) => p.needsAttention).map((p) => `${p.code}: ${p.issues.join(", ")}`)).toEqual([]);
  });

  it("registry/uns.md parses with no unreadable rows", async () => {
    const uns = parseUns(await readRegistry("uns"));
    expect(uns.length).toBeGreaterThan(5);
    expect(uns.filter((u) => u.needsAttention).map((u) => `${u.level}: ${u.issues.join(", ")}`)).toEqual([]);
  });

  it("every system names a plant that exists in the plant master", async () => {
    const [systems, plants] = await Promise.all([
      readRegistry("landscape").then(parseLandscape),
      readRegistry("plants").then(parsePlants),
    ]);
    const known = new Set(plants.map((p) => p.code));
    expect([...new Set(systems.map((s) => s.plant))].filter((p) => !known.has(p))).toEqual([]);
  });

  it("has a real backlog to show — the surface would be pointless without one", async () => {
    const systems = parseLandscape(await readRegistry("landscape"));
    const s = summarise(systems);
    expect(s.blocked).toBeGreaterThan(0);
    // The worst blocker is at L3 or above: a blocked historian or MES denies data
    // to the whole plant, which is the ordering the backlog exists to express.
    expect(["L3", "L4"]).toContain(blockers(systems)[0]?.level);
  });

  it("registry/technology.md and registry/rollout.md parse with no unreadable rows", async () => {
    const [tech, waves] = await Promise.all([
      readRegistry("technology").then(parseTechnology),
      readRegistry("rollout").then(parseRollout),
    ]);
    expect(tech.filter((t) => t.needsAttention).map((t) => `${t.id}: ${t.issues.join(", ")}`)).toEqual([]);
    expect(waves.filter((w) => w.needsAttention).map((w) => `${w.wave}/${w.plant}: ${w.issues.join(", ")}`)).toEqual([]);
  });

  it("the shipped plan does not break the invariant — no wave scales an unadopted technology", async () => {
    const [tech, waves] = await Promise.all([
      readRegistry("technology").then(parseTechnology),
      readRegistry("rollout").then(parseRollout),
    ]);
    expect(unadoptedWaves(waves, tech).map((v) => `${v.wave.wave}/${v.wave.plant}: ${v.reason}`)).toEqual([]);
  });

  it("records technologies that were declined, not only ones that were adopted", async () => {
    const tech = parseTechnology(await readRegistry("technology"));
    // A register with no `hold`/`retire` rows cannot evidence deciding what stays
    // OUT, which is half of what the responsibility actually is.
    expect(declined(tech).length).toBeGreaterThan(0);
  });

  it("registry/ai-portfolio.md parses, and every refusal is one the register means", async () => {
    const rows = parseAiPortfolio(await readRegistry("ai-portfolio"));
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.filter((r) => r.needsAttention).map((r) => `${r.id}: ${r.issues.join(", ")}`)).toEqual([]);

    // The portfolio is seeded to demonstrate BOTH outcomes: a control loop with a
    // written safety case that is permitted, and one without that is refused. If
    // either disappeared the surface would stop making its point.
    const v = evaluate(rows);
    expect(refusals(v).length).toBeGreaterThan(0);
    expect(v.filter((x) => x.physical && x.ok).length).toBeGreaterThan(0);
  });

  it("every refused row is refused for a missing safety case, not a typo", async () => {
    const rows = parseAiPortfolio(await readRegistry("ai-portfolio"));
    for (const r of refusals(evaluate(rows))) {
      expect(r.reason).toMatch(/envelope|fallback|abort condition/i);
    }
  });

  it("every AI row points at a plant that exists in the plant master", async () => {
    const [rows, plants] = await Promise.all([
      readRegistry("ai-portfolio").then(parseAiPortfolio),
      readRegistry("plants").then(parsePlants),
    ]);
    const known = new Set(plants.map((p) => p.code));
    expect([...new Set(rows.map((r) => r.plant))].filter((p) => !known.has(p))).toEqual([]);
  });

  it("every wave names a plant that exists in the plant master", async () => {
    const [waves, plants] = await Promise.all([
      readRegistry("rollout").then(parseRollout),
      readRegistry("plants").then(parsePlants),
    ]);
    const known = new Set(plants.map((p) => p.code));
    expect([...new Set(waves.map((w) => w.plant))].filter((p) => !known.has(p))).toEqual([]);
  });
});
