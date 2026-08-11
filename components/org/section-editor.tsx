"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SectionScore } from "@/lib/org/scoring";
import { useI18n } from "@/components/providers";
import { ScoreBar, ScorePill } from "@/components/portal/org-score";

/**
 * Edit one department section with live coaching. The textarea scores against the
 * grammar as you type (debounced POST /api/org action=score), so the missing-criteria
 * backlog shrinks in real time; Save commits it and refreshes the server-rendered page.
 */
export function SectionEditor({
  slug,
  sectionKey,
  deptName,
  initialSource,
  present,
  lane,
}: {
  slug: string;
  sectionKey: string;
  deptName: string;
  initialSource: string;
  present: boolean;
  /** When set, this editor edits a lane-pack file of that lane, not a department section. */
  lane?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialSource);
  const [score, setScore] = useState<SectionScore | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live scoring while editing.
  useEffect(() => {
    if (!editing) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/org", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: lane ? "score-lane" : "score", key: sectionKey, markdown: text }),
        });
        const data = (await res.json().catch(() => ({}))) as { score?: SectionScore };
        if (data.score) setScore(data.score);
      } catch {
        /* scoring is best-effort — the Save still works */
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, editing, sectionKey, lane]);

  async function begin() {
    setEditing(true);
    setError(null);
    let seed = initialSource;
    if (!present || initialSource.trim() === "") {
      // Load the coached scaffold for an empty section.
      try {
        const laneParam = lane ? "&lane=1" : "";
        const res = await fetch(`/api/org?key=${encodeURIComponent(sectionKey)}&name=${encodeURIComponent(deptName)}${laneParam}`);
        const data = (await res.json().catch(() => ({}))) as { markdown?: string };
        if (data.markdown) seed = data.markdown;
      } catch {
        /* fall back to whatever we had */
      }
    }
    setText(seed);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          lane
            ? { action: "save-lane", slug, lane, key: sectionKey, markdown: text }
            : { action: "save", slug, key: sectionKey, markdown: text },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button onClick={begin} className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
        {present ? t("org.edit") : t("org.startSection")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border bg-secondary/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{t("org.editing")} <span className="font-mono">{sectionKey}.md</span></span>
        {score && (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("org.liveScore")}</span>
            <ScorePill score={score.score} />
          </span>
        )}
      </div>
      {score && <ScoreBar score={score.score} className="mb-2" />}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="h-80 w-full resize-y rounded-md border bg-background p-3 font-mono text-xs leading-relaxed"
      />
      {score && score.missing.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50/50 p-2.5 text-xs dark:bg-amber-950/20">
          <span className="font-medium text-amber-800 dark:text-amber-300">{t("org.stillMissing")}</span>{" "}
          <span className="text-amber-800/90 dark:text-amber-300/90">{score.missing.join(" · ")}</span>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("org.saving") : t("org.save")}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setText(initialSource);
          }}
          className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {t("org.cancel")}
        </button>
      </div>
    </div>
  );
}
