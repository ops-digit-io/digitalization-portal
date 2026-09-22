/**
 * Proposals — what an agent has PREPARED and a human has not yet allowed (N2).
 *
 * `lib/org/autonomy.ts` defines the fourth rung as "prepares the real action, but
 * it waits for your yes". Until now there was nowhere for it to wait, so a lane at
 * `execute-with-approval` acted outright: the rung existed as a word and not as a
 * mechanism. A proposal is that waiting place.
 *
 * THE INVARIANT IS INHERITED, NOT RE-IMPLEMENTED. A proposal's action is an agent
 * tool, named — and `ToolRegistry.register` already refuses any tool bound to a
 * gate, merge, kill, park, handover, reprioritisation or `all` capability
 * (`FORBIDDEN_TOOL_CAPABILITIES`, constraint #2). A queue that could launder a
 * forbidden action past that check would make the registration invariant
 * worthless, so this module re-asserts it rather than assuming it: a proposal can
 * only ever name a tool that was allowed to exist, and the check is repeated here
 * where the consequence is visible.
 *
 * Only ACTING tools are proposable. Queuing a read for approval would be theatre —
 * nothing happens when the human says yes that could not have happened anyway.
 */

import { FORBIDDEN_TOOL_CAPABILITIES, toolActs, type AgentTool } from "../agent/tools.js";
import type { AuthorityLevel } from "../org/autonomy.js";

export const PROPOSAL_STATUSES = ["pending", "approved", "rejected", "failed"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface Proposal {
  id: string;
  createdAt: string;
  /** The Department OS lane the action was prepared in. */
  dept: string;
  lane: string;
  /** The lane's rung AS IT WAS when the action was prepared — an audit fact.
   *  Re-reading it at decision time would rewrite history if the lane moved. */
  authority: AuthorityLevel;
  /** The acting agent tool that will run, by name. */
  tool: string;
  /** The capability that tool requires — the approver must hold it too. */
  capability: string;
  /** Its input, exactly as it would be invoked. */
  input: unknown;
  /** What the human is being asked to allow, in plain words. */
  preview: string;
  /** Why the agent proposes it. An action with no stated basis is not decidable. */
  basis: string;
  /** The run this came out of (N1), so the basis can be inspected, not trusted. */
  traceId?: string;
  /** The session whose run prepared it. */
  proposedBy: string;
  status: ProposalStatus;
  decidedBy?: string;
  decidedAt?: string;
  /** Required on a rejection; the cheapest signal the portal collects about
   *  where an agent's judgement and the department's diverge. */
  reason?: string;
  /** Set when an approved action failed when it finally ran. */
  error?: string;
}

export class ProposalError extends Error {}

/**
 * The tool a proposal may name, or a throw. Called before anything is stored, so
 * an inadmissible proposal never reaches the queue in the first place.
 */
export function assertProposable(tool: AgentTool | undefined, name: string): AgentTool {
  if (!tool) {
    throw new ProposalError(`No such tool "${name}" — a proposal may only name a registered agent tool.`);
  }
  if (FORBIDDEN_TOOL_CAPABILITIES.has(tool.capability)) {
    // Unreachable through the registry, which refuses such a tool at registration.
    // Kept because the day it becomes reachable is the day it matters most.
    throw new ProposalError(
      `Tool "${name}" requires forbidden capability "${tool.capability}". ` +
        `No proposal may pass a gate, merge, or take a human decision (constraint #2).`,
    );
  }
  if (!toolActs(tool)) {
    throw new ProposalError(
      `Tool "${name}" only reads. Approving it would change nothing — read tools run directly.`,
    );
  }
  return tool;
}

/** A proposal is decided once. Re-deciding would overwrite an audit record. */
export function assertPending(p: Proposal): void {
  if (p.status !== "pending") {
    throw new ProposalError(`Proposal ${p.id} was already ${p.status} — a decision is made once.`);
  }
}

/** A rejection without a reason teaches nobody anything, so it is not allowed. */
export function assertReason(decision: "approve" | "reject", reason: string | undefined): void {
  if (decision === "reject" && !reason?.trim()) {
    throw new ProposalError("A rejection needs a reason — it is the signal the agent's owner learns from.");
  }
}

/** `2026-09-22-134501-a1b2c3` — sorts chronologically as a plain string. */
export function newProposalId(at: Date = new Date(), rand: () => string = () => Math.random().toString(36).slice(2, 8)): string {
  const iso = at.toISOString();
  return `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, "")}-${rand()}`;
}

/** Ids reach the filesystem and KV fields; accept only the shape we mint. */
export function isProposalId(id: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]{1,12}$/.test(id);
}
