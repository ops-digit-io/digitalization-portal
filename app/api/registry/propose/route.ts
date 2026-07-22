import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { proposeChange, type EntryType, type ProposeFile } from "@/lib/registry-store";
import { DEMO_SESSION } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = DEMO_SESSION; // real deployment resolves this from the OIDC session

  // Proposing produces a pull request → `draft`. The merge (second approver) is a
  // human act under CODEOWNERS on the registry repo (§4.5).
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let body: { type?: EntryType; name?: string; bundle?: boolean; files?: ProposeFile[]; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { type, name, files } = body;
  if ((type !== "skill" && type !== "playbook") || !name || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "type, name and a non-empty files[] are required" }, { status: 400 });
  }
  if (files.some((f) => typeof f.path !== "string" || typeof f.content !== "string")) {
    return NextResponse.json({ error: "each file needs a path and content" }, { status: 400 });
  }

  try {
    const result = await proposeChange({
      type,
      name,
      bundle: body.bundle ?? type === "skill",
      files,
      message: body.message?.trim() || `Update ${type} ${name}`,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "propose failed" }, { status: 500 });
  }
}
