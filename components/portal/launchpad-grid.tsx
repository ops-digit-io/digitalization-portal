"use client";

import { useMemo, useState } from "react";
import { LaunchTile } from "@/components/portal/tile";
import { useI18n } from "@/components/providers";
import type { ResolvedGroup } from "@/lib/launchpad";

/**
 * The launchpad grid and its inline search.
 *
 * Client-side for the search box only. WHICH tiles are locked is decided on the
 * server (`app/page.tsx` calls `can()` per tile) and arrives resolved — the
 * browser is told what it may use, never trusted to work it out, and no role or
 * capability list is shipped to it.
 */
export function LaunchpadGrid({ groups }: { groups: ResolvedGroup[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  // Translate tiles, then filter by the inline search.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((group) => {
        const tiles = group.tiles
          .map(({ tile, locked }) => ({
            tile,
            locked,
            title: t(`tile.${tile.id}.title`, tile.title),
            subtitle: t(`tile.${tile.id}.subtitle`, tile.subtitle),
          }))
          .filter((x) => !q || x.title.toLowerCase().includes(q) || x.subtitle.toLowerCase().includes(q));
        return { category: group.category, label: t(`cat.${group.category}`, group.category), tiles };
      })
      .filter((g) => g.tiles.length > 0);
  }, [groups, query, t]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Digitalization Portal</h1>
          <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <div className="flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm md:w-72">
          <span className="text-muted-foreground" aria-hidden>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder", "Search tools…")}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {shown.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("search.empty", "No tools match.")}</p>
      )}

      <div className="space-y-8">
        {shown.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.tiles.map(({ tile, locked, title, subtitle }) => (
                <LaunchTile
                  key={tile.id}
                  tile={tile}
                  title={title}
                  subtitle={subtitle}
                  locked={locked}
                  soonLabel={t("tile.soon", "soon")}
                  lockedLabel={t("tile.locked", "no access")}
                  plannedLabel={t("tile.planned", "Planned — not built yet.")}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
