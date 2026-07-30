"use client";

/**
 * Shared client helpers for the Process Funnel tool: a thin fetch wrapper over
 * `/api/process/*`, a markdown renderer (react-markdown + GFM, matching the rest
 * of the portal), and the traffic-light badge.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const BASE = "/api/process";

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "same-origin" });
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("auth");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
  return data as T;
}

export async function apiSend<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("auth");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((data as { error?: string }).error || `HTTP ${r.status}`) as Error & { code?: string; status?: number };
    e.code = (data as { code?: string }).code;
    e.status = r.status;
    throw e;
  }
  return data as T;
}

export function Md({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

const LIGHT_CLASS: Record<string, string> = {
  green: "bg-[hsl(var(--ok))] text-white",
  amber: "bg-amber-500 text-white",
  red: "bg-[hsl(var(--destructive))] text-white",
  grey: "bg-secondary text-secondary-foreground",
};

export function lightClass(l: string): string {
  return ["green", "amber", "red"].includes(l) ? l : "grey";
}

/** Traffic light as a labelled pill — hue alone is never the interface (PDT). */
export function LightBadge({ light, label }: { light: string; label?: string }) {
  const l = lightClass(light);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${LIGHT_CLASS[l]}`}>
      <span className="size-2 rounded-full bg-current opacity-90" aria-hidden />
      {label ?? l}
    </span>
  );
}
