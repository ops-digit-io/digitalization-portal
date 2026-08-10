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

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");
  // The layout reads the locale cookie server-side and passes it here, so the very first
  // client render already matches the server HTML (no hydration mismatch, no flash).
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  // Hydrate theme (and, defensively, the locale) from storage / system on mount.
  useEffect(() => {
    const storedTheme = (localStorage.getItem("du-theme") as Theme | null) ?? undefined;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = storedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // The server already applied the cookie locale; fall back to a stored one only when
    // the layout couldn't (e.g. cookie absent but a localStorage preference exists).
    if (!initialLocale) {
      const stored = readLocaleCookie() ?? (localStorage.getItem("du-locale") as Locale | null);
      if (stored) {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      }
    }
  }, [initialLocale]);

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
