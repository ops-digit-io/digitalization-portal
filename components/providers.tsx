"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, translate, isLocale, type Locale } from "@/lib/i18n";

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

/** Reflect the chosen locale on <html lang> so browsers and screen readers know
 *  the page's language. Applied client-side, the same way the theme class is —
 *  the interface strings are translated in the client, so the attribute follows
 *  the same path rather than forcing every route into dynamic rendering. */
function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
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
  const [theme, setTheme] = useState<Theme>("light");
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from storage / system on mount.
  useEffect(() => {
    const storedTheme = (localStorage.getItem("du-theme") as Theme | null) ?? undefined;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = storedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const storedLocale = localStorage.getItem("du-locale") as Locale | null;
    const initialLocale = storedLocale && isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
    setLocaleState(initialLocale);
    applyLocale(initialLocale);
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
    applyLocale(l);
    localStorage.setItem("du-locale", l);
  };

  const t = (key: string, fallback?: string) => translate(locale, key, fallback);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}
