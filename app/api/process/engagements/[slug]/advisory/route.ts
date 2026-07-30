import { NextResponse } from "next/server";
import { SECTIONS } from "@/lib/process/sections";
import { ordered as advisoryOrdered, readiness } from "@/lib/process/advisory";
import * as store from "@/lib/process/store";
import * as advisor from "@/lib/process/advisor";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  if (!store.exists(slug)) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const filled = SECTIONS.filter((s) => store.read(slug, s.key).trim()).map((s) => s.key);
  const items = advisoryOrdered().map((a) => {
    const content = advisor.read(slug, a.key);
    return { ...a, ...readiness(a, filled), filled: content.trim().length > 0, chars: content.length };
  });
  return NextResponse.json({ items, decisions: advisor.decisions(slug) });
}
