import { describe, expect, it } from "vitest";
import {
  agentToolsEnabled,
  ToolRegistrationError,
  ToolRegistry,
  type AgentTool,
} from "./tools.js";
import { createDefaultRegistry } from "./registry.js";
import type { Session } from "../rbac.js";

const noopRun = () => ({});

function tool(name: string, capability: AgentTool["capability"]): AgentTool {
  return { name, description: name, capability, run: noopRun };
}

describe("ToolRegistry invariants (constraint #2)", () => {
  it("rejects a tool that requires gate_pass", () => {
    const reg = new ToolRegistry();
    expect(() => reg.register(tool("sneaky-gate", "gate_pass"))).toThrow(ToolRegistrationError);
  });

  it("rejects kill, park, accept_handover, reprioritize, assign_lane, and all", () => {
    const reg = new ToolRegistry();
    for (const cap of ["kill", "park", "accept_handover", "reprioritize", "assign_lane", "all"] as const) {
      expect(() => reg.register(tool(`t-${cap}`, cap))).toThrow(ToolRegistrationError);
    }
  });

  it("accepts read/draft/comment tools", () => {
    const reg = new ToolRegistry();
    expect(() => reg.register(tool("q", "view_board"))).not.toThrow();
    expect(() => reg.register(tool("d", "draft"))).not.toThrow();
    expect(() => reg.register(tool("c", "comment"))).not.toThrow();
  });

  it("rejects duplicate names", () => {
    const reg = new ToolRegistry().register(tool("dup", "draft"));
    expect(() => reg.register(tool("dup", "comment"))).toThrow(ToolRegistrationError);
  });

  it("the DEFAULT registry contains no gate/merge tool", () => {
    const reg = createDefaultRegistry();
    for (const t of reg.all()) {
      expect(["gate_pass", "kill", "park", "accept_handover", "reprioritize", "assign_lane", "all"]).not.toContain(
        t.capability,
      );
    }
  });
});

describe("session-scoped tool resolution + kill switch (constraint #3, FR-6.6)", () => {
  const reg = createDefaultRegistry();
  const requester: Session = { user: "r@example.com", roles: ["requester"], scopes: [] };
  const forum: Session = { user: "f@example.com", roles: ["portfolio_forum"], scopes: [] };

  it("offers a tool only to sessions that hold its capability", () => {
    // requester has view_board + draft → both tools; forum has view_board but not draft.
    const forRequester = reg.resolveFor(requester, { enabled: true }).map((t) => t.name);
    expect(forRequester).toContain("portfolio-query");
    expect(forRequester).toContain("simulate-value");

    const forForum = reg.resolveFor(forum, { enabled: true }).map((t) => t.name);
    expect(forForum).toContain("portfolio-query");
    expect(forForum).not.toContain("simulate-value"); // forum lacks draft
  });

  it("the kill switch removes every tool at once", () => {
    expect(reg.resolveFor(requester, { enabled: false })).toHaveLength(0);
  });
});

describe("autonomy narrows acting tools (constraint #3 — withhold only, never widen)", () => {
  const reg = new ToolRegistry()
    .register({ name: "reader", description: "reads", capability: "view_board", run: noopRun })
    .register({ name: "writer", description: "acts", capability: "draft", effect: "write", run: noopRun });
  const admin: Session = { user: "a@example.com", roles: ["admin"], scopes: [] }; // holds every capability
  const forum: Session = { user: "f@example.com", roles: ["portfolio_forum"], scopes: [] }; // view_board, NOT draft

  it("a non-acting rung withholds write tools but keeps read tools", () => {
    for (const rung of ["read-only", "draft", "recommend"] as const) {
      const names = reg.resolveFor(admin, { enabled: true, authority: rung }).map((t) => t.name);
      expect(names, rung).toContain("reader");
      expect(names, rung).not.toContain("writer");
    }
  });

  it("an acting rung offers the write tool", () => {
    for (const rung of ["execute-with-approval", "execute-autonomously"] as const) {
      const names = reg.resolveFor(admin, { enabled: true, authority: rung }).map((t) => t.name);
      expect(names, rung).toContain("writer");
    }
  });

  it("no lane scope leaves RBAC alone (today's portfolio behaviour)", () => {
    const names = reg.resolveFor(admin, { enabled: true }).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["reader", "writer"]));
  });

  it("never widens beyond the session's capabilities, even at an acting rung", () => {
    const names = reg.resolveFor(forum, { enabled: true, authority: "execute-autonomously" }).map((t) => t.name);
    expect(names).toContain("reader");
    expect(names).not.toContain("writer"); // acting rung, but the session lacks `draft`
  });
});

describe("agentToolsEnabled", () => {
  it("defaults on, and reads off/false/0 as disabled", () => {
    expect(agentToolsEnabled({})).toBe(true);
    expect(agentToolsEnabled({ AGENT_TOOLS: "on" })).toBe(true);
    expect(agentToolsEnabled({ AGENT_TOOLS: "off" })).toBe(false);
    expect(agentToolsEnabled({ AGENT_TOOLS: "false" })).toBe(false);
    expect(agentToolsEnabled({ AGENT_TOOLS: "0" })).toBe(false);
  });
});
