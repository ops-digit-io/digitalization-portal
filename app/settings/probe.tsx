"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers";

interface Health {
  provider: string;
  live: boolean;
  ok: boolean;
  error?: string;
}

/** On-demand live API check — makes one minimal request and reports the result. */
export function ProviderProbe() {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function test() {
    setRunning(true);
    setErr(null);
    setHealth(null);
    try {
      const res = await fetch("/api/status?probe=1");
      const data = (await res.json()) as { health?: Health };
      setHealth(data.health ?? null);
    } catch {
      setErr(t("error.requestFailed", "Request failed."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={test}
          disabled={running}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:border-foreground/40 disabled:opacity-50"
        >
          {running ? t("probe.testing", "Testing…") : t("probe.testConnection", "Test connection")}
        </button>
        <span className="text-[11px] text-muted-foreground">{t("probe.hint", "Makes one minimal call to verify the key works.")}</span>
      </div>
      {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
      {health && (
        <div className="mt-2 text-xs">
          {!health.live ? (
            <span className="text-muted-foreground">○ {t("probe.offline", "Offline — no model key configured.")}</span>
          ) : health.ok ? (
            <span className="text-ok">✓ {t("probe.reachablePrefix", "Reachable — the")} {health.provider} {t("probe.reachableSuffix", "key authenticated and responded.")}</span>
          ) : (
            <span className="text-destructive">⚠ {t("probe.notResponding", "Not responding —")} {health.error ?? t("probe.checkKey", "check the key or base URL.")}</span>
          )}
        </div>
      )}
    </div>
  );
}
