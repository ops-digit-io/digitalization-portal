"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, translate, type Locale } from "@/lib/i18n";

/** The cookie server components read (mirrors `LOCALE_COOKIE` in lib/i18n-server). */
const LOCALE_COOKIE = "du-locale";

function readLocaleCookie(): Locale | null {
  const m = document.cookie.match(/(?:^|;\s*)du-locale=([^;]+)/);
  return m ? (decodeURIComponent(m[1]!) as Locale) : null;
}

/* ---------------- Theme ---------------- */

type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

/* ---------------- Locale ---------------- */

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}
const LocaleContext = createContext<LocaleCtx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k, f) => f ?? k,
});
export const useI18n = () => useContext(LocaleContext);

/* ---------------- Provider ---------------- */

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from storage / system on mount.
  useEffect(() => {
    const storedTheme = (localStorage.getItem("du-theme") as Theme | null) ?? undefined;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = storedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Prefer the cookie (server components read it), then localStorage.
    const stored = readLocaleCookie() ?? (localStorage.getItem("du-locale") as Locale | null);
    if (stored) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("du-theme", next);
      return next;
    });
  };

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("du-locale", l);
    // Write the cookie so SERVER components translate too, then refresh so the
    // already-rendered server tree re-renders in the new locale (no full reload).
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(l)}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    router.refresh();
  };

  const t = (key: string, fallback?: string) => translate(locale, key, fallback);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}
