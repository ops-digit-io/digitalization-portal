"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_TILES } from "@/lib/launchpad";
import { useI18n } from "@/components/providers";

/** ⌘K / Ctrl-K command palette that searches all tools and navigates to one. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withLabels = ALL_TILES.map((tile) => ({
      tile,
      title: t(`tile.${tile.id}.title`, tile.title),
      subtitle: t(`tile.${tile.id}.subtitle`, tile.subtitle),
    }));
    if (!q) return withLabels;
    return withLabels.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q),
    );
  }, [query, t]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  function go(index: number) {
    const r = results[index];
    if (!r || r.tile.disabled) return;
    onClose();
    router.push(r.tile.href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <span className="text-muted-foreground" aria-hidden>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(active); }
              else if (e.key === "Escape") onClose();
            }}
            placeholder={t("search.placeholder", "Search tools…")}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-80 overflow-auto p-1">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.empty", "No tools match.")}</li>
          )}
          {results.map((r, i) => (
            <li key={r.tile.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(i)}
                disabled={r.tile.disabled}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                  i === active ? "bg-accent" : ""
                } ${r.tile.disabled ? "opacity-50" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                </span>
                {r.tile.disabled && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("tile.soon", "soon")}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
