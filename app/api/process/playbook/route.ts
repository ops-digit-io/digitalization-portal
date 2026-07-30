import { NextResponse } from "next/server";
import { playbook } from "@/lib/process/assets";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  const md = playbook();
  if (!md) return NextResponse.json({ error: "no playbook on disk" }, { status: 404 });
  return NextResponse.json({ markdown: md });
}
