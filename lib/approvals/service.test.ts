/**
 * The approval queue: what may be proposed, who may decide, and what a decision
 * does. The properties under test are the governance ones — a queue that can be
 * talked into running a gate, or into running an action its approver could not
 * have run, would be worse than no queue at all.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolRegistry, ToolRegistrationError, type AgentTool } from "../agent/tools.js";
import { propose, decide, canDecide, listPending, listDecided, getProposal } from "./service.js";
import { ProposalError, assertProposable, isProposalId, newProposalId } from "./model.js";
import type { Session } from "../rbac.js";

const forum: Session = { user: "forum@example.com", roles: ["portfolio_forum"], scopes: [] };
const requester: Session = { user: "rex@example.com", roles: ["requester"], scopes: [] };
const triage: Session = { user: "tri@example.com", roles: ["triage"], scopes: [] };
const admin: Session = { user: "root@example.com", roles: ["admin"], scopes: [] };

/** An acting tool that records the session it ran under. */
function actingTool(over: Partial<AgentTool> = {}) {
  const ran: Session[] = [];
  const tool: AgentTool<{ useCaseId: string }, string> = {
    name: "start-poc",
    description: "scaffolds a repo",
    capability: "create_uc",
    effect: "write",
    run: (input, ctx) => {
      ran.push(ctx.session);
      return `scaffolded ${input.useCaseId}`;
    },
    ...(over as object),
  } as AgentTool<{ useCaseId: string }, string>;
  return { tool, ran };
}

function registryWith(tool: AgentTool): ToolRegistry {
  return new ToolRegistry().register(tool);
}

const base = (registry: ToolRegistry, session: Session = requester) => ({
  registry,
  session,
  dept: "operations",
  lane: "poc-intake",
  authority: "execute-with-approval" as const,
  tool: "start-poc",
  input: { useCaseId: "UC-2026-0041" },
  preview: "Scaffold uc-2026-0041-vision-check from the python-streamlit template",
  basis: "The demand reached S4 and names a stack",
});

let dir: string;
let opts: { env: Record<string, string | undefined>; baseDir: string };
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "approvals-"));
  opts = { env: {}, baseDir: dir };
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("what may be proposed", () => {
  it("queues an acting tool with its basis and the run it came from", async () => {
    const { tool } = actingTool();
    const p = await propose({ ...base(registryWith(tool)), traceId: "trace-chat-UC-2026-0041" }, opts);
    expect(p.status).toBe("pending");
    expect(p.capability).toBe("create_uc");
    expect(p.traceId).toBe("trace-chat-UC-2026-0041");
    expect(isProposalId(p.id)).toBe(true);
  });

  it("refuses a tool that only reads — approving it would change nothing", async () => {
    const { tool } = actingTool({ effect: "read" });
    await expect(propose(base(registryWith(tool)), opts)).rejects.toThrow(/only reads/);
  });

  it("refuses an unregistered tool, so a name cannot conjure an action", async () => {
    const { tool } = actingTool();
    await expect(propose({ ...base(registryWith(tool)), tool: "merge-everything" }, opts)).rejects.toThrow(ProposalError);
  });

  it("refuses an action with no basis", async () => {
    const { tool } = actingTool();
    await expect(propose({ ...base(registryWith(tool)), basis: "  " }, opts)).rejects.toThrow(/needs a basis/);
  });

  it("stores nothing when it refuses", async () => {
    const { tool } = actingTool({ effect: "read" });
    await propose(base(registryWith(tool)), opts).catch(() => undefined);
    expect(await listPending(10, opts)).toEqual([]);
  });

  /** The invariant this queue inherits, checked from both ends. */
  it("cannot carry a gate, a merge or any other human decision", () => {
    const gateTool = { name: "pass-gate", description: "x", capability: "gate_pass", effect: "write", run: () => "" } as AgentTool;
    // The registry refuses such a tool outright (constraint #2)…
    expect(() => new ToolRegistry().register(gateTool)).toThrow(ToolRegistrationError);
    // …and the proposal check refuses it too, for the day the first line changes.
    expect(() => assertProposable(gateTool, "pass-gate")).toThrow(/forbidden capability/);
  });
});

