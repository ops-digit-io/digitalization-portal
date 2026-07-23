/**
 * Signed session + auth-flow cookies (jose HS256, keyed by AUTH_SECRET).
 *
 * The session cookie carries the RESOLVED portal session (user + roles + scopes)
 * — never the id_token or any provider secret — signed so it can't be forged. It
 * is httpOnly, so it never reaches client JS (constraint #7). jose is isomorphic,
 * so the same verify runs in middleware (edge) and server components (node).
 */

import { SignJWT, jwtVerify } from "jose";
import type { Role, Session } from "../rbac.js";

const ALG = "HS256";
export const SESSION_COOKIE = "du_session";
export const FLOW_COOKIE = "du_auth_flow";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function key(secret = process.env.AUTH_SECRET): Uint8Array {
  if (!secret || secret.trim() === "") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SessionClaims extends Session {
  name?: string;
}

/** Sign the resolved session into a session cookie value. */
export async function signSession(session: Session, name?: string, secret?: string): Promise<string> {
  return new SignJWT({ roles: session.roles, scopes: session.scopes, ...(name ? { name } : {}) })
    .setProtectedHeader({ alg: ALG })
    .setSubject(session.user)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

/** Verify a session cookie value → the session, or null if invalid/expired. */
export async function verifySession(token: string, secret?: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALG] });
    const user = payload.sub;
    if (typeof user !== "string" || user === "") return null;
    const roles = (Array.isArray(payload.roles) ? payload.roles : []) as Role[];
    const scopes = (Array.isArray(payload.scopes) ? payload.scopes : []) as string[];
    return { user, roles, scopes, ...(typeof payload.name === "string" ? { name: payload.name } : {}) };
  } catch {
    return null;
  }
}

export interface FlowState {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
}

/** Short-lived signed cookie carrying the in-flight auth state (state/nonce/PKCE). */
export async function signFlow(flow: FlowState, secret?: string): Promise<string> {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key(secret));
}

export async function verifyFlow(token: string, secret?: string): Promise<FlowState | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALG] });
    const { state, nonce, verifier } = payload as Record<string, unknown>;
    if (typeof state !== "string" || typeof nonce !== "string" || typeof verifier !== "string") return null;
    const returnTo = typeof payload.returnTo === "string" && payload.returnTo.startsWith("/") ? payload.returnTo : "/";
    return { state, nonce, verifier, returnTo };
  } catch {
    return null;
  }
}
