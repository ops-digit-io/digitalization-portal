/**
 * Agent tool contract and registry — the central extensibility seam for the AI
 * layer (`docs/08-ai-architecture.md`, `docs/BUILD.md` constraints #2, #3).
 *
 * This is the contract established at M5 so that every later capability — a
 * portfolio query, a business-case simulation, a variance analysis — is added as
 * ONE registry entry, not a core change. Two invariants are enforced *here*, at
 * registration, so they cannot be violated by a later tool:
 *
 *   - **No tool passes a gate or merges** (constraint #2). A tool bound to a
 *     forbidden capability is rejected the moment it is registered — it is absent
 *     from every tool array, not permission-gated. There is no merge capability
 *     at all.
 *   - **Agent authority is the invoking session's authority** (constraint #3).
 *     A tool is only offered to a session that already holds its capability; the
 *     tool has no authority of its own.
 *
 * A single flag (`enabled`) removes every tool at once — the kill switch
 * (FR-6.6). In production it is driven by the `AGENT_TOOLS` env var.
 */

import { can, type Capability, type Session } from "../rbac.js";

/**
 * Capabilities a tool may NEVER require. These are human decisions (gate
 * passage, kill/park, handover acceptance, reprioritisation, lane assignment) or
 * privilege escalation (`all`). The agent proposes via a `draft` pull request; it
 * does not take these actions. Enforced at registration.
 */
export const FORBIDDEN_TOOL_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  "gate_pass",
  "kill",
  "park",
  "accept_handover",
  "reprioritize",
  "assign_lane",
  "all",
]);

export interface AgentToolContext {
  session: Session;
}

export interface AgentTool<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  /** The capability the invoking session must hold. Must not be forbidden. */
  capability: Capability;
  /** JSON Schema for the tool input, sent to the model as the tool definition. */
  inputSchema?: Record<string, unknown>;
  /** Pure-ish execution. Runs server-side only; never merges, never passes a gate. */
  run(input: Input, ctx: AgentToolContext): Promise<Output> | Output;
}

export class ToolRegistrationError extends Error {}

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  /**
   * Register a tool. Throws if the tool requires a forbidden capability or if the
   * name collides — so an attempt to add a gate/merge tool fails loudly at build
   * time rather than silently widening the agent's authority.
   */
  register<I, O>(tool: AgentTool<I, O>): this {
    if (FORBIDDEN_TOOL_CAPABILITIES.has(tool.capability)) {
      throw new ToolRegistrationError(
        `Tool "${tool.name}" requires forbidden capability "${tool.capability}". ` +
          `No agent tool may pass a gate, merge, or take a human decision (constraint #2).`,
      );
    }
    if (this.tools.has(tool.name)) {
      throw new ToolRegistrationError(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool as AgentTool);
    return this;
  }

  /** All registered tools, regardless of session — for inspection/tests. */
  all(): AgentTool[] {
    return [...this.tools.values()];
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * The tools offered to a session: those whose capability the session holds,
   * and only while the kill switch is on. When `enabled` is false the array is
   * empty — every tool disabled by one flag.
   */
  resolveFor(session: Session, options: { enabled: boolean }): AgentTool[] {
    if (!options.enabled) return [];
    return this.all().filter((t) => can(session, t.capability));
  }
}

/** Read the global kill switch from the environment (server-side). */
export function agentToolsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  // Default ON; any value other than an explicit "off"/"false"/"0" keeps tools on.
  const v = (env.AGENT_TOOLS ?? "on").trim().toLowerCase();
  return !(v === "off" || v === "false" || v === "0");
}
