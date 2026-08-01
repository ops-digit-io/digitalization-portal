import { describe, expect, it } from "vitest";
import { EXHAUSTED, runAgent } from "./loop.js";
import { OfflineProvider, type CompletionRequest, type ModelProvider, type ModelResponse, type ToolResultBlock } from "./provider.js";
import { ToolRegistry } from "./tools.js";
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

/** A provider that always asks for the tool, so the loop never ends on its own. */
class AlwaysCalls implements ModelProvider {
  readonly name = "stub";
  readonly live = true;
  readonly seen: CompletionRequest[] = [];
  constructor(private readonly tool: string) {}
  async complete(req: CompletionRequest): Promise<ModelResponse> {
    this.seen.push(structuredClone(req));
    const call = { id: `c${this.seen.length}`, name: this.tool, input: {} };
    return {
      text: "",
      toolCalls: [call],
      content: [
        { type: "thinking", thinking: "considering", signature: `sig-${this.seen.length}` },
        { type: "tool_use", id: call.id, name: call.name, input: call.input },
      ],
      stopReason: "tool_use",
      truncated: false,
      usage: { input: 1, output: 1 },
    };
  }
}

const anyone: Session = { user: "a@example.com", roles: ["requester"], scopes: [] };

function registryWith(run: () => unknown): ToolRegistry {
  return new ToolRegistry().register({
    name: "probe",
    description: "A tool for the test to drive.",
    capability: "view_own",
    run,
  });
}

async function drive(run: () => unknown, maxIterations = 2) {
  const provider = new AlwaysCalls("probe");
  const res = await runAgent({
    session: anyone,
    provider,
    registry: registryWith(run),
    system: "test",
    userMessage: "go",
    toolNames: ["probe"],
    maxIterations,
    now: NOW,
    traceId: "t",
  });
  const turns = provider.seen.at(-1)!.messages;
  return { res, turns };
}

describe("what the loop sends back to the model", () => {
  it("replays the assistant turn verbatim, thinking blocks included", async () => {
    // Rebuilding the turn from text + toolCalls loses the signed thinking block,
    // and the next request is then rejected — invisible until a model with
    // thinking on is configured, which is now the default.
    const { turns } = await drive(() => "ok");
    const assistant = turns.find((m) => m.role === "assistant")!;
    expect(Array.isArray(assistant.content)).toBe(true);
    expect((assistant.content as { type: string }[])[0]).toMatchObject({ type: "thinking", signature: "sig-1" });
  });

  it("marks a thrown tool as an error rather than passing the message off as a finding", async () => {
    const { turns } = await drive(() => {
      throw new Error("the register is unreachable");
    });
    const result = (turns.find((m) => m.role === "user" && Array.isArray(m.content))!.content as ToolResultBlock[])[0]!;
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("the register is unreachable");
  });

  it("marks an unavailable tool as an error too", async () => {
    const provider = new AlwaysCalls("not-registered");
    const res = await runAgent({
      session: anyone,
      provider,
      registry: registryWith(() => "ok"),
      system: "test",
      userMessage: "go",
      toolNames: ["probe"],
      maxIterations: 1,
      now: NOW,
      traceId: "t",
    });
    const blocks = provider.seen.at(-1)!.messages;
    expect(res.trace.steps.some((s) => s.kind === "error")).toBe(true);
    expect(blocks.length).toBe(1); // only one turn went out; the error lands in the next
  });

  it("does not mark a successful result as an error", async () => {
    const { turns } = await drive(() => ({ fine: true }));
    const result = (turns.find((m) => m.role === "user" && Array.isArray(m.content))!.content as ToolResultBlock[])[0]!;
    expect(result.is_error).toBeUndefined();
  });

  it("caps a runaway tool result and says that it cut it", async () => {
    // A tool that returns the world fills the context and evicts the
    // conversation it was supposed to inform. Cutting silently is worse.
    const { turns } = await drive(() => "x".repeat(60_000));
    const result = (turns.find((m) => m.role === "user" && Array.isArray(m.content))!.content as ToolResultBlock[])[0]!;
    expect(result.content.length).toBeLessThan(30_000);
    expect(result.content).toContain("truncated");
    expect(result.is_error).toBeUndefined(); // cut, not failed
  });
});

describe("when the loop runs out of steps", () => {
  it("says so instead of returning an empty answer", async () => {
    const { res } = await drive(() => "ok", 2);
    expect(res.text).toBe(EXHAUSTED);
    expect(res.trace.steps.some((s) => s.label === "max iterations reached")).toBe(true);
  });
});

describe("tool order is a property of the tools, not of the import graph", () => {
  it("is alphabetical, so the prompt-cache prefix does not move when a file is added", () => {
    const reg = new ToolRegistry();
    for (const name of ["zulu", "alpha", "mike"]) {
      reg.register({ name, description: "d", capability: "view_own", run: () => null });
    }
    expect(reg.all().map((t) => t.name)).toEqual(["alpha", "mike", "zulu"]);
  });
});
