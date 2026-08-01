"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toolFromPath, type UiEventType } from "@/lib/portal-tools";

/**
 * The telemetry tool's browser half — it records how the portal is USED: a view
 * when a tool's page opens, and a click when an interactive element in it is
 * pressed. Events are attributed to the current tool (the route's first segment)
 * and nothing else: no user, no target text, no field values. Aggregate and
 * content-free by construction — the server counts tools, never people.
 *
 * Events are buffered and flushed in one `sendBeacon` batch every few seconds and
 * on the page being hidden, so this costs the user nothing and never blocks a
 * navigation. With no store configured the endpoint is a no-op and this is free.
 */

const FLUSH_MS = 8000;
const MAX_BUFFER = 100;

export function Telemetry() {
  const pathname = usePathname();
  const buffer = useRef<{ tool: string; type: UiEventType }[]>([]);
  const lastView = useRef<string>("");

  // Flush helper — beacon first (survives unload), fetch as a fallback.
  const flush = useRef(() => {
    const events = buffer.current;
    if (events.length === 0) return;
    buffer.current = [];
    const body = JSON.stringify({ events });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/usage/track", new Blob([body], { type: "application/json" }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    void fetch("/api/usage/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  });

  // A view per tool entry. Guard on the tool, not the full path, so moving
  // between records inside a tool is one view, not one per id.
  useEffect(() => {
    const tool = toolFromPath(pathname ?? "/");
    if (tool === lastView.current) return;
    lastView.current = tool;
    buffer.current.push({ tool, type: "view" });
    if (buffer.current.length >= MAX_BUFFER) flush.current();
  }, [pathname]);

  // Delegated click capture: count a click when it lands on (or inside) an
  // interactive element, attributed to the current tool. No text is read.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !el.closest) return;
      const hit = el.closest("a,button,[role=button],[role=tab],input[type=submit],select,summary");
      if (!hit) return;
      buffer.current.push({ tool: toolFromPath(window.location.pathname), type: "click" });
      if (buffer.current.length >= MAX_BUFFER) flush.current();
    };
    document.addEventListener("click", onClick, { capture: true });

    const interval = setInterval(() => flush.current(), FLUSH_MS);
    const onHide = () => { if (document.visibilityState === "hidden") flush.current(); };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(interval);
      flush.current();
    };
  }, []);

  return null;
}

/** Emit a named action from anywhere in the UI (e.g. a save that matters), still
 *  attributed only to the current tool. Best-effort, content-free. */
export function trackAction(): void {
  try {
    const body = JSON.stringify({ events: [{ tool: toolFromPath(window.location.pathname), type: "action" }] });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/usage/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/usage/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* never break a UI action for telemetry */
  }
}
