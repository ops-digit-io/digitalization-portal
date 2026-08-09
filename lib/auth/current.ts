/**
 * The one place the app asks "who is this?" — used by every route and server
 * component in place of the old hard-coded demo session.
 *
 *   - OIDC not configured → the DEMO session (demo/dev mode, unchanged behaviour).
 *   - OIDC configured + valid cookie → the real session (roles/scopes from the
 *     IdP groups, resolved by `resolveSession`).
 *   - OIDC configured + no/invalid cookie → an ANONYMOUS session (no roles) so
 *     `can()` denies and middleware redirects pages to /login.
 *
 * Authority is always the session's (constraint #3); there is no privileged path.
 */

import { cookies } from "next/headers";
import type { Session } from "../rbac.js";
import { DEMO_SESSION } from "../seed.js";
import { oidcEnabled, demoAllowed } from "./config.js";
import { SESSION_COOKIE, verifySession } from "./cookie.js";

/** No portal role → visible-to-nobody; every `can()` check fails. */
export const ANONYMOUS: Session = { user: "anonymous", roles: [], scopes: [] };

export interface CurrentUser {
  session: Session;
  /** Display name from the IdP, when present. */
  name?: string;
  /** True when a real OIDC session is in effect. */
  authenticated: boolean;
  /** True when running on the demo session (OIDC not configured). */
  demo: boolean;
}

/** Resolve the current user (session + display context). */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!oidcEnabled()) {
    // Demo session (which carries admin) only when explicitly permitted — otherwise
    // fail closed to anonymous so a misconfigured production never serves admin.
    if (demoAllowed()) return { session: DEMO_SESSION, demo: true, authenticated: false, name: "Demo user" };
    return { session: ANONYMOUS, demo: false, authenticated: false };
  }
  const token = cookies().get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;
  if (!claims) return { session: ANONYMOUS, demo: false, authenticated: false };
  return {
    session: { user: claims.user, roles: claims.roles, scopes: claims.scopes },
    demo: false,
    authenticated: true,
    ...(claims.name ? { name: claims.name } : {}),
  };
}

/** The portal session for authorization — the value every route/page should use. */
export async function getSession(): Promise<Session> {
  return (await getCurrentUser()).session;
}
