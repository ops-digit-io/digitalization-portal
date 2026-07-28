import { NextResponse } from "next/server";
import { newFileTemplate, readEntryFile, ENTRY_FILE, type EntryType } from "@/lib/registry-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read a single file within an entry (default: the entry file). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as EntryType | null;
  const name = url.searchParams.get("name");
  const path = url.searchParams.get("path") ?? (type === "skill" ? ENTRY_FILE : `${name}.md`);
  if ((type !== "skill" && type !== "playbook" && type !== "contract") || !name) {
    return NextResponse.json({ error: "type (skill|playbook|contract) and name required" }, { status: 400 });
  }
  const content = await readEntryFile(type, name, path);
  if (content === undefined) {
    return NextResponse.json({ type, name, path, content: newFileTemplate(type, name, path), exists: false });
  }
  return NextResponse.json({ type, name, path, content, exists: true });
}
