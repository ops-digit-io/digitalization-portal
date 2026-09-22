/**
 * The approval flow: prepare, list, decide (N2).
 *
 * Three rules hold here, and each is one of the portal's constraints made
 * concrete rather than restated:
 *
 * 1. **The action runs under the APPROVER's authority, never the agent's.** On
 *    approval the tool is invoked with the approving session — the same
 *    `tool.run(input, { session })` the loop would have used — so the approval
 *    cannot launder an action past a capability its approver does not hold
 *    (constraint #3). Holding `decide_proposal` lets you empty the queue; it does
 *    not let you do things you could not otherwise do.
 * 2. **Nothing merges and no gate is passed.** Inherited structurally: a proposal
 *    may only name a registered acting tool, and such a tool cannot require a
 *    forbidden capability (`assertProposable`, constraints #1 and #2).
 * 3. **A decision is made once, and a rejection carries its reason.** Both are
 *    audit properties: an overwritable decision is not a record, and a rejection
 *    with no reason teaches the agent's owner nothing.
 */

import { can, type Session } from "../rbac.js";
import type { ToolRegistry } from "../agent/tools.js";
import type { AuthorityLevel } from "../org/autonomy.js";
import { getApprovalStore } from "./store.js";
import {
  assertPending,
  assertProposable,
  assertReason,
  isProposalId,
  newProposalId,
  ProposalError,
  type Proposal,
} from "./model.js";

export interface StoreOptions {
  env?: Record<string, string | undefined>;
  baseDir?: string;
}

export interface ProposeParams {
  registry: ToolRegistry;
  session: Session;
  dept: string;
  lane: string;
  authority: AuthorityLevel;
  tool: string;
  input: unknown;
  preview: string;
  basis: string;
  traceId?: string;
  at?: Date;
}

/**
 * Prepare an action and queue it. Throws (before anything is stored) when the
 * action is not one a proposal may carry — an inadmissible proposal never
 * reaches the queue, the way an inadmissible tool never reaches the registry.
 */
export async function propose(params: ProposeParams, opts: StoreOptions = {}): Promise<Proposal> {
  const tool = assertProposable(params.registry.get(params.tool), params.tool);
  if (!params.basis.trim()) {
    throw new ProposalError("A proposal needs a basis — an action nobody can weigh is not decidable.");
  }
  const at = params.at ?? new Date();
  const proposal: Proposal = {
    id: newProposalId(at),
    createdAt: at.toISOString(),
    dept: params.dept,
    lane: params.lane,
    authority: params.authority,
    tool: tool.name,
    capability: tool.capability,
    input: params.input,
    preview: params.preview,
    basis: params.basis,
    ...(params.traceId ? { traceId: params.traceId } : {}),
    proposedBy: params.session.user,
    status: "pending",
  };
  await getApprovalStore(opts.env ?? process.env, opts.baseDir).save(proposal);
  return proposal;
}

export async function listPending(limit?: number, opts: StoreOptions = {}): Promise<Proposal[]> {
  try {
    return await getApprovalStore(opts.env ?? process.env, opts.baseDir).listPending(limit);
  } catch {
    return [];
  }
}

export async function listDecided(limit?: number, opts: StoreOptions = {}): Promise<Proposal[]> {
  try {
    return await getApprovalStore(opts.env ?? process.env, opts.baseDir).listDecided(limit);
  } catch {
    return [];
  }
}

export async function getProposal(id: string, opts: StoreOptions = {}): Promise<Proposal | null> {
  if (!isProposalId(id)) return null;
  try {
    return await getApprovalStore(opts.env ?? process.env, opts.baseDir).get(id);
  } catch {
    return null;
  }
}

/** May this session decide this proposal? Two conditions, both necessary. */
export function canDecide(session: Session, proposal: Proposal, registry: ToolRegistry): boolean {
  if (!can(session, "decide_proposal")) return false;
  const tool = registry.get(proposal.tool);
  // The approver must hold the action's OWN capability: approval executes under
  // their authority, so it can never be a way to reach further than they can.
  return tool !== undefined && can(session, tool.capability);
}

export interface DecideParams {
  id: string;
  decision: "approve" | "reject";
  reason?: string;
  session: Session;
  registry: ToolRegistry;
  at?: Date;
}

export interface DecideResult {
  proposal: Proposal;
  /** The approved tool's own output, when it ran and succeeded. */
  output?: unknown;
}

/**
 * Decide one proposal. An approval RUNS the action; a rejection records why and
 * runs nothing. If the action throws, the proposal is stored `failed` with the
 * error rather than left pending: the human said yes, and that fact belongs in
 * the record even when what followed did not work.
 */
export async function decide(params: DecideParams, opts: StoreOptions = {}): Promise<DecideResult> {
  const { id, decision, session, registry } = params;
  const store = getApprovalStore(opts.env ?? process.env, opts.baseDir);
  const proposal = isProposalId(id) ? await store.get(id) : null;
  if (!proposal) throw new ProposalError(`No proposal ${id}.`);

  assertPending(proposal);
  assertReason(decision, params.reason);
  if (!canDecide(session, proposal, registry)) {
    throw new ProposalError(
      `This session may not decide ${id}: deciding needs "decide_proposal" and the action's own capability ("${proposal.capability}").`,
    );
  }

  const decidedAt = (params.at ?? new Date()).toISOString();
  const reason = params.reason?.trim();

  if (decision === "reject") {
    const rejected: Proposal = { ...proposal, status: "rejected", decidedBy: session.user, decidedAt, reason: reason! };
    await store.save(rejected);
    return { proposal: rejected };
  }

  const tool = registry.get(proposal.tool)!; // canDecide proved it resolves
  try {
    const output = await tool.run(proposal.input, { session });
    const approved: Proposal = {
      ...proposal,
      status: "approved",
      decidedBy: session.user,
      decidedAt,
      ...(reason ? { reason } : {}),
    };
    await store.save(approved);
    return { proposal: approved, output };
  } catch (err) {
    const failed: Proposal = {
      ...proposal,
      status: "failed",
      decidedBy: session.user,
      decidedAt,
      ...(reason ? { reason } : {}),
      error: err instanceof Error ? err.message : String(err),
    };
    await store.save(failed);
    return { proposal: failed };
  }
}
