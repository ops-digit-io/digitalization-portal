import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { oidcEnabled } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/cookie";

/**
 * Route guard. When OIDC is configured, every request must carry a valid session
 * cookie; otherwise pages redirect to /login and API routes get a 401. When OIDC
 * is NOT configured, the portal runs on the demo session and nothing is gated.
 *
 * Always-open paths: the login page, the auth endpoints themselves, and the
 * status endpoint (so the header can tell whether to show "Sign in").
 */
const OPEN = ["/login", "/api/auth/", "/api/status", "/api/webhooks/"];

export async function middleware(req: NextRequest) {
  if (!oidcEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
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
