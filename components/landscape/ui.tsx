import type { Lifecycle, Criticality } from "@/lib/otx/toolscape";
import type { RiskBand, ToolOrigin } from "@/lib/otx/consolidate";

/**
 * The vocabulary badges of the consolidated landscape, in one place so the same
 * word is the same colour everywhere on the page — a `migrate` chip in the risk
 * register and in the inventory must not read as two different states.
 */

export const LIFECYCLE_TONE: Record<Lifecycle, string> = {
  evaluate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  invest: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  tolerate: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  migrate: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  eliminate: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export const CRIT_TONE: Record<Criticality, string> = {
  critical: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  important: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  standard: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  low: "bg-muted text-muted-foreground",
};

export const RISK_TONE: Record<RiskBand, string> = {
  low: "bg-muted text-muted-foreground",
  elevated: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export const ORIGIN_TONE: Record<ToolOrigin, string> = {
  register: "bg-muted text-muted-foreground",
  manual: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  plant: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "use-case": "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
};

export const ORIGIN_LABEL: Record<ToolOrigin, string> = {
  register: "registered",
  manual: "added here",
  plant: "off-register",
  "use-case": "from a use case",
};

/** OT integration states, for the plant half of the page. */
export const INTEGRATION_TONE: Record<string, string> = {
  "uns-modelled": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "broker-published": "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "point-to-point": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "file-export": "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  none: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function Chip({ tone, children, title }: { tone: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  alarm,
}: {
  label: string;
  value: string;
  hint?: string;
  alarm?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${alarm ? "text-rose-700 dark:text-rose-400" : ""}`}>{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Money, at the precision a portfolio conversation actually uses. An absent
 * figure is "—", never €0: nobody has costed it, which is not the same as free.
 */
export function eur(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "€0";
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 2)}m`;
  if (Math.abs(v) >= 1_000) return `€${Math.round(v / 1_000)}k`;
  return `€${v}`;
}
