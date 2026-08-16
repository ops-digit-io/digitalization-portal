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
});
