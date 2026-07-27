"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RequirementsDoc, UserStory } from "@/lib/requirements";

/**
 * The readable, checkmarkable requirements board. Replaces the raw-markdown dump:
 * epics become cards, features (user stories) become rows with a MoSCoW badge and a
 * nested acceptance-criteria checklist. Every checkbox ticks a verification key via
 * `/api/demands/[id]/verification` (persisted in the demand README, so it survives
 * re-analysis). Read-only for sessions that may not verify — the ticks still show.
 *
 * Keys mirror `lib/verification.ts`: epic id (`E1`), story id (`US-1`), acceptance
 * criterion (`US-1#2`, 1-based).
 */

const PRIORITY: Record<UserStory["priority"], { label: string; cls: string }> = {
  must: { label: "must", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  should: { label: "should", cls: "bg-warn/10 text-warn border-warn/30" },
  could: { label: "could", cls: "bg-secondary text-muted-foreground border-border" },
};

function acceptanceKey(storyId: string, i: number): string { return `${storyId}#${i + 1}`; }

export function RequirementsBoard({
  id,
  doc,
  verified,
  canVerify,
}: {
  id: string;
  doc: RequirementsDoc;
  verified: string[];
  canVerify: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(() => new Set(verified));
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOn = useCallback((k: string) => checked.has(k), [checked]);

  const toggle = useCallback(async (key: string) => {
    if (!canVerify || busyKey) return;
    const next = !checked.has(key);
    setBusyKey(key);
    setError(null);
    // Optimistic.
    setChecked((prev) => {
      const s = new Set(prev);
      if (next) s.add(key); else s.delete(key);
      return s;
    });
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/verification`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, checked: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        // Revert.
        setChecked((prev) => {
          const s = new Set(prev);
          if (next) s.delete(key); else s.add(key);
          return s;
        });
        setError(data.error ?? `Couldn't save (${res.status}).`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setChecked((prev) => {
        const s = new Set(prev);
        if (next) s.delete(key); else s.add(key);
        return s;
      });
      setError("Network error — the tick wasn't saved.");
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, canVerify, checked, id, router]);

  // Progress across features (stories) and acceptance criteria.
  const totalStories = doc.stories.length;
  const doneStories = doc.stories.filter((s) => isOn(s.id)).length;
  const allCriteria = doc.stories.flatMap((s) => s.acceptance.map((_, i) => acceptanceKey(s.id, i)));
  const doneCriteria = allCriteria.filter((k) => isOn(k)).length;
  const pct = totalStories === 0 ? 0 : Math.round((doneStories / totalStories) * 100);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">PoC / pilot verification</h2>
          <span className="text-sm text-muted-foreground">
            {doneStories}/{totalStories} features · {doneCriteria}/{allCriteria.length} acceptance criteria
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
        </div>
        {!canVerify && (
          <p className="mt-2 text-xs text-muted-foreground">Read-only — you don&apos;t have rights to record verification on this demand.</p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      {/* Epics + features */}
      {doc.epics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No epics were parsed from this demand&apos;s requirements.</p>
      ) : (
        doc.epics.map((epic) => {
          const stories = doc.stories.filter((s) => s.epic === epic.id);
          const done = stories.filter((s) => isOn(s.id)).length;
          return (
            <section key={epic.id} className="rounded-lg border">
              <header className="flex items-start gap-3 border-b bg-secondary/30 p-4">
                <Check k={epic.id} on={isOn(epic.id)} busy={busyKey === epic.id} canVerify={canVerify} onToggle={toggle} big />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{epic.id}</span>
                    <h3 className="text-sm font-semibold">{epic.title}</h3>
                    {stories.length > 0 && (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {done}/{stories.length} features
                      </span>
                    )}
                  </div>
                  {epic.description && <p className="mt-1 text-sm text-muted-foreground">{epic.description}</p>}
                </div>
              </header>

              {stories.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No features under this epic.</p>
              ) : (
                <ul className="divide-y">
                  {stories.map((s) => (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Check k={s.id} on={isOn(s.id)} busy={busyKey === s.id} canVerify={canVerify} onToggle={toggle} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${PRIORITY[s.priority].cls}`}>
                              {PRIORITY[s.priority].label}
                            </span>
                          </div>
                          <p className={`mt-1 text-sm ${isOn(s.id) ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            As a <strong>{s.persona}</strong>, I want {s.capability}, so that {s.benefit}.
                          </p>

                          {s.acceptance.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground">Acceptance criteria</p>
                              <ul className="mt-1 space-y-1">
                                {s.acceptance.map((a, i) => {
                                  const k = acceptanceKey(s.id, i);
                                  return (
                                    <li key={k} className="flex items-start gap-2">
                                      <Check k={k} on={isOn(k)} busy={busyKey === k} canVerify={canVerify} onToggle={toggle} small />
                                      <span className={`text-xs ${isOn(k) ? "text-muted-foreground line-through" : "text-foreground/80"}`}>{a}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {/* Non-functional requirements */}
      {doc.nfrs.length > 0 && (
        <section className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-semibold">Non-functional requirements</h3>
          <ul className="space-y-1.5">
            {doc.nfrs.map((n) => (
              <li key={n.id} className="flex gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{n.id}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{n.category}</span>
                <span className="text-foreground/90">{n.requirement}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Supporting lists */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard title="Assumptions" items={doc.assumptions} />
        <ListCard title="Risks" items={doc.risks} />
        <ListCard title="Open questions" items={doc.openQuestions} />
        <ListCard title="Out of scope" items={doc.outOfScope} />
      </div>
    </div>
  );
}

function Check({
  k, on, busy, canVerify, onToggle, big, small,
}: {
  k: string; on: boolean; busy: boolean; canVerify: boolean;
  onToggle: (k: string) => void; big?: boolean; small?: boolean;
}) {
  const size = big ? "h-5 w-5 text-[13px]" : small ? "h-4 w-4 text-[10px]" : "h-4 w-4 text-[11px]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`Verify ${k}`}
      disabled={!canVerify || busy}
      onClick={() => onToggle(k)}
      className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded border transition-colors ${size} ${
        on ? "border-ok bg-ok text-white" : "border-input bg-transparent text-transparent"
      } ${canVerify ? "cursor-pointer hover:border-ok/60" : "cursor-default"} ${busy ? "opacity-50" : ""}`}
    >
      {on ? "✓" : ""}
    </button>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1 text-sm text-foreground/90">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground" aria-hidden>·</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
