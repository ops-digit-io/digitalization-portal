import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tile, TileKpi, Tone } from "@/lib/launchpad";

const TONE_VAR: Record<Tone, string> = {
  info: "--info",
  ok: "--ok",
  violet: "--stage-s3",
  warn: "--warn",
  slate: "--muted-foreground",
};

function Icon({ path, color }: { path: string; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {path.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : "M" + seg)} />
      ))}
    </svg>
  );
}

/**
 * A launchpad tile ("Kachel"). Fiori-style: icon + optional KPI top, title +
 * subtitle bottom, subtle hover elevation. Whole tile is a link to a tool.
 */
export function LaunchTile({ tile, kpi }: { tile: Tile; kpi?: TileKpi }) {
  const color = `hsl(var(${TONE_VAR[tile.tone]}))`;
  const tint = `hsl(var(${TONE_VAR[tile.tone]}) / 0.12)`;

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span
          className="grid size-10 place-items-center rounded-lg"
          style={{ background: tint }}
        >
          <Icon path={tile.icon} color={color} />
        </span>
        {kpi && (
          <div className="text-right">
            <div className="text-2xl font-semibold leading-none tabular-nums" style={{ color: kpi.tone ? `hsl(var(${TONE_VAR[kpi.tone]}))` : undefined }}>
              {kpi.value}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{kpi.label}</div>
          </div>
        )}
      </div>
      <div className="mt-auto">
        <div className="font-medium leading-tight">{tile.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{tile.subtitle}</div>
      </div>
    </>
  );

  const base =
    "flex h-40 flex-col rounded-xl border bg-card p-4 transition-shadow";

  if (tile.disabled) {
    return (
      <div className={cn(base, "opacity-55")} aria-disabled>
        {inner}
        <span className="absolute right-3 top-3 text-[10px] uppercase tracking-wide text-muted-foreground">soon</span>
      </div>
    );
  }

  return (
    <Link
      href={tile.href}
      className={cn(
        base,
        "relative hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "hover:border-foreground/20",
      )}
    >
      {inner}
    </Link>
  );
}
