/**
 * The tool landscape.
 *
 * The inventory is trivial and the findings are the product, so that is where
 * the tests are: a redundancy is only a redundancy under conditions worth
 * arguing about (is a tool being replaced still an overlap? is one under
 * evaluation?), and getting those conditions wrong makes the surface either
 * cry wolf or say nothing.
 */

import { describe, it, expect } from "vitest";
import {
  parseTools,
  redundancies,
  unowned,
  lifecycleDebt,
  islands,
  byCapability,
  byDomain,
  summariseTools,
  toolIntegrationRank,
  criticalityRank,
  isActive,
  isRetiring,
  LIFECYCLES,
  LIFECYCLE_MEANING,
  TOOL_INTEGRATIONS,
} from "./toolscape.js";

const HEAD =
  "| ID | Tool | Vendor | Capability | Domain | Scope | Hosting | Lifecycle | Integration | Business owner | IT owner | Users | Criticality | Notes |\n" +
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";

interface Opt {
  cap?: string;
  domain?: string;
  scope?: string;
  life?: string;
  integ?: string;
  biz?: string;
  it?: string;
  users?: string;
  crit?: string;
}
const row = (id: string, o: Opt = {}): string =>
  `| ${id} | ${id} tool | V | ${o.cap ?? "CRM"} | ${o.domain ?? "finance_admin"} | ${o.scope ?? "global"} | saas | ${o.life ?? "invest"} | ${o.integ ?? "api"} | ${o.biz ?? "Sales"} | ${o.it ?? "Corporate IT"} | ${o.users ?? "100"} | ${o.crit ?? "important"} |  |\n`;

describe("vocabulary", () => {
  it("ranks integration ordinally and an unreadable state at the bottom", () => {
    expect(TOOL_INTEGRATIONS.map(toolIntegrationRank)).toEqual([0, 1, 2, 3, 4]);
    expect(toolIntegrationRank("magic")).toBe(0);
  });

  it("ranks criticality with critical highest and unreadable lowest", () => {
    expect(criticalityRank("critical")).toBeGreaterThan(criticalityRank("standard"));
    expect(criticalityRank("nonsense")).toBe(0);
  });

  it("explains every lifecycle stage", () => {
    for (const l of LIFECYCLES) expect(LIFECYCLE_MEANING[l]).toBeTruthy();
  });

  it("counts a tool being replaced as still in service, and one under evaluation as not", () => {
    expect(isActive("migrate")).toBe(true);
    expect(isActive("eliminate")).toBe(true);
    expect(isActive("evaluate")).toBe(false);
    expect(isRetiring("migrate")).toBe(true);
    expect(isRetiring("invest")).toBe(false);
  });
});

describe("parseTools", () => {
  it("reads a well-formed row", () => {
    const [t] = parseTools(HEAD + row("APP-1"));
    expect(t).toMatchObject({ id: "APP-1", capability: "CRM", lifecycle: "invest", users: 100, needsAttention: false });
  });

  it("never throws on absent, empty or table-less input", () => {
    expect(parseTools(undefined)).toEqual([]);
    expect(parseTools("")).toEqual([]);
    expect(parseTools("# Prose only, no table")).toEqual([]);
  });

  it("KEEPS a row with no capability and says why it cannot take part in a finding", () => {
    const [t] = parseTools(HEAD + row("APP-1", { cap: "" }));
    expect(t!.needsAttention).toBe(true);
    expect(t!.issues.join(" ")).toContain("cannot be compared");
  });

  it("keeps and marks unreadable enumerations without losing the rest of the row", () => {
    const [t] = parseTools(HEAD + row("APP-1", { scope: "everywhere", life: "someday", integ: "vibes", crit: "very" }));
    expect(t!.needsAttention).toBe(true);
    expect([t!.scope, t!.lifecycle, t!.integration, t!.criticality]).toEqual(["", "", "", ""]);
    expect(t!.tool).toBe("APP-1 tool");
  });

  it("reads a user count with separators, and marks one it cannot read", () => {
    expect(parseTools(HEAD + row("APP-1", { users: "4 200" }))[0]!.users).toBe(4200);
    expect(parseTools(HEAD + row("APP-2", { users: "1,800" }))[0]!.users).toBe(1800);
    const bad = parseTools(HEAD + row("APP-3", { users: "lots" }))[0]!;
    expect(bad.users).toBeNull();
    expect(bad.needsAttention).toBe(true);
  });

  it("treats an empty user count as unknown rather than zero", () => {
    const [t] = parseTools(HEAD + row("APP-1", { users: "" }));
    expect(t!.users).toBeNull();
    expect(t!.issues.join(" ")).not.toContain("user count");
  });
});

