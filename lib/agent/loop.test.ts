import { describe, expect, it } from "vitest";
import { runAgent } from "./loop.js";
import { OfflineProvider } from "./provider.js";
import { createDefaultRegistry } from "./registry.js";
import { makeImplementationAnalysisTool } from "./tools/implementation-analysis.js";
import { factsBlock } from "./prompt.js";
import type { Session } from "../rbac.js";
import type { RegistryRow } from "../registry.js";

const requester: Session = { user: "r@example.com", roles: ["requester"], scopes: [] };
const forum: Session = { user: "f@example.com", roles: ["portfolio_forum"], scopes: [] };
const NOW = "2026-05-19T00:00:00Z";

const rows: RegistryRow[] = [
  { id: "UC-1", title: "A", stage: "S4", status: "active", level: "L2", heat: "medium", valueProjected: 180000, since: "2026-04-02" },
];

describe("runAgent with the offline provider", () => {
  it("runs the simulate-value tool end-to-end and returns a summary", async () => {
    const registry = createDefaultRegistry();
    const res = await runAgent({
      session: requester,
      provider: new OfflineProvider(),
      registry,
      system: "test",
      userMessage:
        "Simulate the value band.\n" +
        factsBlock({ baseAnnualGross: 180000, assumptions: [{ name: "prop", sensitivity: 0.4, tested: false }] }),
      toolNames: ["simulate-value"],
      now: NOW,
      traceId: "t1",
    });
    expect(res.text.toLowerCase()).toMatch(/value band|indicative/);
    const toolCall = res.trace.steps.find((s) => s.kind === "tool_call");
    expect(toolCall?.label).toContain("simulate-value");
    const result = res.trace.steps.find((s) => s.kind === "tool_result");
    expect(result?.detail).toContain("P10");
  });

  it("records withheld tools when the session lacks the capability", async () => {
    // requester lacks view_all → but implementation-analysis needs view_board (has it).
    // Use a bound analysis tool and a session without view_board to force a withhold.
    const registry = createDefaultRegistry().register(makeImplementationAnalysisTool(rows));
    const noBoard: Session = { user: "x@example.com", roles: [], scopes: [] };
    const res = await runAgent({
      session: noBoard,
      provider: new OfflineProvider(),
      registry,
      system: "test",
      userMessage: "hi",
      toolNames: ["implementation-analysis"],
      now: NOW,
      traceId: "t2",
    });
    expect(res.trace.toolsOffered).not.toContain("implementation-analysis");
    expect(res.trace.toolsWithheld.some((w) => w.name === "implementation-analysis")).toBe(true);
  });

  it("honours the kill switch: no tools offered when disabled", async () => {
    const registry = createDefaultRegistry();
    const res = await runAgent({
      session: forum,
      provider: new OfflineProvider(),
      registry,
      system: "test",
      userMessage: "analyse",
      enabled: false,
      now: NOW,
      traceId: "t3",
    });
    expect(res.trace.toolsOffered).toHaveLength(0);
    expect(res.trace.toolsWithheld.every((w) => w.reason.includes("kill switch"))).toBe(true);
  });
});
