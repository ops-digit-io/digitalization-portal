/**
 * The landscape engine. Two things are load-bearing and both are asserted here:
 *
 *  1. NEVER THROWS — a malformed row is kept and marked, never dropped. A system
 *     the survey got wrong must show up as a visible gap, not vanish from the
 *     inventory (`docs/BUILD.md`, the same rule the use-case parser follows).
 *  2. Maturity is DERIVED from the ordinal integration column, so it cannot drift
 *     from the rows a human edits.
 */

import { describe, it, expect } from "vitest";
import {
  parseLandscape,
  parsePlants,
  parseUns,
  plantMaturity,
  maturityByPlant,
  blockers,
  isBlocked,
  summarise,
  integrationRank,
  unsConventionProgress,
  INTEGRATION_STATES,
  MAX_INTEGRATION_RANK,
} from "./landscape.js";

const HEAD =
  "| Plant | ISA-95 | System | Vendor | Role | Integration | Interface | UNS topic root | Data owner | Freshness | Barrier |\n" +
  "|---|---|---|---|---|---|---|---|---|---|---|\n";

const row = (
  plant: string,
  level: string,
  system: string,
  integration: string,
  iface: string,
  barrier = "",
): string => `| ${plant} | ${level} | ${system} | V | R | ${integration} | ${iface} |  | Ops IT |  | ${barrier} |\n`;

describe("integrationRank", () => {
  it("is ordinal in the declared order", () => {
    expect(INTEGRATION_STATES.map(integrationRank)).toEqual([0, 1, 2, 3, 4]);
    expect(MAX_INTEGRATION_RANK).toBe(4);
  });

  it("ranks an unreadable state at the bottom — an unreadable claim is not a maturity claim", () => {
    expect(integrationRank("wishful-thinking")).toBe(0);
    expect(integrationRank("")).toBe(0);
  });
});

describe("parseLandscape", () => {
  it("reads a well-formed table", () => {
    const rows = parseLandscape(HEAD + row("DE-ALD", "L3", "Historian", "uns-modelled", "OPC-UA"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      plant: "DE-ALD",
      level: "L3",
      system: "Historian",
      integration: "uns-modelled",
      iface: "OPC-UA",
      needsAttention: false,
    });
    expect(rows[0]!.issues).toEqual([]);
  });

  it("never throws on absent, empty or table-less input", () => {
    expect(parseLandscape(undefined)).toEqual([]);
    expect(parseLandscape("")).toEqual([]);
    expect(parseLandscape("# Just a heading\n\nSome prose, no table.")).toEqual([]);
    expect(parseLandscape(HEAD)).toEqual([]);
  });

  it("KEEPS a row with an unreadable level and marks it, rather than dropping it", () => {
    const rows = parseLandscape(HEAD + row("DE-ALD", "L9", "Mystery box", "point-to-point", "OPC-UA"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.level).toBe("");
    expect(rows[0]!.issues.join(" ")).toContain("L9");
    // The rest of the row is still readable — one bad cell does not poison it.
    expect(rows[0]!.system).toBe("Mystery box");
    expect(rows[0]!.integration).toBe("point-to-point");
  });

  it("marks an unreadable integration state and an unreadable interface", () => {
    const rows = parseLandscape(HEAD + row("SK-PUC", "L2", "SCADA", "sort-of-connected", "carrier pigeon"));
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.integration).toBe("");
    expect(rows[0]!.iface).toBe("");
    expect(rows[0]!.issues).toHaveLength(2);
  });

  it("marks missing cells without losing the row", () => {
    const rows = parseLandscape(HEAD + "|  | | | | | | | | | | |\n| DE-ALD | | | | | | | | | | |\n");
    // The wholly empty row is a formatting artifact; the one naming a plant is a finding.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.plant).toBe("DE-ALD");
    expect(rows[0]!.needsAttention).toBe(true);
  });

  it("is case-insensitive on the enumerations", () => {
    const rows = parseLandscape(HEAD + row("DE-ALD", "l3", "Historian", "UNS-Modelled", "opc-ua"));
    expect(rows[0]!.level).toBe("L3");
    expect(rows[0]!.integration).toBe("uns-modelled");
    expect(rows[0]!.iface).toBe("OPC-UA");
    expect(rows[0]!.needsAttention).toBe(false);
  });
});

describe("isBlocked — the K2.2 condition as data", () => {
  it("blocks on no interface", () => {
    const [r] = parseLandscape(HEAD + row("PL-BAR", "L1", "PLC", "point-to-point", "none"));
    expect(isBlocked(r!)).toBe(true);
  });

  it("blocks on no integration", () => {
    const [r] = parseLandscape(HEAD + row("PL-BAR", "L3", "MES", "none", "REST"));
    expect(isBlocked(r!)).toBe(true);
  });

  it("does not block a readable system", () => {
    const [r] = parseLandscape(HEAD + row("DE-ALD", "L3", "MES", "broker-published", "REST"));
    expect(isBlocked(r!)).toBe(false);
  });
});

