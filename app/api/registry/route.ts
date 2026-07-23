import { NextResponse } from "next/server";
import { listRegistry } from "@/lib/registry-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listRegistry());
}