describe("redundancies — the consolidation case", () => {
  it("finds two tools serving one capability", () => {
    const r = redundancies(parseTools(HEAD + row("A", { cap: "BI" }) + row("B", { cap: "BI", life: "tolerate" })));
    expect(r).toHaveLength(1);
    expect(r[0]!.capability).toBe("BI");
    expect(r[0]!.users).toBe(200);
  });

  it("does NOT report a capability served by one tool", () => {
    expect(redundancies(parseTools(HEAD + row("A", { cap: "ERP" })))).toEqual([]);
  });

  it("EXCLUDES a tool under evaluation — that is the process working, not an overlap", () => {
    expect(redundancies(parseTools(HEAD + row("A", { cap: "BI" }) + row("B", { cap: "BI", life: "evaluate" })))).toEqual([]);
  });

  it("INCLUDES a tool being replaced — a migration that never finished is the overlap worth seeing", () => {
    const r = redundancies(parseTools(HEAD + row("A", { cap: "CRM" }) + row("B", { cap: "CRM", life: "migrate" })));
    expect(r).toHaveLength(1);
  });

  it("names the single invest tool as the consolidation target", () => {
    const r = redundancies(
      parseTools(HEAD + row("A", { cap: "BI", life: "invest" }) + row("B", { cap: "BI", life: "migrate" })),
    );
    expect(r[0]!.target?.id).toBe("A");
    expect(r[0]!.undecided).toBe(false);
  });

  it("flags an overlap with NO invest tool as undecided — nobody has picked a winner", () => {
    const r = redundancies(
      parseTools(HEAD + row("A", { cap: "BI", life: "tolerate" }) + row("B", { cap: "BI", life: "tolerate" })),
    );
    expect(r[0]!.undecided).toBe(true);
    expect(r[0]!.target).toBeUndefined();
  });

  it("gives no target when two tools both claim invest — that is a decision, not a default", () => {
    const r = redundancies(parseTools(HEAD + row("A", { cap: "BI" }) + row("B", { cap: "BI" })));
    expect(r[0]!.target).toBeUndefined();
    expect(r[0]!.undecided).toBe(false);
  });

  it("orders by affected users, not by tool count", () => {
    const md =
      HEAD +
      row("A", { cap: "small" }) + row("B", { cap: "small" }) + row("C", { cap: "small" }) +
      row("D", { cap: "big", users: "2000" }) + row("E", { cap: "big", users: "2000" });
    expect(redundancies(parseTools(md)).map((r) => r.capability)).toEqual(["big", "small"]);
  });

  it("ignores rows with no capability rather than grouping them together", () => {
    expect(redundancies(parseTools(HEAD + row("A", { cap: "" }) + row("B", { cap: "" })))).toEqual([]);
  });
});

describe("unowned — shadow IT, stated", () => {
  it("reports a tool with no IT owner", () => {
    const u = unowned(parseTools(HEAD + row("A", { it: "" })));
    expect(u).toHaveLength(1);
    expect(u[0]!.missing).toEqual(["IT"]);
  });

  it("puts a tool missing BOTH owners first", () => {
    const u = unowned(parseTools(HEAD + row("A", { it: "" }) + row("B", { biz: "", it: "" })));
    expect(u[0]!.tool.id).toBe("B");
    expect(u[0]!.missing).toEqual(["business", "IT"]);
  });

  it("orders by criticality once the missing count ties", () => {
    const u = unowned(parseTools(HEAD + row("A", { it: "", crit: "low" }) + row("B", { it: "", crit: "critical" })));
    expect(u.map((x) => x.tool.id)).toEqual(["B", "A"]);
  });

  it("ignores a tool that is not in service", () => {
    expect(unowned(parseTools(HEAD + row("A", { it: "", life: "evaluate" })))).toEqual([]);
  });
});

