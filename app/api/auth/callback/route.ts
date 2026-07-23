import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { oidcEnabled } from "@/lib/auth/config";
import { exchangeCode, verifyIdToken } from "@/lib/auth/oidc";
import { FLOW_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifyFlow } from "@/lib/auth/cookie";
import { resolveSession, isPortalMember } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(origin: string, reason: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
  res.cookies.delete(FLOW_COOKIE);
  return res;
}

/** IdP redirect target: exchange the code, verify the id_token, set the session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!oidcEnabled()) return NextResponse.redirect(new URL("/", url.origin));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const flowToken = cookies().get(FLOW_COOKIE)?.value;
  const flow = flowToken ? await verifyFlow(flowToken) : null;

  // CSRF: the state returned by the IdP must match the one we stored.
  if (!code || !state || !flow || flow.state !== state) return fail(url.origin, "invalid_state");

  try {
    const { id_token } = await exchangeCode({ code, redirectUri: `${url.origin}/api/auth/callback`, verifier: flow.verifier });
    const claims = await verifyIdToken(id_token, flow.nonce);
    const user = claims.email || claims.sub;
    if (!user) return fail(url.origin, "no_identity");

    // Roles + plant scopes come purely from the IdP groups.
    const session = resolveSession(user, claims.groups);
    if (!isPortalMember(session)) return fail(url.origin, "not_a_member");

    const res = NextResponse.redirect(new URL(flow.returnTo || "/", url.origin));
    res.cookies.set(SESSION_COOKIE, await signSession(session, claims.name), {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.delete(FLOW_COOKIE);
    return res;
  } catch {
    return fail(url.origin, "auth_failed");
  }
}
