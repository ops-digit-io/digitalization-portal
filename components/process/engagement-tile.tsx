"use client";

/**
 * One process in the landscape, as a tile.
 *
 * A list of names tells you nothing about a portfolio, so each tile carries its
 * state the way the diagnostic reads it:
 *   · the traffic light is a BAR ACROSS THE TOP EDGE — the first thing the eye
 *     lands on, readable across a room, and never hue alone (a word sits in the
 *     foot beside it),
 *   · one segment per stage, filled by the sections actually written, turning
 *     red where that phase's gate was failed — the shape of the engagement at a
 *     glance,
 *   · the foot carries how much of the catalogue is really assessed, because a
 *     green light over 8 % coverage is not a green process.
 */

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import * as C from "@/lib/process/content";
import type { Status } from "@/lib/process/health-model";

export interface StageProgress {
  id: string;
  n: number;
  label: string;
  done: number;
  total: number;
  gate: "pass" | "fail" | null;
}
export interface Summary {
  status: Status;
  coverage: number;
  ratedCount: number;
  totalCount: number;
  koFailed: string[];
  stages: StageProgress[];
}
export interface EngagementRow {
  slug: string;
  title: string;
  owner: string;
  unit: string;
  anflug: "process" | "technology";
  phase: string;
  updatedAt: string;
  summary?: Summary;
}

const LIGHT: Record<Status, string> = {
  gruen: "bg-[hsl(var(--ok))]",
  gelb: "bg-[hsl(var(--warn))]",
  rot: "bg-[hsl(var(--destructive))]",
  grau: "bg-muted-foreground/40",
};

function fmtDate(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function EngagementTile({ row, locale }: { row: EngagementRow; locale: Locale }) {
  const s = row.summary;
  const status: Status = s?.status ?? "grau";
  const pct = Math.round((s?.coverage ?? 0) * 100);

  return (
    <Link
      href={`/process/${row.slug}`}
      className="group flex min-h-[170px] flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/25 hover:bg-accent/40"
    >
      {/* The light, as a bar across the top edge. */}
      <span className={`h-1 w-full shrink-0 ${LIGHT[status]}`} aria-hidden />

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-3.5 pt-3.5">
        <div className="min-w-0">
          {/* Two lines, then ellipsis: process names are long and a single
              truncated line hides the part that distinguishes them. */}
          <div className="line-clamp-2 font-semibold leading-snug" title={row.title}>{row.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.owner || C.pc(locale, "row.noOwner")}
            {row.unit ? ` · ${row.unit}` : ""}
          </div>
        </div>

        <div className="flex-1" />

        {/* An evidenced knock-out failure gets its own line — it is the finding
            that overrides everything else, so it must not be squeezed out. */}
        {s && s.koFailed.length > 0 && (
          <div className="flex">
            <span className="truncate rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--destructive))]">
              {s.koFailed.join(", ")} · {C.pc(locale, "tile.koFailed")}
            </span>
          </div>
        )}

        {/* One segment per stage: section fill, red where a gate in it was failed. */}
        {s && (
          <div>
            <div className="flex gap-1" role="img" aria-label={`${C.pc(locale, "tile.phases")}: ${s.stages.map((p) => `${p.label} ${p.done}/${p.total}`).join(", ")}`}>
              {s.stages.map((p) => {
                const fill = p.gate === "fail" ? 100 : p.total ? (p.done / p.total) * 100 : 0;
                return (
                  <span
                    key={p.id}
                    title={`${p.n} · ${p.label} — ${p.done}/${p.total}${p.gate ? ` · ${C.pc(locale, p.gate === "pass" ? "gate.pass" : "gate.fail")}` : ""}`}
                    className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                  >
                    <i
                      className={`absolute inset-y-0 left-0 block ${p.gate === "fail" ? "bg-[hsl(var(--destructive))]" : "bg-foreground/70"}`}
                      style={{ width: `${fill}%` }}
                    />
                  </span>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1 text-[9.5px] font-semibold tracking-wide text-muted-foreground/70">
              {s.stages.map((p) => (
                <span key={p.id} className="flex-1 text-center tabular-nums">{p.n}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <span className={`size-2 shrink-0 rounded-full ${LIGHT[status]}`} aria-hidden />
          <span className="font-medium text-foreground">
            {status === "grau" ? C.pc(locale, "tile.notAssessed") : C.statusPill(locale, status)}
          </span>
          {s && s.ratedCount > 0 && <span className="truncate">· {pct}% {C.pc(locale, "tile.assessed")}</span>}
          <span className="ml-auto shrink-0 tabular-nums">{fmtDate(row.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
