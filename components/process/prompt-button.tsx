"use client";

/**
 * "Copy prompt" — hands the assembled prompt to an assistant outside the portal.
 *
 * Without a model key this is not a fallback, it is THE workflow: the portal
 * assembles the same prompt the live coach would have run on, the human pastes it
 * into whatever assistant they have, and pastes the artefact back. So it is a
 * first-class button next to the generate button, not a link in an error message.
 *
 * Clipboard access can fail for reasons the user cannot fix (an insecure origin, a
 * denied permission, a browser that refuses outside a trusted gesture). Copying is
 * therefore never the only way out: on failure the prompt opens in a dialog,
 * selected, ready for ⌘C. A button that silently does nothing is worse than no
 * button.
 */

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiGet } from "@/components/process/ui";
import type { Locale } from "@/lib/i18n";
import * as C from "@/lib/process/content";

export function PromptButton({
  path,
  locale,
  label,
  size = "sm",
  variant = "outline",
}: {
  /** API path under /api/process that returns { prompt }. */
  path: string;
  locale: Locale;
  /** What the prompt is for, shown as the dialog's title. */
  label: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiGet<{ prompt: string }>(path);
      try {
        await navigator.clipboard.writeText(r.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Clipboard refused — show the text instead of failing quietly.
        setShown(r.prompt);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size={size} variant={variant} disabled={busy} onClick={run}>
        {busy ? "…" : copied ? C.pc(locale, "prompt.copied") : C.pc(locale, "prompt.copy")}
      </Button>
      {err && <span className="text-xs text-destructive">{err}</span>}

      <Dialog open={shown !== null} onClose={() => setShown(null)} labelledBy={titleId} className="w-[min(92vw,760px)]">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div>
            <h2 id={titleId} className="text-sm font-semibold">{C.pc(locale, "prompt.title")} — {label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{C.pc(locale, "prompt.manual")}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShown(null)}>{C.pc(locale, "btn.close")}</Button>
        </div>
        <div className="p-4">
          <textarea
            data-autofocus
            readOnly
            value={shown ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            spellCheck={false}
            className="h-[60vh] w-full resize-none rounded-md border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </Dialog>
    </>
  );
}
