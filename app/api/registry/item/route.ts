import { NextResponse } from "next/server";
import { newEntryTemplate, readEntry, type EntryType } from "@/lib/registry-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as EntryType | null;
  const name = url.searchParams.get("name");
  if ((type !== "skill" && type !== "playbook") || !name) {
    return NextResponse.json({ error: "type (skill|playbook) and name required" }, { status: 400 });
  }
  const content = await readEntry(type, name);
  if (content === undefined) {
    // New entry: hand back a template so the editor can start from something.
    return NextResponse.json({ type, name, content: newEntryTemplate(type, name), exists: false });
  }
  return NextResponse.json({ type, name, content, exists: true });
}
