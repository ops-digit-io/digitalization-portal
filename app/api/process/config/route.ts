import { NextResponse } from "next/server";
import { GROUPS, ordered } from "@/lib/process/sections";
import { ordered as advisoryOrdered } from "@/lib/process/advisory";
import { allSchemas } from "@/lib/process/assets";
import * as llm from "@/lib/process/llm";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  const schemas = allSchemas();
  return NextResponse.json({
    groups: GROUPS,
    sections: ordered().map((s) => ({ ...s, hasSchema: Boolean(schemas[s.key]) })),
    advisory: advisoryOrdered(),
    liveCoaching: llm.available(),
    model: llm.available() ? llm.model() : null,
    provider: llm.provider(),
  });
}
