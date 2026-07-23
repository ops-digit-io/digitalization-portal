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
