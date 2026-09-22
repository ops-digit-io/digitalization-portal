import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { listPending, listDecided, canDecide } from "@/lib/approvals/service";
import { approvalsDurable, DECIDED_RETENTION_DAYS } from "@/lib/approvals/store";
import { createDefaultRegistry } from "@/lib/agent/registry";
import { makeStartPocTool } from "@/lib/agent/tools/start-poc";
import { loadPortfolioRows } from "@/lib/portfolio";
import { authorityPolicy } from "@/lib/org/autonomy";
import { Card } from "@/components/ui/card";
import { DecideActions } from "./decide-actions";
import type { Proposal } from "@/lib/approvals/model";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<Proposal["status"], string> = {
  pending: "bg-info/10 text-info",
  approved: "bg-ok/10 text-ok",
  rejected: "bg-secondary text-muted-foreground",
  failed: "bg-warn/10 text-warn",
};

function when(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** One queued action: what it would do, on what basis, and who prepared it. */
function PendingCard({ p, decidable }: { p: Proposal; decidable: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border px-1.5 py-0.5 font-mono text-xs">{p.tool}</span>
        <span className="text-sm font-medium">
          {p.dept} · {p.lane}
        </span>
        <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn">
          {authorityPolicy(p.authority).label}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{when(p.createdAt)}</span>
      </div>

      <p className="mt-2 text-sm">{p.preview}</p>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">Basis</dt>
          <dd className="text-muted-foreground">{p.basis}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">Prepared</dt>
          <dd className="text-muted-foreground">
            by {p.proposedBy}
            {p.traceId && (
              <>
                {" · "}
                <Link href={`/admin/traces?id=${p.traceId}`} className="underline">
                  see the run
                </Link>
              </>
            )}
          </dd>
        </div>
      </dl>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">The exact call</summary>
        <pre className="mt-1.5 overflow-auto whitespace-pre-wrap break-words rounded bg-secondary/50 p-2 text-xs">
          {JSON.stringify(p.input, null, 2)}
        </pre>
      </details>

      <div className="mt-3 border-t pt-3">
        <DecideActions id={p.id} canDecide={decidable} />
      </div>
    </Card>
  );
}

/**
 * The approval inbox (N2) — where an agent's prepared actions wait for a human.
 *
 * The fourth rung of the autonomy ladder says "prepares the real action, but it
 * waits for your yes". This is the waiting place, and without it that rung was a
 * word rather than a mechanism.
 *
 * Deciding needs `decide_proposal` AND the action's own capability, because
 * approving RUNS the action under the approver's session: approval is never a
 * way to reach further than you already could (constraint #3). Nothing here
 * merges or passes a gate — a proposal may only name a registered acting tool,
 * and no such tool may hold those capabilities (constraint #2).
 */
export default async function ApprovalsPage() {
  const session = await getSession();
  if (!can(session, "view_board")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Approvals</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need portal access to see the approval queue.</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">← Home</Link>
      </main>
    );
  }

  const { rows } = await loadPortfolioRows();
  const registry = createDefaultRegistry().register(makeStartPocTool(rows));
  const [pending, decided] = await Promise.all([listPending(50), listDecided(25)]);
  const durable = approvalsDurable();

  return (
    <main className="mx-auto max-w-[900px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Approvals</span>
      </nav>

      <h1 className="text-lg font-semibold">Approvals</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Actions an agent has prepared in a lane that acts only with a human yes. Approving runs the
        action under <em>your</em> authority, so you can only approve what you could have done yourself.
        Rejecting asks for a reason — that is what the lane&rsquo;s owner learns from.
      </p>

      {!durable && (
        <Card className="mt-5 border-warn/30 bg-warn/5 p-4 text-sm">
          <span className="font-medium">The queue needs a durable store.</span> Without KV it is written to local
          disk, which a serverless deployment discards between invocations — a decision somebody is waiting to make
          would silently vanish. Set <code className="rounded border px-1 py-0.5">KV_REST_API_URL</code> and{" "}
          <code className="rounded border px-1 py-0.5">KV_REST_API_TOKEN</code>.
        </Card>
      )}

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Waiting ({pending.length})
      </h2>

      {pending.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nothing is waiting. Actions appear here when a lane at{" "}
          <span className="font-medium">{authorityPolicy("execute-with-approval").label}</span> prepares one —{" "}
          <Link href="/org" className="underline">Department OS</Link> is where a lane&rsquo;s rung is set.
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <PendingCard key={p.id} p={p} decidable={canDecide(session, p, registry)} />
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Decided
      </h2>
      {decided.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No decisions yet. They are kept for {DECIDED_RETENTION_DAYS} days — the record a lane&rsquo;s promotion up the
          ladder gets argued from.
        </Card>
      ) : (
        <Card className="divide-y p-0">
          {decided.map((p) => (
            <div key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[p.status]}`}>{p.status}</span>
                <span className="rounded border px-1.5 py-0.5 font-mono text-xs">{p.tool}</span>
                <span className="text-muted-foreground">{p.dept} · {p.lane}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {p.decidedBy} · {p.decidedAt ? when(p.decidedAt) : "—"}
                </span>
              </div>
              {p.reason && <p className="mt-1 text-sm text-muted-foreground">“{p.reason}”</p>}
              {p.error && <p className="mt-1 text-sm text-warn">Failed when it ran: {p.error}</p>}
            </div>
          ))}
        </Card>
      )}
    </main>
  );
}
