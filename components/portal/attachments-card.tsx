"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Attachment } from "@/lib/attachments";
import { useI18n } from "@/components/providers";

/**
 * The demand's supporting files. Binaries never enter git (constraint #4): when a
 * Blob store is configured, files upload to `/api/demands/[id]/attachments` and the
 * demand keeps a markdown link in its `## Attachments` section; otherwise (or for
 * files already hosted elsewhere) a pasted link works with no infrastructure. Read
 * for everyone; add/remove gated server-side by `canEditDemand`.
 */
export function AttachmentsCard({
  id,
  attachments,
  canEdit,
  uploadEnabled,
}: {
  id: string;
  attachments: Attachment[];
  canEdit: boolean;
  uploadEnabled: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const working = busy || pending;
  const base = `/api/demands/${encodeURIComponent(id)}/attachments`;

  function done(ok: boolean) {
    setBusy(false);
    if (ok) startTransition(() => router.refresh());
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(base, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? `${t("attachments.uploadFailed", "Upload failed")} (${res.status}).`); done(false); return; }
      done(true);
    } catch {
      setError(t("errors.networkNothingUploaded", "Network error — nothing was uploaded."));
      done(false);
    }
  }

  async function send(body: unknown, fail: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? `${fail} (${res.status}).`); done(false); return false; }
      done(true);
      return true;
    } catch {
      setError(t("errors.networkNothingSaved", "Network error — nothing was saved."));
      done(false);
      return false;
    }
  }

  async function addLink() {
    if (url.trim() === "") { setError(t("attachments.pasteUrlFirst", "Paste a URL first.")); return; }
    const ok = await send({ action: "link", url: url.trim(), label: label.trim() || url.trim() }, t("attachments.attachFailed", "Attach failed"));
    if (ok) { setLinking(false); setUrl(""); setLabel(""); }
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{t("attachments.heading", "Attachments")}</h2>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("attachments.none", "No files attached.")}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {attachments.map((a) => (
            <li key={a.url} className="flex items-center justify-between gap-2">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={a.url}>
                📎 {a.label}
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void send({ action: "remove", url: a.url }, t("attachments.removeFailed", "Remove failed"))}
                  disabled={working}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                  title={t("attachments.removeTitle", "Remove attachment")}
                  aria-label={`${t("attachments.remove", "Remove")} ${a.label}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-3 space-y-2">
          {uploadEnabled && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={working}
                className="w-full rounded-md border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
              >
                {busy ? t("attachments.uploading", "Uploading…") : `⬆ ${t("attachments.uploadFile", "Upload a file (Excel, PPT, PDF…)")}`}
              </button>
            </>
          )}

          {linking ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("attachments.urlPlaceholder", "https://… (link to the file)")}
                className="w-full rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("attachments.labelPlaceholder", "Label (optional)")}
                className="w-full rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={addLink}
                  disabled={working || url.trim() === ""}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {busy ? t("attachments.attaching", "Attaching…") : t("attachments.attachLink", "Attach link")}
                </button>
                <button
                  type="button"
                  onClick={() => { setLinking(false); setUrl(""); setLabel(""); setError(null); }}
                  disabled={working}
                  className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {t("common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLinking(true)}
              disabled={working}
              className="w-full rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              🔗 {t("attachments.pasteLink", "Paste a link")}
            </button>
          )}

          {!uploadEnabled && (
            <p className="text-[11px] text-muted-foreground">
              {t("attachments.uploadNotConfigured", "File upload isn't configured — attach files by link. (Set")} <span className="font-mono">BLOB_READ_WRITE_TOKEN</span>{t("attachments.toEnableUploads", " to enable uploads.)")}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
