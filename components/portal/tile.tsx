import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tile, Tone } from "@/lib/launchpad";

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
 * A launchpad tile ("Kachel"). A pure navigation entry point — icon, title,
 * subtitle, and a chevron affordance. No metrics: tiles route to tools, they
 * don't report numbers. `title`/`subtitle` may be passed translated; otherwise
 * the tile's English defaults are used. Whole tile is a link.
 */
export function LaunchTile({
  tile,
  title,
  subtitle,
  soonLabel = "soon",
}: {
  tile: Tile;
  title?: string;
  subtitle?: string;
  soonLabel?: string;
}) {
  const color = `hsl(var(${TONE_VAR[tile.tone]}))`;
  const tint = `hsl(var(${TONE_VAR[tile.tone]}) / 0.12)`;

  const inner = (
    <>
      <span className="grid size-11 place-items-center rounded-lg" style={{ background: tint }}>
        <Icon path={tile.icon} color={color} />
      </span>
      <div className="mt-auto">
        <div className="flex items-center gap-1 font-medium leading-tight">
          {title ?? tile.title}
          {!tile.disabled && (
            <span className="translate-x-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden>
              →
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{subtitle ?? tile.subtitle}</div>
      </div>
    </>
  );

  const base = "group flex h-36 flex-col rounded-xl border bg-card p-4 transition-shadow";

  if (tile.disabled) {
    return (
      <div className={cn(base, "relative opacity-55")} aria-disabled>
        {inner}
        <span className="absolute right-3 top-3 text-[10px] uppercase tracking-wide text-muted-foreground">{soonLabel}</span>
      </div>
    );
  }

  return (
    <Link
      href={tile.href}
      className={cn(
        base,
        "hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}
