"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Deciding about a tool's risk.
 *
 * The score stays derived — there is no field here to type a number over it,
 * because a rating somebody can lower is a rating nobody can trust. What a person
 * decides is recorded instead:
 *
 *   accept  a derived factor is known and accepted. It stops counting and STAYS on
 *           the page, with the reason and the name behind it.
 *   add     a risk the register cannot derive (end of support, an audit finding, a
 *           vendor in trouble), with its own weight.
 *
 * A reason is required for both: an accepted risk with no reason is a hidden risk.
 * Both write a row to `landscape/risk.md` in git.
 */

const MAX_WEIGHT = 40;

export function RiskDecision({
  node,
  label,
  factors,
  /** Skip the "adjust" step — for callers that ARE the risk view already. */
  defaultOpen = false,
}: {
  node: string;
  label: string;
  /** The derived factors currently counting on this tool. */
  factors: { key: string; label: string }[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [action, setAction] = useState<"accept" | "add">(factors.length > 0 ? "accept" : "add");
  const [factor, setFactor] = useState(factors[0]?.key ?? "");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("10");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || reason.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/landscape/risk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: node,
          action,
          factor: action === "accept" ? factor : name,
          weight: Number(weight),
          reason,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReason("");
      setName("");
      setOpen(defaultOpen);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground" title={`Decide about ${label}'s risk`}>
        adjust
      </button>
    );
  }

  const input = "h-8 rounded-md border bg-background px-2 text-xs";
  return (
    <div className={defaultOpen ? "mt-2 border-t pt-2" : "mt-1 w-64 rounded-md border bg-card p-2.5"}>
      <div className="mb-2 flex gap-1 text-xs">
        {(["accept", "add"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            disabled={a === "accept" && factors.length === 0}
            className={`rounded-md border px-2 py-0.5 disabled:opacity-40 ${action === a ? "bg-foreground text-background" : "hover:border-foreground/40"}`}
          >
            {a === "accept" ? "Accept a factor" : "Add a risk"}
          </button>
        ))}
      </div>

      {action === "accept" ? (
        <select value={factor} onChange={(e) => setFactor(e.target.value)} className={`${input} mb-2 w-full`}>
          {factors.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      ) : (
        <div className="mb-2 flex gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Out of support in 2027"
            className={`${input} w-full`}
          />
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            inputMode="numeric"
            title={`Weight, 1…${MAX_WEIGHT}`}
            className={`${input} w-14`}
          />
        </div>
      )}

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={action === "accept" ? "Why is this accepted?" : "Why does this count?"}
        className={`${input} mb-2 w-full`}
      />

      {error ? <p className="mb-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || reason.trim() === "" || (action === "add" && name.trim() === "")}
          className="h-8 rounded-md border bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Record"}
        </button>
        {defaultOpen ? null : (
          <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/** Take a decision back — the factor returns to counting as derived. */
export function UndoRiskDecision({ node, factor }: { node: string; factor: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/landscape/risk", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tool: node, factor }),
        }).catch(() => undefined);
        setBusy(false);
        router.refresh();
      }}
      className="text-[10px] text-muted-foreground underline hover:text-foreground disabled:opacity-50"
    >
      undo
    </button>
  );
}
