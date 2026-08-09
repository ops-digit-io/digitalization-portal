/**
 * OIDC configuration, read from the environment (`docs/04-rbac.md`, plan M2).
 *
 * Login is LIVE when a corporate OIDC provider is configured; until then the
 * portal runs on the demo session, exactly like the model/GitHub live-vs-offline
 * switches. All values are server-side only (constraint #7).
 */

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  tenant?: string;
}

function has(v: string | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

/** True when a real login can be performed (issuer + client + secret + AUTH_SECRET). */
export function oidcEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return has(env.OIDC_ISSUER) && has(env.OIDC_CLIENT_ID) && has(env.OIDC_CLIENT_SECRET) && has(env.AUTH_SECRET);
}

/**
 * Whether the app may fall back to the built-in DEMO session when OIDC is not
 * configured. The demo session carries the `admin` role, so this must NOT be the
 * silent default in production — a single missing OIDC env var would otherwise
 * serve the whole portal to any anonymous visitor AS ADMIN (fail-open).
 *
 * So: allowed in non-production (local dev, CI) for zero-config DX, and in
 * production ONLY behind an explicit `ALLOW_DEMO_SESSION=1` opt-in. When neither
 * OIDC nor this opt-in is present in production, the app fails CLOSED (anonymous,
 * every `can()` denies) rather than open.
 */
export function demoAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.ALLOW_DEMO_SESSION === "1") return true;
  return (env.NODE_ENV ?? "development") !== "production";
}

/** The effective auth posture, for middleware and diagnostics. */
export function authMode(env: Record<string, string | undefined> = process.env): "oidc" | "demo" | "closed" {
  if (oidcEnabled(env)) return "oidc";
  return demoAllowed(env) ? "demo" : "closed";
}

export function oidcConfig(env: Record<string, string | undefined> = process.env): OidcConfig {
  return {
    issuer: (env.OIDC_ISSUER ?? "").replace(/\/$/, ""),
    clientId: env.OIDC_CLIENT_ID ?? "",
    clientSecret: env.OIDC_CLIENT_SECRET ?? "",
    ...(has(env.OIDC_TENANT) ? { tenant: env.OIDC_TENANT } : {}),
  };
}

/** The id-token claim carrying the user's IdP groups (default "groups"). */
export function groupsClaim(env: Record<string, string | undefined> = process.env): string {
  return env.OIDC_GROUPS_CLAIM?.trim() || "groups";
}

/** The OAuth scopes requested at login. */
export function oidcScope(env: Record<string, string | undefined> = process.env): string {
  return env.OIDC_SCOPE?.trim() || "openid profile email groups";
}
