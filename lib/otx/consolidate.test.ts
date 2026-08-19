import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assessRisk,
  toolNodeId,
  toolNameIndex,
  resolveToolName,
  budget,
  consolidate,
  declaredTools,
  isAbsenceRow,
  registerGaps,
  riskBand,
  summariseConsolidated,
  topRisks,
  useCaseExposure,
  type DemandDoc,
} from "./consolidate.js";
import { parseTools, emptyToolRow, type ToolRow } from "./toolscape.js";
import { parseLandscape, type SystemRow } from "./landscape.js";

/** A register row with only the fields a test cares about. */
function tool(over: Partial<ToolRow>): ToolRow {
  return { ...emptyToolRow(), ...over };
}

/** A landscape row with only the fields a test cares about. */
function system(over: Partial<SystemRow>): SystemRow {
  return {
    plant: "DE-ALD",
    level: "L3",
    system: "MES",
    vendor: "Critical Manufacturing",
    role: "Order execution",
    integration: "broker-published",
    iface: "REST",
    topicRoot: "",
    dataOwner: "Ops IT Europe",
    freshness: "live",
    barrier: "",
    needsAttention: false,
    issues: [],
    ...over,
  };
}

function demand(id: string, markdown: string): DemandDoc {
  return { id, title: id, markdown };
}

describe("declaredTools — a demand naming what it builds on", () => {
  it("reads the `Tools` line from `## State`", () => {
    expect(declaredTools("## State\n\n- **Plant:** DE-ALD\n- **Tools:** SAP S/4HANA, Power BI\n")).toEqual([
      "SAP S/4HANA",
      "Power BI",
    ]);
  });

  it("accepts `Systems` as the same statement, and splits on ; and ·", () => {
    expect(declaredTools("- **Systems:** Ignition; AVEVA PI · Jira")).toEqual(["Ignition", "AVEVA PI", "Jira"]);
  });

  it("is empty for a demand that declares nothing, and never throws", () => {
    expect(declaredTools("")).toEqual([]);
    expect(declaredTools("- **Tools:**")).toEqual([]);
    expect(declaredTools("- **Tools:** <!-- none -->")).toEqual([]);
  });
});

