import { NextResponse } from "next/server";
import { oidcEnabled } from "@/lib/auth/config";
import { buildAuthUrl, pkceChallenge, randomToken } from "@/lib/auth/oidc";
import { FLOW_COOKIE, signFlow } from "@/lib/auth/cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Begin login: PKCE + state + nonce, then redirect to the IdP. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!oidcEnabled()) return NextResponse.redirect(new URL("/", url.origin));

  const returnToRaw = url.searchParams.get("returnTo") ?? "/";
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/";
  const verifier = randomToken();
  const state = randomToken();
  const nonce = randomToken();
  const challenge = await pkceChallenge(verifier);
  const redirectUri = `${url.origin}/api/auth/callback`;

  try {
    const authUrl = await buildAuthUrl({ redirectUri, state, nonce, challenge });
    const res = NextResponse.redirect(authUrl);
    res.cookies.set(FLOW_COOKIE, await signFlow({ state, nonce, verifier, returnTo }), {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=provider_unreachable", url.origin));
  }
}
