"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";

export interface FilterSelect {
  param: string;
  label: string;
  options: string[];
  /** Optional display labels for option values (must be serializable — no functions). */
  labels?: Record<string, string>;
}

/**
 * A compact filter toolbar: an optional search box plus dropdowns, all driven by
 * the URL query. Reusable across tools. `current` is the full set of active query
 * params (so unmanaged ones like `group` are preserved on every change).
 */
export function FilterBar({
  path,
  current,
  selects,
  search,
}: {
  path: string;
  current: Record<string, string | undefined>;
  selects: FilterSelect[];
  search?: { param: string; placeholder?: string };
}) {
  const router = useRouter();
  const { t } = useI18n();

  function go(patch: Record<string, string | undefined>) {
    const merged = { ...current, ...patch };
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
    const qs = usp.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  // Debounced search so typing doesn't navigate on every keystroke.
  const searchParam = search?.param;
  const [q, setQ] = useState(searchParam ? current[searchParam] ?? "" : "");
  const first = useRef(true);
  useEffect(() => {
    if (!searchParam) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => go({ [searchParam]: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCount = selects.filter((s) => current[s.param]).length + (searchParam && current[searchParam] ? 1 : 0);

  const selCls = "h-9 rounded-md border bg-transparent px-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={search.placeholder ?? t("common.search", "Search…")}
            className="h-9 w-full rounded-md border bg-transparent pl-8 pr-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
      {selects.map((s) => (
        <select
          key={s.param}
          aria-label={s.label}
          value={current[s.param] ?? ""}
          onChange={(e) => go({ [s.param]: e.target.value || undefined })}
          className={`${selCls} ${current[s.param] ? "border-foreground font-medium" : "text-muted-foreground"}`}
        >
          <option value="">{s.label}: {t("common.all", "All")}</option>
          {s.options.map((o) => (
            <option key={o} value={o}>{s.labels?.[o] ?? o}</option>
          ))}
        </select>
      ))}
      {activeCount > 0 && (
        <button onClick={() => { setQ(""); router.push(path); }} className="h-9 rounded-md px-2.5 text-sm text-muted-foreground hover:text-foreground">
          {t("filter.clear", "Clear")}
        </button>
      )}
    </div>
  );
}