describe("plant systems fold into the tool they are", () => {
  it("matches a system to its registered tool on vendor AND kind", () => {
    const entries = consolidate({
      register: [tool({ id: "APP-013", tool: "Critical Manufacturing MES", vendor: "Critical Manufacturing", capability: "MES", lifecycle: "invest" })],
      systems: [system({ plant: "DE-ALD" }), system({ plant: "HU-SZE" })],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.origin).toBe("register");
    expect(entries[0]!.installations).toHaveLength(2);
    expect(entries[0]!.plants).toEqual(["DE-ALD", "HU-SZE"]);
    expect(entries[0]!.sources).toEqual(["register", "plant"]);
  });

  it("refuses a match on vendor words alone — one register row must not swallow another system", () => {
    const entries = consolidate({
      register: [tool({ id: "APP-021", tool: "Local CMMS (Suzhou)", vendor: "Local vendor", capability: "EAM / maintenance", lifecycle: "eliminate" })],
      systems: [system({ plant: "CN-FOS", system: "MES", vendor: "Local vendor", level: "L3" })],
    });
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.origin === "plant")!.tool).toBe("MES (Local vendor)");
  });

  it("gives an unregistered system one entry across every plant it runs at", () => {
    const entries = consolidate({
      register: [],
      systems: [
        system({ plant: "DE-ALD", system: "UNS broker", vendor: "HiveMQ" }),
        system({ plant: "US-GRV", system: "UNS broker", vendor: "HiveMQ" }),
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.origin).toBe("plant");
    expect(entries[0]!.plants).toEqual(["DE-ALD", "US-GRV"]);
  });

  it("never turns an absence row into a tool — 'no historian on site' is a gap", () => {
    const absent = system({ system: "Historian", vendor: "—", role: "—", integration: "none", iface: "none" });
    expect(isAbsenceRow(absent)).toBe(true);
    expect(consolidate({ register: [], systems: [absent] })).toEqual([]);
  });
});

describe("use cases put tools on the register", () => {
  const register = [tool({ id: "APP-026", tool: "Power BI", vendor: "Microsoft", capability: "BI / analytics", lifecycle: "invest", businessOwner: "Controlling", itOwner: "Corporate IT", annualCost: 290000 })];

  it("links a declared tool to the tool it names", () => {
    const entries = consolidate({
      register,
      demands: [demand("UC-2026-0041", "## State\n\n- **Tools:** Power BI\n")],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.useCases).toEqual([{ id: "UC-2026-0041", title: "UC-2026-0041", kind: "declared" }]);
  });

  it("creates the tool a use case names and no register has heard of", () => {
    const entries = consolidate({
      register,
      demands: [demand("UC-2026-0044", "## State\n\n- **Tools:** Senseye Predictive Maintenance\n")],
    });
    const created = entries.find((e) => e.origin === "use-case")!;
    expect(created.tool).toBe("Senseye Predictive Maintenance");
    expect(created.needsAttention).toBe(true);
    expect(created.risk.factors.map((f) => f.key)).toContain("unregistered");
  });

  it("records a prose mention as a hint, never as a new tool", () => {
    const entries = consolidate({
      register,
      demands: [demand("UC-2026-0033", "## Problem\n\nThe Pareto is rebuilt in Power BI by hand every week.\n")],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.useCases[0]!.kind).toBe("mentioned");
  });

  it("counts a tool declared and mentioned once, as the declaration", () => {
    const entries = consolidate({
      register,
      demands: [demand("UC-1", "## State\n\n- **Tools:** Power BI\n\n## Problem\n\nPower BI again.\n")],
    });
    expect(entries[0]!.useCases).toHaveLength(1);
    expect(entries[0]!.useCases[0]!.kind).toBe("declared");
  });

  it("does not match a name on a fragment of a longer word", () => {
    const entries = consolidate({
      register: [tool({ id: "APP-017", tool: "AVEVA PI", vendor: "AVEVA", capability: "Historian", lifecycle: "tolerate" })],
      demands: [demand("UC-1", "The data pipeline copies it nightly.")],
    });
    expect(entries[0]!.useCases).toEqual([]);
  });
});

describe("manual additions merge with the shipped master", () => {
  const register = [tool({ id: "APP-001", tool: "SAP S/4HANA", vendor: "SAP", capability: "ERP", lifecycle: "invest" })];

  it("keeps a tool the master does not have, marked as recorded-not-reviewed", () => {
    const entries = consolidate({ register, manual: [tool({ id: "APP-100", tool: "Miro", capability: "Collaboration" })] });
    expect(entries.map((e) => e.tool).sort()).toEqual(["Miro", "SAP S/4HANA"]);
    expect(entries.find((e) => e.tool === "Miro")!.origin).toBe("manual");
  });

  it("collapses onto the master once the same tool is curated in — the master wins", () => {
    const entries = consolidate({ register, manual: [tool({ id: "APP-100", tool: "sap s/4hana", capability: "ERP" })] });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("APP-001");
    expect(entries[0]!.sources).toEqual(["register", "manual"]);
  });
});

describe("risk is derived from the register's own facts", () => {
  it("bands by score", () => {
    expect(riskBand(0)).toBe("low");
    expect(riskBand(25)).toBe("elevated");
    expect(riskBand(45)).toBe("high");
    expect(riskBand(80)).toBe("critical");
  });

  it("names shadow IT, an island and lifecycle debt, each in words", () => {
    const r = assessRisk(
      tool({ tool: "Excel planning workbooks", capability: "Supply chain planning", lifecycle: "eliminate", integration: "isolated", businessOwner: "Supply Chain Europe", itOwner: "", users: 130, criticality: "critical", annualCost: 0 }),
      { origin: "register", installations: [], useCases: [], overlapping: true },
    );
    const keys = r.factors.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["unowned", "island", "lifecycle-debt", "overlap"]));
    expect(r.band).toBe("critical");
    // Every factor explains itself in a phrase short enough to scan in a table —
    // the surface renders these verbatim, one per line.
    for (const f of r.factors) {
      expect(f.label.length).toBeGreaterThan(10);
      expect(f.label.length).toBeLessThan(60);
    }
  });

  it("scores a healthy, owned, integrated tool at zero", () => {
    const r = assessRisk(
      tool({ tool: "SAP S/4HANA", capability: "ERP", lifecycle: "invest", integration: "hub", businessOwner: "Finance", itOwner: "Corporate IT", criticality: "critical", annualCost: 1450000 }),
      { origin: "register", installations: [], useCases: [], overlapping: false },
    );
    expect(r.score).toBe(0);
    expect(r.band).toBe("low");
  });

  it("flags a tool nobody has costed as unbudgeted", () => {
    const r = assessRisk(
      tool({ tool: "SAP QM", capability: "QMS", lifecycle: "tolerate", integration: "hub", businessOwner: "Quality", itOwner: "Corporate IT", criticality: "important", annualCost: null }),
      { origin: "register", installations: [], useCases: [], overlapping: false },
    );
    expect(r.factors.map((f) => f.key)).toEqual(["unbudgeted"]);
  });

  it("weighs an off-register L3 system above an off-register controller", () => {
    const mes = assessRisk(tool({ tool: "MES (Local vendor)", itOwner: "Ops IT Asia" }), {
      origin: "plant",
      installations: [system({ level: "L3", integration: "point-to-point", iface: "SQL" })],
      useCases: [],
      overlapping: false,
    });
    const plc = assessRisk(tool({ tool: "PLC line 3 (Siemens)", itOwner: "Ops IT Europe" }), {
      origin: "plant",
      installations: [system({ level: "L1", integration: "point-to-point", iface: "OPC-UA" })],
      useCases: [],
      overlapping: false,
    });
    expect(mes.score).toBeGreaterThan(plc.score);
    // A plant row has no lifecycle or cost column, so their absence is not a finding.
    expect(plc.factors.map((f) => f.key)).not.toContain("undecided");
    expect(plc.factors.map((f) => f.key)).not.toContain("unbudgeted");
  });

  it("counts every blocked installation, and says how many", () => {
    const r = assessRisk(tool({ tool: "Coating line controller", itOwner: "Ops IT Europe" }), {
      origin: "plant",
      installations: [system({ iface: "none", integration: "none" }), system({ plant: "DE-VIE", iface: "none", integration: "none" })],
      useCases: [],
      overlapping: false,
    });
    expect(r.factors.find((f) => f.key === "unreadable")!.label).toContain("2 plant installations");
  });

  it("flags a use case built on a tool that is on its way out", () => {
    const r = assessRisk(tool({ tool: "Coupa", capability: "Procurement", lifecycle: "eliminate", integration: "point-to-point", businessOwner: "Procurement Americas", itOwner: "Corporate IT", users: 180, criticality: "important", annualCost: 185000 }), {
      origin: "register",
      installations: [],
      useCases: [{ id: "UC-2026-0051", title: "Vendor onboarding", kind: "declared" }],
      overlapping: true,
    });
    expect(r.factors.map((f) => f.key)).toContain("building-on-sand");
  });
});

describe("budget — the findings, priced", () => {
  const entries = consolidate({
    register: [
      tool({ id: "APP-003", tool: "Coupa", capability: "Procurement", lifecycle: "eliminate", integration: "point-to-point", businessOwner: "Procurement Americas", itOwner: "Corporate IT", users: 180, criticality: "important", annualCost: 185000 }),
      tool({ id: "APP-002", tool: "SAP Ariba", capability: "Procurement", lifecycle: "invest", integration: "api", businessOwner: "Procurement", itOwner: "Corporate IT", users: 620, criticality: "important", annualCost: 310000 }),
      tool({ id: "APP-009", tool: "Personio", capability: "HRIS", lifecycle: "eliminate", integration: "isolated", businessOwner: "HR Europe", itOwner: "", users: 60, criticality: "standard", annualCost: 21000 }),
      tool({ id: "APP-018", tool: "SAP QM", capability: "QMS", lifecycle: "tolerate", integration: "hub", businessOwner: "Quality", itOwner: "Corporate IT", users: 380, criticality: "important", annualCost: null }),
    ],
  });
  const b = budget(entries);

  it("totals what is actually costed, and counts what is not", () => {
    expect(b.total).toBe(185000 + 310000 + 21000);
    expect(b.unbudgeted).toBe(1);
    expect(b.coverage).toBe(75);
  });

  it("prices the overlap and the decision nobody executed", () => {
    expect(b.lines.find((l) => l.label.includes("overlapping"))!.amount).toBe(495000);
    expect(b.lines.find((l) => l.label.includes("decided against"))!.amount).toBe(206000);
    expect(b.lines.find((l) => l.label.includes("named owner"))!.amount).toBe(21000);
  });

  it("drops a line nothing falls into rather than showing a zero", () => {
    expect(budget([]).lines).toEqual([]);
    expect(budget([]).coverage).toBeNull();
  });
});

describe("the consolidated register, over the shipped masters", () => {
  it("is EMPTY on a fresh deployment — the masters ship with no rows at all", async () => {
    // Nothing invented is inherited: no applications, no plant systems, no tools a
    // demand names until somebody names one. An empty page is the honest answer;
    // a seeded portfolio is a page of fiction that reads as fact.
    const base = join(process.cwd());
    const [toolsMd, landscapeMd] = await Promise.all([
      readFile(join(base, "registry/tools.md"), "utf8"),
      readFile(join(base, "registry/landscape.md"), "utf8"),
    ]);
    const register = parseTools(toolsMd);
    const systems = parseLandscape(landscapeMd);
    expect(register).toEqual([]);
    expect(systems).toEqual([]);
    expect(consolidate({ register, systems })).toEqual([]);
    expect(summariseConsolidated([]).meanRisk).toBeNull();
  });

  it("fills from the first thing recorded — a demand naming a tool nobody registered", async () => {
    const entries = consolidate({
      register: [],
      systems: [],
      demands: [demand("UC-2026-0041", "## State\n\n- **Tools:** Power BI\n")],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.origin).toBe("use-case");
    expect(registerGaps(entries)).toHaveLength(1);
    expect(useCaseExposure(entries)[0]!.id).toBe("UC-2026-0041");
    expect(topRisks(entries).length).toBe(1);
  });

  it("never throws on empty or malformed input", () => {
    expect(consolidate({ register: [] })).toEqual([]);
    expect(consolidate({ register: parseTools(undefined), systems: parseLandscape("nonsense") })).toEqual([]);
    expect(summariseConsolidated([]).meanRisk).toBeNull();
  });
});

describe("a person's edits ride over the source row", () => {
  const register = [tool({ id: "APP-001", tool: "SAP S/4HANA", vendor: "SAP", capability: "ERP", lifecycle: "invest", businessOwner: "Finance", itOwner: "Corporate IT", criticality: "critical", integration: "hub", annualCost: null })];

  it("applies the patch, records which fields, and moves the derivation with it", () => {
    const before = consolidate({ register })[0]!;
    expect(before.risk.factors.map((f) => f.key)).toContain("unbudgeted");

    const entries = consolidate({
      register,
      overrides: new Map([["app-001", { tool: "APP-001", patch: { annualCost: 1450000 }, fields: ["Annual cost"], by: "me@example.com", date: "2026-08-19" }]]),
    });
    expect(entries[0]!.annualCost).toBe(1450000);
    expect(entries[0]!.edited).toEqual(["Annual cost"]);
    expect(entries[0]!.editedBy).toBe("me@example.com");
    // The correction is what removes the finding — not a switch that hides it.
    expect(entries[0]!.risk.factors.map((f) => f.key)).not.toContain("unbudgeted");
    expect(budget(entries).total).toBe(1450000);
  });

  it("keeps the node id stable when the name is edited, so edits and edges survive", () => {
    const entries = consolidate({
      register: [],
      systems: [system({ system: "UNS broker", vendor: "HiveMQ", level: "L3" })],
      overrides: new Map([["uns-broker-hivemq", { tool: "uns-broker-hivemq", patch: { tool: "HiveMQ broker" }, fields: ["Name"], by: "me", date: "2026-08-19" }]]),
    });
    expect(entries[0]!.tool).toBe("HiveMQ broker");
    expect(entries[0]!.node).toBe("uns-broker-hivemq");
  });
});

describe("risk decisions — accepted, or added by hand", () => {
  const register = [tool({ id: "APP-009", tool: "Personio", capability: "HRIS", lifecycle: "eliminate", integration: "isolated", businessOwner: "HR Europe", itOwner: "", users: 60, criticality: "standard", annualCost: 21000 })];

  it("an accepted factor stops counting and stays on the record", () => {
    const before = consolidate({ register })[0]!;
    const island = before.risk.factors.find((f) => f.key === "island")!;

    const after = consolidate({
      register,
      adjustments: [{ tool: "APP-009", action: "accept", factor: "island", weight: 0, reason: "Export is a monthly manual step by design.", by: "hr@example.com", date: "2026-08-19" }],
    })[0]!;

    expect(after.risk.score).toBe(before.risk.score - island.weight);
    expect(after.risk.factors.map((f) => f.key)).not.toContain("island");
    // Not deleted — an accepted risk that vanishes is a hidden risk.
    expect(after.risk.accepted.map((f) => f.key)).toEqual(["island"]);
    expect(after.risk.accepted[0]!.reason).toContain("monthly manual step");
    expect(after.risk.accepted[0]!.by).toBe("hr@example.com");
  });

  it("a hand-added risk counts, and says it was added", () => {
    const after = consolidate({
      register,
      adjustments: [{ tool: "APP-009", action: "add", factor: "Out of support 2027", weight: 20, reason: "Vendor announced end of life.", by: "it@example.com", date: "2026-08-19" }],
    })[0]!;
    const added = after.risk.factors.find((f) => f.manual)!;
    expect(added.weight).toBe(20);
    expect(added.label).toContain("Out of support 2027");
    expect(added.label).toContain("end of life");
  });

  it("addresses adjustments by node id, so a tool with no register id can be decided about too", () => {
    const entries = consolidate({
      register: [],
      systems: [system({ system: "UNS broker", vendor: "HiveMQ", level: "L3", iface: "none", integration: "none" })],
      adjustments: [{ tool: "uns-broker-hivemq", action: "accept", factor: "unreadable", weight: 0, reason: "Broker is write-only by design.", by: "ops", date: "2026-08-19" }],
    });
    expect(entries[0]!.risk.accepted.map((f) => f.key)).toEqual(["unreadable"]);
  });

  it("ignores a decision about a factor the tool does not have", () => {
    const after = consolidate({
      register,
      adjustments: [{ tool: "APP-009", action: "accept", factor: "not-a-factor", weight: 0, reason: "x", by: "y", date: "z" }],
    })[0]!;
    expect(after.risk.accepted).toEqual([]);
    expect(after.risk.score).toBe(consolidate({ register })[0]!.risk.score);
  });
});
