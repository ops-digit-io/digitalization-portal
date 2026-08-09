import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { oidcEnabled, demoAllowed } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/cookie";

/**
 * Route guard. Three postures (see `authMode`):
 *   - oidc:   every request must carry a valid session cookie; pages redirect to
 *             /login, API routes get 401.
 *   - demo:   OIDC off but demo explicitly permitted (dev, or ALLOW_DEMO_SESSION=1)
 *             — the portal runs on the demo session and nothing is gated here.
 *   - closed: OIDC off AND demo not permitted (a misconfigured production) — fail
 *             CLOSED: deny like the oidc posture, so no anonymous admin is served.
 *
 * Always-open paths: the login page, the auth endpoints themselves, and the
 * status endpoint (so the header can tell whether to show "Sign in").
 */
const OPEN = ["/login", "/api/auth/", "/api/status", "/api/webhooks/", "/api/cron/"];

export async function middleware(req: NextRequest) {
  const oidc = oidcEnabled();
  // Demo posture (dev, or an explicit prod opt-in): nothing gated at the edge.
  if (!oidc && demoAllowed()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  // Only trust a session cookie under OIDC; in the closed posture there is no valid
  // token and we must not attempt to honour one.
  const token = oidc ? req.cookies.get(SESSION_COOKIE)?.value : undefined;
  if (token && (await verifySession(token))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?returnTo=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
