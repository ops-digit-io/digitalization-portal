import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { proposeChange, type EntryType } from "@/lib/registry-store";
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

  let body: { type?: EntryType; name?: string; content?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { type, name, content } = body;
  if ((type !== "skill" && type !== "playbook") || !name || !content) {
    return NextResponse.json({ error: "type, name and content are required" }, { status: 400 });
  }

  try {
    const result = await proposeChange({
      type,
      name,
      content,
      message: body.message?.trim() || `Update ${type} ${name}`,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "propose failed" }, { status: 500 });
  }
}
