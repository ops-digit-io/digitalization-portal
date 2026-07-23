/**
 * OIDC Authorization Code flow with PKCE — the standards-based half of login.
 *
 * No auth SDK: discovery + token exchange are `fetch`, and the id_token is
 * verified against the provider's JWKS with jose (signature, issuer, audience,
 * and nonce). Works with any compliant OIDC IdP (Entra ID, Okta, Keycloak, …)
 * configured purely by env. Server-side only.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";
import { groupsClaim, oidcConfig, oidcScope } from "./config.js";

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

let cachedDiscovery: { issuer: string; doc: Discovery } | null = null;

export async function discover(env: Record<string, string | undefined> = process.env): Promise<Discovery> {
  const { issuer } = oidcConfig(env);
  if (cachedDiscovery && cachedDiscovery.issuer === issuer) return cachedDiscovery.doc;
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status}) at ${issuer}`);
  const doc = (await res.json()) as Discovery;
  cachedDiscovery = { issuer, doc };
  return doc;
}

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A URL-safe random token (state, nonce, PKCE verifier). */
export function randomToken(bytes = 32): string {
  return b64url(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export async function buildAuthUrl(
  opts: { redirectUri: string; state: string; nonce: string; challenge: string },
  env: Record<string, string | undefined> = process.env,
): Promise<string> {
  const d = await discover(env);
  const { clientId } = oidcConfig(env);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: oidcScope(env),
    redirect_uri: opts.redirectUri,
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  });
  return `${d.authorization_endpoint}?${params.toString()}`;
}

export async function exchangeCode(
  opts: { code: string; redirectUri: string; verifier: string },
  env: Record<string, string | undefined> = process.env,
): Promise<{ id_token: string }> {
  const d = await discover(env);
  const { clientId, clientSecret } = oidcConfig(env);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: opts.verifier,
  });
  const res = await fetch(d.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { id_token: string };
}

export interface IdClaims {
  sub: string;
  email?: string;
  name?: string;
  groups: string[];
}

/** Verify the id_token signature/issuer/audience/nonce and extract identity + groups. */
export async function verifyIdToken(
  idToken: string,
  nonce: string,
  env: Record<string, string | undefined> = process.env,
): Promise<IdClaims> {
  const d = await discover(env);
  const { clientId } = oidcConfig(env);
  const jwks = createRemoteJWKSet(new URL(d.jwks_uri));
  const { payload } = await jwtVerify(idToken, jwks, { issuer: d.issuer, audience: clientId });
  if (typeof payload.nonce !== "string" || payload.nonce !== nonce) throw new Error("OIDC nonce mismatch");
  const raw = payload[groupsClaim(env)];
  const groups = Array.isArray(raw) ? raw.map((g) => String(g)) : [];
  return {
    sub: String(payload.sub ?? ""),
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
    ...(typeof payload.name === "string" ? { name: payload.name } : {}),
    groups,
  };
}
