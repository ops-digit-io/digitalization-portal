/**
 * The champions register. What is tested is the thing the operating model needs
 * and the thing it must never become: coverage of the ORGANISATION is reported
 * precisely, and nothing anywhere ranks a person.
 */

import { describe, it, expect } from "vitest";
import {
  buildCoverage, buildLoads, completeChampion, covers, findCandidates, isActive,
  nextChampionId, validateChampion, type Champion, type EngagementRef,
} from "./champions";

const ON = "2026-08-01";
const PLANTS = ["Hamburg", "Aalen"];
const DOMAINS = ["maintenance", "quality"];

const ch = (over: Partial<Champion> & { id: string }): Champion =>
  completeChampion({ name: `Person ${over.id}`, ...over }, over.id);

describe("ids", () => {
  it("allocates the next free id and never reuses a spent one", () => {
    expect(nextChampionId([])).toBe("C-01");
    expect(nextChampionId(["C-01", "C-04"])).toBe("C-05");
  });
});

describe("activity window", () => {
  it("is inactive before the start and after the hand-back", () => {
    const c = ch({ id: "C-01", since: "2026-01-01", until: "2026-06-01" });
    expect(isActive(c, "2025-12-31")).toBe(false);
    expect(isActive(c, "2026-03-01")).toBe(true);
    expect(isActive(c, "2026-08-01")).toBe(false);
  });

  it("with no dates, they are simply active", () => {
    expect(isActive(ch({ id: "C-02" }), ON)).toBe(true);
  });
});

describe("covers", () => {
  it("matches an explicit plant and domain, case-insensitively", () => {
    const c = ch({ id: "C-01", plants: ["Hamburg"], domains: ["maintenance"] });
    expect(covers(c, "hamburg", "Maintenance")).toBe(true);
    expect(covers(c, "Aalen", "maintenance")).toBe(false);
  });

  it("an empty list means all — a domainless champion covers every domain there", () => {
    const c = ch({ id: "C-02", plants: ["Aalen"], domains: [] });
    expect(covers(c, "Aalen", "quality")).toBe(true);
    expect(covers(c, "Hamburg", "quality")).toBe(false);
  });
});

describe("coverage map", () => {
  it("names the cells nobody covers — the whole point of the register", () => {
    const r = buildCoverage([ch({ id: "C-01", role: "spoke", plants: ["Hamburg"], domains: ["maintenance"] })], PLANTS, DOMAINS, ON);
    expect(r.cells).toHaveLength(4);
    expect(r.gaps.map((g) => `${g.plant}/${g.domain}`)).toEqual([
      "Hamburg/quality", "Aalen/maintenance", "Aalen/quality",
    ]);
    expect(r.coverage).toBeCloseTo(0.25);
    expect(r.plantsCovered).toBe(1);
    expect(r.plantsTotal).toBe(2);
  });

  it("separates 'nobody' from 'somebody, but nobody who can decide'", () => {
    // A champion can carry work; only a spoke can approve a change. A cell with
    // one and not the other is a distinct, and very common, kind of stuck.
    const r = buildCoverage([ch({ id: "C-01", role: "champion", plants: ["Hamburg"] })], PLANTS, DOMAINS, ON);
    expect(r.gaps.map((g) => g.plant)).toEqual(["Aalen", "Aalen"]);
    expect(r.spokeless.map((c) => `${c.plant}/${c.domain}`)).toEqual(["Hamburg/maintenance", "Hamburg/quality"]);
  });

  it("a handed-back role reopens the gap", () => {
    const gone = ch({ id: "C-01", role: "spoke", plants: ["Hamburg"], until: "2026-07-01" });
    expect(buildCoverage([gone], PLANTS, DOMAINS, ON).gaps).toHaveLength(4);
  });

  it("no plants configured is 0 % coverage, not a divide-by-zero", () => {
    const r = buildCoverage([], [], DOMAINS, ON);
    expect(r.coverage).toBe(0);
    expect(r.cells).toEqual([]);
  });
});

describe("load", () => {
  const engagements: EngagementRef[] = [
    { slug: "a", title: "Order intake", owner: "anna@x.com", champion: "" },
    { slug: "b", title: "Spare parts", owner: "someone else", champion: "Anna Meier" },
  ];
  const anna = ch({ id: "C-01", name: "Anna Meier", email: "anna@x.com" });

  it("matches on email and on name — the funnel records free text", () => {
    const [l] = buildLoads([anna], engagements, ["ANNA@X.COM", "bob@x.com"]);
    expect(l!.engagementsOwned).toBe(1);
    expect(l!.engagementsChampioned).toBe(1);
    expect(l!.demandsRaised).toBe(1);
    expect(l!.carrying).toEqual(["Order intake", "Spare parts"]);
  });

  it("returns register order, NOT load order — this is support, not a ranking", () => {
    const quiet = ch({ id: "C-02", name: "Quiet Colleague" });
    const loads = buildLoads([quiet, anna], engagements, []);
    expect(loads.map((l) => l.championId)).toEqual(["C-02", "C-01"]);
  });
});

describe("candidates", () => {
  const engagements: EngagementRef[] = [
    { slug: "a", title: "T", owner: "Bea Fischer", champion: "Carl Roth" },
    { slug: "b", title: "U", owner: "Bea Fischer", champion: "" },
  ];

  it("surfaces people already doing the job who are not in the register", () => {
    const c = findCandidates([], engagements, ["Ada Lovelace"]);
    expect(c.map((x) => x.name)).toEqual(["Ada Lovelace", "Bea Fischer", "Carl Roth"]);
    expect(c.find((x) => x.name === "Bea Fischer")?.occurrences).toBe(2);
    expect(c.find((x) => x.name === "Carl Roth")?.seenAs).toEqual(["named champion"]);
  });

  it("does not re-suggest someone already registered, by name or email", () => {
    const reg = [ch({ id: "C-01", name: "Bea Fischer" }), ch({ id: "C-02", name: "x", email: "carl roth" })];
    expect(findCandidates(reg, engagements, []).map((x) => x.name)).toEqual([]);
  });

  it("is alphabetical — a list of people to talk to, not a shortlist by keenness", () => {
    const busy: EngagementRef[] = Array.from({ length: 5 }, (_, i) => ({ slug: `s${i}`, title: "T", owner: "Zoe Zimmer", champion: "" }));
    expect(findCandidates([], [...busy, ...engagements], []).map((x) => x.name)[0]).toBe("Bea Fischer");
  });
});

describe("validation", () => {
  it("needs a name and rejects a malformed email or a reversed date range", () => {
    expect(validateChampion({}).errors).toContain("A champion needs a name — the register exists to reach a person.");
    expect(validateChampion({ name: "A", email: "not-an-email" }).ok).toBe(false);
    expect(validateChampion({ name: "A", since: "2026-06-01", until: "2026-01-01" }).ok).toBe(false);
  });

  it("warns on the things that make the register useless without blocking a save", () => {
    const v = validateChampion({ name: "A", role: "spoke", plants: [] });
    expect(v.ok).toBe(true);
    expect(v.warnings.join(" ")).toMatch(/every plant/i);
    expect(v.warnings.join(" ")).toMatch(/capacity/i);
  });
});