describe("who may decide", () => {
  it("needs `decide_proposal` — a requester who could run the action still cannot approve it", async () => {
    const { tool } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    expect(canDecide(requester, p, registry)).toBe(false); // holds create_uc, not decide_proposal
    expect(canDecide(triage, p, registry)).toBe(false); // holds decide_proposal, not create_uc
    expect(canDecide(admin, p, registry)).toBe(true);
  });

  it("refuses the decision itself, not merely the button", async () => {
    const { tool, ran } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    await expect(decide({ id: p.id, decision: "approve", session: triage, registry }, opts)).rejects.toThrow(/may not decide/);
    expect(ran).toEqual([]); // nothing ran
    expect((await getProposal(p.id, opts))!.status).toBe("pending");
  });
});

describe("deciding", () => {
  it("runs the action under the APPROVER's session, never the proposer's", async () => {
    const { tool, ran } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry, requester), opts);
    const result = await decide({ id: p.id, decision: "approve", session: admin, registry }, opts);
    expect(result.output).toBe("scaffolded UC-2026-0041");
    expect(ran).toHaveLength(1);
    expect(ran[0]!.user).toBe("root@example.com"); // not rex@, who proposed it
    expect(result.proposal.decidedBy).toBe("root@example.com");
  });

  it("records a rejection with its reason and runs nothing", async () => {
    const { tool, ran } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    const { proposal } = await decide({ id: p.id, decision: "reject", reason: "wrong stack for this plant", session: admin, registry }, opts);
    expect(proposal.status).toBe("rejected");
    expect(proposal.reason).toBe("wrong stack for this plant");
    expect(ran).toEqual([]);
  });

  it("will not take a rejection without a reason", async () => {
    const { tool } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    await expect(decide({ id: p.id, decision: "reject", session: admin, registry }, opts)).rejects.toThrow(/needs a reason/);
    expect((await getProposal(p.id, opts))!.status).toBe("pending");
  });

  it("is made once — a decided proposal cannot be decided again", async () => {
    const { tool } = actingTool();
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    await decide({ id: p.id, decision: "approve", session: admin, registry }, opts);
    await expect(decide({ id: p.id, decision: "reject", reason: "changed my mind", session: admin, registry }, opts))
      .rejects.toThrow(/already approved/);
  });

  it("keeps the yes on the record when the action fails", async () => {
    const { tool } = actingTool({
      run: () => {
        throw new Error("GitHub is unreachable");
      },
    });
    const registry = registryWith(tool);
    const p = await propose(base(registry), opts);
    const { proposal } = await decide({ id: p.id, decision: "approve", session: admin, registry }, opts);
    expect(proposal.status).toBe("failed");
    expect(proposal.error).toBe("GitHub is unreachable");
    expect(proposal.decidedBy).toBe("root@example.com");
  });

  it("refuses an unknown or malformed id rather than inventing one", async () => {
    const { tool } = actingTool();
    const registry = registryWith(tool);
    await expect(decide({ id: "../../etc/passwd", decision: "approve", session: admin, registry }, opts)).rejects.toThrow(/No proposal/);
    await expect(decide({ id: newProposalId(), decision: "approve", session: admin, registry }, opts)).rejects.toThrow(/No proposal/);
  });
});

describe("the queue", () => {
  it("works oldest first, and a decided item leaves it", async () => {
    const { tool } = actingTool();
    const registry = registryWith(tool);
    const a = await propose({ ...base(registry), at: new Date("2026-09-22T08:00:00Z") }, opts);
    const b = await propose({ ...base(registry), at: new Date("2026-09-22T09:00:00Z") }, opts);
    expect((await listPending(10, opts)).map((p) => p.id)).toEqual([a.id, b.id]);

    await decide({ id: a.id, decision: "reject", reason: "superseded", session: admin, registry }, opts);
    expect((await listPending(10, opts)).map((p) => p.id)).toEqual([b.id]);
    expect((await listDecided(10, opts)).map((p) => p.id)).toEqual([a.id]);
  });

  it("reads back empty rather than throwing when the store is unreachable", async () => {
    expect(await listPending(10, { env: { KV_REST_API_URL: "http://127.0.0.1:1", KV_REST_API_TOKEN: "t" } })).toEqual([]);
  });
});