describe("lifecycleDebt — decided to go, still load-bearing", () => {
  it("reports an eliminate row that is still business-critical", () => {
    const d = lifecycleDebt(parseTools(HEAD + row("A", { life: "eliminate", crit: "critical", users: "10" })));
    expect(d).toHaveLength(1);
    expect(d[0]!.reason).toContain("still business-critical");
  });

  it("reports a migrate row that still carries many users", () => {
    const d = lifecycleDebt(parseTools(HEAD + row("A", { life: "migrate", crit: "standard", users: "500" })));
    expect(d[0]!.reason).toContain("500 users");
  });

  it("does NOT report a small eliminate row — that is housekeeping, not debt", () => {
    expect(lifecycleDebt(parseTools(HEAD + row("A", { life: "eliminate", crit: "standard", users: "3" })))).toEqual([]);
  });

  it("does not report a tool nobody decided against", () => {
    expect(lifecycleDebt(parseTools(HEAD + row("A", { life: "invest", crit: "critical", users: "9000" })))).toEqual([]);
  });
});

describe("islands — no integration under real load", () => {
  it("reports an isolated critical tool", () => {
    expect(islands(parseTools(HEAD + row("A", { integ: "isolated", crit: "critical" }))).map((t) => t.id)).toEqual(["A"]);
  });

  it("ignores an isolated tool nobody depends on", () => {
    expect(islands(parseTools(HEAD + row("A", { integ: "isolated", crit: "low" })))).toEqual([]);
  });

  it("ignores a critical tool that is integrated", () => {
    expect(islands(parseTools(HEAD + row("A", { integ: "hub", crit: "critical" })))).toEqual([]);
  });
});

describe("rollups", () => {
  const md =
    HEAD +
    row("A", { cap: "BI", domain: "finance_admin", users: "1000" }) +
    row("B", { cap: "BI", domain: "finance_admin", users: "500", life: "tolerate" }) +
    row("C", { cap: "MES", domain: "production", users: "300", scope: "plant" });

  it("rolls up by capability, flags the redundant one and names its target", () => {
    const c = byCapability(parseTools(md));
    expect(c[0]).toMatchObject({ capability: "BI", tools: 2, users: 1500, redundant: true, target: "A tool" });
    expect(c[1]).toMatchObject({ capability: "MES", tools: 1, redundant: false });
  });

  it("records which scopes a capability is present at", () => {
    expect(byCapability(parseTools(md)).find((c) => c.capability === "MES")!.scopes).toEqual(["plant"]);
  });

  it("rolls up by domain, most-redundant first", () => {
    const d = byDomain(parseTools(md));
    expect(d[0]).toMatchObject({ domain: "finance_admin", tools: 2, capabilities: 1, redundancies: 1 });
    expect(d[1]!.redundancies).toBe(0);
  });

  it("returns null integration for a capability with nothing in service", () => {
    const c = byCapability(parseTools(HEAD + row("A", { cap: "X", life: "evaluate" })));
    expect(c[0]!.integration).toBeNull();
  });
});

describe("summariseTools", () => {
  it("counts the portfolio and every finding", () => {
    const md =
      HEAD +
      row("A", { cap: "BI", users: "1000" }) +
      row("B", { cap: "BI", users: "500", life: "eliminate", crit: "critical", integ: "isolated", it: "" }) +
      row("C", { cap: "ERP", users: "200", life: "evaluate" });
    expect(summariseTools(parseTools(md))).toMatchObject({
      tools: 3,
      active: 2,
      capabilities: 2,
      redundant: 1,
      redundantUsers: 1500,
      unowned: 1,
      debt: 1,
      islands: 1,
      needsAttention: 0,
    });
  });

  it("reports null integration for an empty portfolio rather than zero", () => {
    expect(summariseTools([]).integration).toBeNull();
  });
});
