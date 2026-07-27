import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { canEditDemand } from "@/lib/demand-edit";
import { addAttachment, removeAttachment, isValidUrl } from "@/lib/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ~Vercel serverless request-body limit; larger files should be linked, not uploaded. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Attach files to a demand. Binaries never enter git (constraint #4) — they go to
 * Vercel Blob (when configured), and the demand keeps a markdown link in its
 * `## Attachments` section. A pasted-link path always works with no infra. Gate:
 * `canEditDemand` (draft + own or view_all).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `Demand ${id} not found.` }, { status: 404 });
  }
  if (!canEditDemand(session, md)) {
    return NextResponse.json({ ok: false, error: "You can only attach to demands you raised (or need view-all)." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // File upload → Vercel Blob (only when configured).
  if (contentType.includes("multipart/form-data")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ ok: false, error: "File upload isn't configured (BLOB_READ_WRITE_TOKEN). Paste a link instead." }, { status: 503 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file in the request." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: `File exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB — attach it as a link instead.` }, { status: 413 });
    }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
    const blob = await put(`demands/${id}/${safe}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });
    const result = addAttachment(md, { label: file.name, url: blob.url });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Attach ${file.name} to ${id}` });
    return NextResponse.json({ ok: true, url: blob.url, host: saved.host });
  }

  // JSON: link or remove.
  let body: { action?: string; url?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  if (body.action === "link") {
    const url = String(body.url ?? "");
    if (!isValidUrl(url)) {
      return NextResponse.json({ ok: false, error: "Attachment must be a valid http(s) URL." }, { status: 400 });
    }
    const result = addAttachment(md, { label: String(body.label ?? url), url });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Attach link to ${id}` });
    return NextResponse.json({ ok: true, host: saved.host });
  }

  if (body.action === "remove") {
    const result = removeAttachment(md, String(body.url ?? ""));
    if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    const saved = await saveDemand(id, result.markdown, { message: `Remove attachment from ${id}` });
    return NextResponse.json({ ok: true, host: saved.host });
  }

  return NextResponse.json({ ok: false, error: "action must be 'link' or 'remove'" }, { status: 400 });
}
