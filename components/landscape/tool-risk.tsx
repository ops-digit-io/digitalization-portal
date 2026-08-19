"use client";

import { useState } from "react";
import { RiskDecision, UndoRiskDecision } from "./risk-decision";

/**
 * A tool's risk, opened from its score.
 *
 * The risk table at the top of the page shows the worst twelve. Every other tool
 * needs the same reach, and one case makes it necessary rather than nice: accept
 * every factor on a tool and its score goes to zero, so it leaves the risk table —
 * and with it went the only place the acceptance could be seen or undone. Here the
 * score itself is the affordance, on every row of the register: click it and the
 * factors, the decisions and the way to change them are all in one place.
 */

export interface RiskFactorView {
  key: string;
  label: string;
  weight: number;
  manual?: boolean;
}

export interface AcceptedView extends RiskFactorView {
  reason: string;
  by: string;
  date: string;
}

export function ToolRisk({
  node,
  label,
  score,
  tone,
  factors,
  accepted,
  canDecide,
}: {
  node: string;
  label: string;
  score: number;
  /** The band's chip classes, so the closed state looks like every other chip. */
  tone: string;
  factors: RiskFactorView[];
  accepted: AcceptedView[];
  canDecide: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={`${label}: ${factors.length} factor(s)${accepted.length > 0 ? `, ${accepted.length} accepted` : ""} — click to open`}
        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium hover:opacity-80 ${tone}`}
      >
        {score}
        {accepted.length > 0 ? <span className="ml-0.5 opacity-70">·{accepted.length}</span> : null}
      </button>
    );
  }

  return (
    <div className="w-72 rounded-md border bg-card p-2.5 text-left">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold">{label}</span>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          close
        </button>
      </div>

      {factors.length === 0 && accepted.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing counts against this tool.</p>
      ) : (
        <ul className="mb-2 space-y-0.5 text-xs text-muted-foreground">
          {factors.map((f) => (
            <li key={f.key}>
              <span className="tabular-nums text-foreground/70">+{f.weight}</span> {f.label}
              {f.manual ? (
                <>
                  {" "}
                  <span className="text-[10px] uppercase tracking-wide">added</span>{" "}
                  {canDecide ? <UndoRiskDecision node={node} factor={f.key.replace(/^manual:/, "")} /> : null}
                </>
              ) : null}
            </li>
          ))}
          {accepted.map((f) => (
            <li key={f.key} className="text-muted-foreground/70">
              <span className="tabular-nums line-through">+{f.weight}</span> <span className="line-through">{f.label}</span>{" "}
              <span className="text-[10px] uppercase tracking-wide">accepted</span> — {f.reason}
              {f.by ? ` (${f.by}${f.date ? `, ${f.date}` : ""})` : ""}{" "}
              {canDecide ? <UndoRiskDecision node={node} factor={f.key} /> : null}
            </li>
          ))}
        </ul>
      )}

      {canDecide ? (
        <RiskDecision
          node={node}
          label={label}
          factors={factors.filter((f) => !f.manual).map((f) => ({ key: f.key, label: f.label }))}
          defaultOpen
        />
      ) : null}
    </div>
  );
}
