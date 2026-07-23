import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clear(origin: string): NextResponse {
  const res = NextResponse.redirect(new URL("/login?signedout=1", origin));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function POST(req: Request) {
  return clear(new URL(req.url).origin);
}
/** GET convenience so a plain link can sign out too. */
export async function GET(req: Request) {
  return clear(new URL(req.url).origin);
}
