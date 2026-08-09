/**
 * Server-side locale resolution — the half of i18n the client provider cannot do.
 *
 * The locale is a UI preference kept in the `du-locale` COOKIE (not just localStorage),
 * precisely so SERVER components can read it: almost every tool page is an async server
 * component, and `useI18n()` is a client hook it cannot call. A page reads the cookie
 * here and translates with the same `translate()`/dictionaries the client uses, so one
 * key set drives both sides.
 *
 * Reading the cookie opts a route into dynamic rendering — which every tool page that
 * translates already is (`export const dynamic = "force-dynamic"`), so this adds no new
 * cost. The root layout deliberately does NOT read the cookie, keeping the static shell
 * static; only pages that translate pay for it.
 */

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, translate, type Locale } from "./i18n.js";

/** The cookie the language switcher writes and this reader reads. */
export const LOCALE_COOKIE = "du-locale";

function isLocale(v: string | undefined): v is Locale {
  return v !== undefined && LOCALES.some((l) => l.code === v);
}

/** The active locale from the request cookie, validated; DEFAULT_LOCALE otherwise. */
export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/**
 * A translator bound to the request's locale, for server components:
 *   `const { t } = getT();`  then  `t("board.title", "Portfolio board")`.
 * The fallback is the English source string, so a page renders sensibly even before its
 * keys exist in a given locale.
 */
export function getT(): { locale: Locale; t: (key: string, fallback?: string) => string } {
  const locale = getLocale();
  return { locale, t: (key: string, fallback?: string) => translate(locale, key, fallback) };
}
