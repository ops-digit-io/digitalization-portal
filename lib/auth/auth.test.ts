import { describe, it, expect } from "vitest";
import { signSession, verifySession, signFlow, verifyFlow } from "./cookie.js";
import { oidcEnabled, groupsClaim, oidcScope } from "./config.js";
import type { Session } from "../rbac.js";

const SECRET = "test-secret-0123456789-abcdefghij";
const session: Session = { user: "jane@ops-digit-io.com", roles: ["triage", "reviewer"], scopes: ["DE-ALD"] };

describe("session cookie", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession(session, "Jane Doe", SECRET);
    const back = await verifySession(token, SECRET);
    expect(back?.user).toBe(session.user);
    expect(back?.roles).toEqual(session.roles);
    expect(back?.scopes).toEqual(session.scopes);
    expect(back?.name).toBe("Jane Doe");
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(session, undefined, SECRET);
    const tampered = token.slice(0, -3) + (token.endsWith("aaa") ? "bbb" : "aaa");
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(session, undefined, SECRET);
    expect(await verifySession(token, "a-completely-different-secret-value")).toBeNull();
  });
});

describe("auth flow cookie", () => {
  it("round-trips state/nonce/verifier and keeps a safe returnTo", async () => {
    const token = await signFlow({ state: "s", nonce: "n", verifier: "v", returnTo: "/board" }, SECRET);
    const back = await verifyFlow(token, SECRET);
    expect(back).toEqual({ state: "s", nonce: "n", verifier: "v", returnTo: "/board" });
  });

  it("forces an off-site returnTo back to /", async () => {
    const token = await signFlow({ state: "s", nonce: "n", verifier: "v", returnTo: "https://evil.example.com" }, SECRET);
    const back = await verifyFlow(token, SECRET);
    expect(back?.returnTo).toBe("/");
  });
});

describe("oidc config", () => {
  it("is enabled only when issuer, client, secret, and AUTH_SECRET are all set", () => {
    expect(oidcEnabled({})).toBe(false);
    expect(oidcEnabled({ OIDC_ISSUER: "https://idp", OIDC_CLIENT_ID: "c", OIDC_CLIENT_SECRET: "s" })).toBe(false);
    expect(oidcEnabled({ OIDC_ISSUER: "https://idp", OIDC_CLIENT_ID: "c", OIDC_CLIENT_SECRET: "s", AUTH_SECRET: "k" })).toBe(true);
  });
  it("defaults the groups claim and scope", () => {
    expect(groupsClaim({})).toBe("groups");
    expect(oidcScope({})).toContain("openid");
    expect(groupsClaim({ OIDC_GROUPS_CLAIM: "roles" })).toBe("roles");
  });
});
