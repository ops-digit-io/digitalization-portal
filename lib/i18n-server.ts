/**
 * Server-side locale, the mirror of the client `useI18n` hook.
 *
 * Client components read the locale from React context (localStorage-backed);
 * server components can't see that, so the switch is ALSO written to the
 * `du-locale` cookie (see `providers.tsx`). This module reads that cookie and
 * hands a server component a bound `t()` — the same key space, the same four
 * languages, the same fallback chain as the client.
 *
 * Server-only: it calls `next/headers`, which throws in a client bundle. Reading
 * the cookie opts a route into dynamic rendering — every page here already does
 * that via `getSession()`, so there is no new cost.
 */

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, translate, type Locale } from "./i18n.js";

export const LOCALE_COOKIE = "du-locale";

/** The active locale for this request, from the cookie; English if unset/invalid. */
export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export type TFn = (key: string, fallback?: string) => string;

/** A translator bound to this request's locale — `getT()(key, fallback)`. */
export function getT(): TFn {
  const locale = getLocale();
  return (key, fallback) => translate(locale, key, fallback);
}