describe("plantMaturity", () => {
  const md =
    HEAD +
    row("DE-ALD", "L4", "ERP", "broker-published", "REST") +
    row("DE-ALD", "L3", "Historian", "uns-modelled", "OPC-UA") +
    row("DE-ALD", "L2", "SCADA", "broker-published", "MQTT") +
    row("CN-SUZ", "L3", "MES", "point-to-point", "SQL") +
    row("CN-SUZ", "L1", "PLC", "none", "none");

  it("derives maturity from the ordinal column", () => {
    const ald = plantMaturity(parseLandscape(md), "DE-ALD");
    // ranks 3, 4, 3 → mean 3.333 of 4 → 83%
    expect(ald.maturity).toBe(83);
    expect(ald.systems).toBe(3);
    expect(ald.blocked).toBe(0);
    expect(ald.hasNamespace).toBe(true);
  });

  it("counts the blocked systems and knows the plant has no namespace", () => {
    const suz = plantMaturity(parseLandscape(md), "CN-SUZ");
    // ranks 2, 0 → mean 1 of 4 → 25%
    expect(suz.maturity).toBe(25);
    expect(suz.blocked).toBe(1);
    expect(suz.hasNamespace).toBe(false);
  });

  it("returns null maturity for a plant with no systems rather than a misleading zero", () => {
    const none = plantMaturity(parseLandscape(md), "XX-NON");
    expect(none.maturity).toBeNull();
    expect(none.systems).toBe(0);
  });

  it("breaks maturity down by ISA-95 level, with null where the level is empty", () => {
    const ald = plantMaturity(parseLandscape(md), "DE-ALD");
    const byLevel = Object.fromEntries(ald.byLevel.map((l) => [l.level, l.rank]));
    expect(byLevel.L4).toBe(3);
    expect(byLevel.L3).toBe(4);
    expect(byLevel.L0).toBeNull();
  });

  it("ranks the most-blocked plant first", () => {
    expect(maturityByPlant(parseLandscape(md)).map((p) => p.plant)).toEqual(["CN-SUZ", "DE-ALD"]);
  });
});

describe("blockers — the UNS backlog", () => {
  const md =
    HEAD +
    row("DE-ALD", "L1", "Coating controller", "none", "none") +
    row("CN-SUZ", "L3", "Historian", "none", "none") +
    row("DE-ALD", "L3", "MES", "broker-published", "REST");

  it("lists only the unreadable systems", () => {
    expect(blockers(parseLandscape(md)).map((b) => b.system)).toEqual(["Historian", "Coating controller"]);
  });

  it("puts the higher ISA-95 level first — a blocked L3 denies data to the whole plant", () => {
    const [first] = blockers(parseLandscape(md));
    expect(first!.level).toBe("L3");
    expect(first!.rank).toBe(1);
  });

  it("returns an empty backlog when everything is readable", () => {
    expect(blockers(parseLandscape(HEAD + row("DE-ALD", "L3", "MES", "broker-published", "REST")))).toEqual([]);
  });
});

describe("summarise", () => {
  it("counts plants, systems, blockers and rows needing attention", () => {
    const md =
      HEAD +
      row("DE-ALD", "L3", "Historian", "uns-modelled", "OPC-UA") +
      row("CN-SUZ", "L1", "PLC", "none", "none") +
      row("CN-SUZ", "L9", "Mystery", "point-to-point", "SQL");
    const s = summarise(parseLandscape(md));
    expect(s).toMatchObject({ plants: 2, systems: 3, blocked: 1, withNamespace: 1, needsAttention: 1 });
    expect(s.meanMaturity).toBeGreaterThan(0);
  });

  it("reports null mean maturity for an empty landscape rather than zero", () => {
    expect(summarise([]).meanMaturity).toBeNull();
  });
});

describe("parsePlants", () => {
  const head = "| Code | Name | Country | Region | Site role | Ops IT owner | Notes |\n|---|---|---|---|---|---|---|\n";

  it("reads the master and its site roles", () => {
    const rows = parsePlants(head + "| DE-ALD | Aldingen | DE | Europe | lead | Ops IT Europe | x |\n");
    expect(rows[0]).toMatchObject({ code: "DE-ALD", region: "Europe", siteRole: "lead", needsAttention: false });
  });

  it("keeps and marks an unreadable site role", () => {
    const rows = parsePlants(head + "| PL-BAR | Baranowo | PL | Europe | someday | Ops IT Europe | |\n");
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.siteRole).toBe("");
  });

  it("exempts the ALL pseudo-plant from needing a site role", () => {
    const rows = parsePlants(head + "| ALL | All plants | — | — | reference | — | |\n");
    expect(rows[0]!.needsAttention).toBe(false);
  });

  it("never throws on absent input", () => {
    expect(parsePlants(undefined)).toEqual([]);
  });
});

describe("parseUns + unsConventionProgress", () => {
  const head = "| Level | Segment | Example topic | Owner | Standard ref | Status |\n|---|---|---|---|---|---|\n";
  const md =
    head +
    "| site | `<site>` | rehau/ald | Arch | STD-UNS-01 | published |\n" +
    "| cell | `<cell>` | rehau/ald/w2/weld-1 | Ops IT | STD-UNS-03 | agreed |\n" +
    "| signal | `<signal>` | rehau/ald/l3/gauge/wall | Arch | STD-UNS-04 | proposed |\n";

  it("reads the convention", () => {
    expect(parseUns(md)).toHaveLength(3);
    expect(parseUns(md)[0]!.status).toBe("published");
  });

  it("separates a namespace that is published from one that is only agreed", () => {
    const p = unsConventionProgress(parseUns(md));
    expect(p).toMatchObject({ published: 1, agreed: 1, proposed: 1 });
    expect(p.percent).toBe(33);
  });

  it("keeps and marks an unreadable status", () => {
    const rows = parseUns(head + "| site | `<site>` | rehau/ald | Arch | STD | soon |\n");
    expect(rows[0]!.needsAttention).toBe(true);
    expect(rows[0]!.status).toBe("");
  });

  it("reports null progress for an empty convention rather than zero", () => {
    expect(unsConventionProgress([]).percent).toBeNull();
  });
});
