"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n, useTheme } from "@/components/providers";
import { CommandPalette } from "@/components/portal/command-palette";
import { LOCALES, type Locale } from "@/lib/i18n";

export interface ModelStatus {
  provider: "anthropic" | "openai" | "offline";
  live: boolean;
  model?: string;
}
export interface AppStatus {
  model: ModelStatus;
  git: { live: boolean };
}

const PROVIDER_LABEL: Record<ModelStatus["provider"], string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  offline: "Offline",
};

function StatusChip({ status }: { status: AppStatus | null }) {
  if (!status) return null;
  const { model, git } = status;
  const dot = model.live ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))";
  const title = [
    model.live ? `Model: ${PROVIDER_LABEL[model.provider]}${model.model ? ` (${model.model})` : ""}` : "Model: offline — set ANTHROPIC_API_KEY or OPENAI_API_KEY",
    `GitHub App: ${git.live ? "connected" : "local workspace"}`,
  ].join("\n");
  return (
    <Link
      href="/settings"
      className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
      title={`${title}\n\nOpen Settings`}
    >
      <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden />
      <span>{model.live ? PROVIDER_LABEL[model.provider] : "Offline"}</span>
      {git.live && <span className="text-[10px] uppercase tracking-wide text-ok">· git</span>}
    </Link>
  );
}

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [status, setStatus] = useState<AppStatus | null>(null);

  // Fetch integration status at runtime (reflects the live environment).
  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => { if (alive) setStatus(s as AppStatus); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // ⌘K / Ctrl-K opens the tool search anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded bg-primary text-xs text-primary-foreground">DP</span>
          <span className="hidden sm:inline">Digitalization Portal</span>
        </Link>

        {/* Tool search */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-2 flex h-9 flex-1 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground sm:max-w-xs"
          aria-label={t("search.open", "Search tools")}
        >
          <span aria-hidden>⌕</span>
          <span className="flex-1 text-left">{t("search.placeholder", "Search tools…")}</span>
          <kbd className="hidden rounded border px-1.5 text-[10px] sm:inline">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Model / integration status */}
          <StatusChip status={status} />

          {/* Language dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              onBlur={() => setTimeout(() => setLangOpen(false), 120)}
              className="flex h-9 items-center gap-1 rounded-md border px-2.5 text-sm text-muted-foreground hover:text-foreground"
              aria-label={t("lang.label", "Language")}
            >
              <span aria-hidden>🌐</span>
              <span className="uppercase">{locale}</span>
              <span className="text-xs" aria-hidden>▾</span>
            </button>
            {langOpen && (
              <ul className="absolute right-0 mt-1 w-36 overflow-hidden rounded-md border bg-popover py-1 shadow-lg">
                {LOCALES.map((l) => (
                  <li key={l.code}>
                    <button
                      onMouseDown={() => setLocale(l.code as Locale)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent ${
                        l.code === locale ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {l.label}
                      {l.code === locale && <span aria-hidden>✓</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Theme toggle (black / white) */}
          <button
            onClick={toggle}
            className="grid size-9 place-items-center rounded-md border text-muted-foreground hover:text-foreground"
            aria-label={t("theme.toggle", "Toggle theme")}
            title={t("theme.toggle", "Toggle theme")}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
              </svg>
            )}
          </button>

          {/* User */}
          <div className="ml-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden md:inline">demo.forum@example.com</span>
            <span className="grid size-7 place-items-center rounded-full bg-secondary text-[11px] font-medium text-secondary-foreground">DF</span>
          </div>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
