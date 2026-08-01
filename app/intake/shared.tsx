"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useI18n } from "@/components/providers";

/**
 * A useState that survives a page refresh by mirroring to localStorage, so an
 * in-progress intake isn't lost to an accidental reload or navigation. SSR-safe:
 * storage is read only after mount, and the initial value is never written back
 * over a restored draft.
 */
export function useDraft<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota/unavailable storage */
    }
  }, [key, value, loaded]);

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  return [value, setValue, clear];
}

export interface SaveResponse {
  id: string;
  result: { host: string; target: string; repo: string; path: string; pending?: boolean };
  error?: string;
  missing?: string[];
}

/** One save path for all three tools: post answers OR raw markdown; both normalise. */
export function useIntakeSave() {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: { answers?: unknown; markdown?: string }): Promise<SaveResponse | null> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", ...payload }),
      });
      const data = (await res.json()) as SaveResponse;
      if (!res.ok) { setError(data.error ?? t("intake.save.failed", "Save failed.")); return null; }
      setSaved(data);
      return data;
    } catch {
      setError(t("error.requestFailed", "Request failed."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  function reset() { setSaved(null); setError(null); }
  return { saving, saved, error, save, reset };
}

/** After a successful save — same links for every tool. */
export function SavedLinks({ id, host, pending, onRestart }: { id: string; host: string; pending?: boolean; onRestart: () => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ok">
          {pending ? (
            <>{t("intake.saved.capturedAs", "Captured as")} <span className="font-mono">{id}</span> {t("intake.saved.syncing", "— syncing to the funnel.")}</>
          ) : (
            <>{t("intake.saved.savedAs", "Saved as")} <span className="font-mono">{id}</span> ({host}).</>
          )}
        </span>
        <Link href="/demands" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">{t("intake.saved.openDemands", "Open demands →")}</Link>
        <Link href="/funnel" className="rounded-md border px-3 py-1.5 text-xs">{t("intake.saved.funnel", "Funnel →")}</Link>
        <button onClick={onRestart} className="rounded-md border px-3 py-1.5 text-xs">{t("intake.saved.captureAnother", "Capture another")}</button>
      </div>
      {host === "local" && (
        <p className="text-[11px] text-muted-foreground">
          {t("intake.saved.localNote", "Buffered in the local workspace. Configure KV + the GitHub App for durable, shared storage — local writes aren't persisted on ephemeral (serverless) deployments.")}
        </p>
      )}
    </div>
  );
}

/** Switch between the three intake tools. */
export function ToolTabs({ active }: { active: "chat" | "form" | "md" }) {
  const { t } = useI18n();
  const tabs = [
    { id: "chat", label: t("intake.tab.chat", "Chat"), href: "/intake/chat" },
    { id: "form", label: t("intake.tab.form", "Form"), href: "/intake/form" },
    { id: "md", label: t("intake.tab.markdown", "Markdown"), href: "/intake/md" },
  ] as const;
  return (
    <div className="flex gap-1 rounded-md border p-0.5 text-sm">
      {tabs.map((tab) => (
        <Link key={tab.id} href={tab.href} className={`rounded px-3 py-1 ${active === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

/** Shared header for the three tools: breadcrumb, title, tabs, "same output" note. */
export function ToolHeader({ active, blurb }: { active: "chat" | "form" | "md"; blurb: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
      <div>
        <nav className="mb-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">{t("nav.home", "Home")}</Link>
          <span className="mx-1.5" aria-hidden>›</span>
          <Link href="/intake" className="hover:text-foreground">{t("nav.intake", "Intake")}</Link>
          <span className="mx-1.5" aria-hidden>›</span>
          <span className="text-foreground capitalize">{active === "md" ? t("intake.tab.markdown", "Markdown") : active}</span>
        </nav>
        <h1 className="text-lg font-semibold">{t("intake.header.title", "Capture a demand")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{blurb} {t("intake.header.note", "All three tools save the same demand page.")}</p>
      </div>
      <ToolTabs active={active} />
    </div>
  );
}
