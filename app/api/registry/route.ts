import { NextResponse } from "next/server";
import { listRegistry } from "@/lib/registry-store";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Registry content is the method IP the repo separation protects — gate the read.
  if (!can(await getSession(), "view_board")) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  return NextResponse.json(await listRegistry());
}
