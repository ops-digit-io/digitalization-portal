"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RequirementsDoc, UserStory, Epic } from "@/lib/requirements";
import type { Provenance } from "@/lib/requirements-overrides";

/**
 * The requirements board — readable, checkmarkable, and now editable.
 *
 * Verification (the checkmarks) ticks a key via `/api/demands/[id]/verification`
 * and persists in the demand README. Editing (add / change / remove epics and
 * stories) is the human-in-the-loop over the AI's assumptions: each change posts
 * to `/api/demands/[id]/requirements-edits`, which stores a durable overlay in the
 * same README, so both survive re-analysis of `requirements.md`.
 *
 * Every item carries a provenance badge — what the model wrote, what a human
 * edited, what a human added — so the AI's assumptions are always visible as such.
 */

const PRIORITY: Record<UserStory["priority"], { label: string; cls: string }> = {
  must: { label: "must", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  should: { label: "should", cls: "bg-warn/10 text-warn border-warn/30" },
  could: { label: "could", cls: "bg-secondary text-muted-foreground border-border" },
};

function acceptanceKey(storyId: string, i: number): string { return `${storyId}#${i + 1}`; }

type EditTarget =
  | { kind: "add-epic" }
  | { kind: "edit-epic"; epic: Epic }
  | { kind: "add-story"; epicId: string }
  | { kind: "edit-story"; story: UserStory }
  | null;

export function RequirementsBoard({
  id,
  doc,
  verified,
  canVerify,
  canEdit = false,
  provenance = {},
  removed = [],
}: {
  id: string;
  doc: RequirementsDoc;
  verified: string[];
  canVerify: boolean;
  canEdit?: boolean;
  provenance?: Record<string, Provenance>;
  removed?: { id: string; kind: "epic" | "story"; title: string }[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(() => new Set(verified));
  const [, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<EditTarget>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const isOn = useCallback((k: string) => checked.has(k), [checked]);

  const toggle = useCallback(async (key: string) => {
    if (!canVerify || busyKey) return;
    const next = !checked.has(key);
    setBusyKey(key);
    setError(null);
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
        setChecked((prev) => { const s = new Set(prev); if (next) s.delete(key); else s.add(key); return s; });
        setError(data.error ?? `Couldn't save (${res.status}).`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch {
      setChecked((prev) => { const s = new Set(prev); if (next) s.delete(key); else s.add(key); return s; });
      setError("Network error — the tick wasn't saved.");
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, canVerify, checked, id, router]);

  /** Post an edit action; on success close any form and refresh. */
  const edit = useCallback(async (payload: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/demands/${encodeURIComponent(id)}/requirements-edits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setEditError(data.error ?? `Couldn't save (${res.status}).`); return false; }
      setTarget(null);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setEditError("Network error — the change wasn't saved.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, router]);

  const confirmRemove = useCallback(async (kind: "epic" | "story", itemId: string) => {
    if (!confirm(`Remove ${itemId}? It can be restored afterwards.`)) return;
    await edit(kind === "epic" ? { action: "remove-epic", epicId: itemId } : { action: "remove-story", storyId: itemId });
  }, [edit]);

  const totalStories = doc.stories.length;
  const doneStories = doc.stories.filter((s) => isOn(s.id)).length;
  const allCriteria = doc.stories.flatMap((s) => s.acceptance.map((_, i) => acceptanceKey(s.id, i)));
  const doneCriteria = allCriteria.filter((k) => isOn(k)).length;
  const pct = totalStories === 0 ? 0 : Math.round((doneStories / totalStories) * 100);
  const epicIds = doc.epics.map((e) => e.id);

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
        {canEdit ? (
          <p className="mt-2 text-xs text-muted-foreground">
            You can add, edit, or remove epics and features below — your changes are kept as a human overlay and survive re-analysis.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Read-only — you don&apos;t have rights to change this demand.</p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      {/* Epics + features */}
      {doc.epics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No epics yet.</p>
      ) : (
        doc.epics.map((epic) => {
          const stories = doc.stories.filter((s) => s.epic === epic.id);
          const done = stories.filter((s) => isOn(s.id)).length;
          if (target?.kind === "edit-epic" && target.epic.id === epic.id) {
            return <div key={epic.id}><EpicForm initial={epic} saving={saving} error={editError}
              onCancel={() => setTarget(null)}
              onSubmit={(f) => edit({ action: "update-epic", epicId: epic.id, fields: f })} /></div>;
          }
          return (
            <section key={epic.id} className="rounded-lg border">
              <header className="flex items-start gap-3 border-b bg-secondary/30 p-4">
                <Check k={epic.id} on={isOn(epic.id)} busy={busyKey === epic.id} canVerify={canVerify} onToggle={toggle} big />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{epic.id}</span>
                    <h3 className="text-sm font-semibold">{epic.title}</h3>
                    <ProvenanceBadge p={provenance[epic.id]} />
                    {stories.length > 0 && (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{done}/{stories.length} features</span>
                    )}
                  </div>
                  {epic.description && <p className="mt-1 text-sm text-muted-foreground">{epic.description}</p>}
                </div>
                {canEdit && (
                  <RowActions
                    onEdit={() => { setEditError(null); setTarget({ kind: "edit-epic", epic }); }}
                    onRemove={() => confirmRemove("epic", epic.id)}
                  />
                )}
              </header>

              <ul className="divide-y">
                {stories.map((s) =>
                  target?.kind === "edit-story" && target.story.id === s.id ? (
                    <li key={s.id} className="p-4">
                      <StoryForm initial={s} epicIds={epicIds} saving={saving} error={editError}
                        onCancel={() => setTarget(null)}
                        onSubmit={(f) => edit({ action: "update-story", storyId: s.id, fields: f })} />
                    </li>
                  ) : (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Check k={s.id} on={isOn(s.id)} busy={busyKey === s.id} canVerify={canVerify} onToggle={toggle} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${PRIORITY[s.priority].cls}`}>
                              {PRIORITY[s.priority].label}
                            </span>
                            <ProvenanceBadge p={provenance[s.id]} />
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
                        {canEdit && (
                          <RowActions
                            onEdit={() => { setEditError(null); setTarget({ kind: "edit-story", story: s }); }}
                            onRemove={() => confirmRemove("story", s.id)}
                          />
                        )}
                      </div>
                    </li>
                  ),
                )}

                {/* Add a feature under this epic */}
                {canEdit && (
                  <li className="p-3">
                    {target?.kind === "add-story" && target.epicId === epic.id ? (
                      <StoryForm initial={{ epic: epic.id }} epicIds={epicIds} saving={saving} error={editError}
                        onCancel={() => setTarget(null)}
                        onSubmit={(f) => edit({ action: "add-story", story: { ...f, epic: epic.id } })} />
                    ) : (
                      <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditError(null); setTarget({ kind: "add-story", epicId: epic.id }); }}>
                        + Add a feature
                      </button>
                    )}
                  </li>
                )}
              </ul>
            </section>
          );
        })
      )}

      {/* Add an epic */}
      {canEdit && (
        target?.kind === "add-epic" ? (
          <EpicForm saving={saving} error={editError} onCancel={() => setTarget(null)}
            onSubmit={(f) => edit({ action: "add-epic", epic: f })} />
        ) : (
          <button type="button" className="rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            onClick={() => { setEditError(null); setTarget({ kind: "add-epic" }); }}>
            + Add an epic
          </button>
        )
      )}

      {/* Restore removed items */}
      {canEdit && removed.length > 0 && (
        <div className="rounded-lg border border-dashed p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Removed</h3>
          <ul className="mt-2 space-y-1.5">
            {removed.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                <span className="text-muted-foreground line-through">{r.title}</span>
                <button type="button" className="text-xs font-medium text-foreground underline hover:no-underline"
                  onClick={() => edit({ action: "restore", kind: r.kind, id: r.id })}>restore</button>
              </li>
            ))}
          </ul>
        </div>
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

function ProvenanceBadge({ p }: { p?: Provenance }) {
  if (p === "added") return <span className="rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 text-[10px] font-medium text-ok">added by human</span>;
  if (p === "edited") return <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">human-edited</span>;
  return <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">AI</span>;
}

function RowActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" onClick={onEdit} aria-label="Edit"
        className="rounded border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Edit</button>
      <button type="button" onClick={onRemove} aria-label="Remove"
        className="rounded border px-2 py-1 text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive">Remove</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-sm";

function EpicForm({ initial, saving, error, onCancel, onSubmit }: {
  initial?: Partial<Epic>; saving: boolean; error: string | null;
  onCancel: () => void; onSubmit: (fields: { title: string; description: string }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <div className="rounded-lg border border-foreground/20 p-4">
      <div className="space-y-3">
        <Field label="Epic title"><input className={inputCls} value={title} disabled={saving} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <Field label="Description"><textarea className={inputCls} rows={2} value={description} disabled={saving} onChange={(e) => setDescription(e.target.value)} /></Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <FormButtons saving={saving} onCancel={onCancel} onSave={() => onSubmit({ title, description })} />
      </div>
    </div>
  );
}

function StoryForm({ initial, epicIds, saving, error, onCancel, onSubmit }: {
  initial?: Partial<UserStory>; epicIds: string[]; saving: boolean; error: string | null;
  onCancel: () => void; onSubmit: (fields: Partial<UserStory>) => void;
}) {
  const [epic, setEpic] = useState(initial?.epic ?? epicIds[0] ?? "");
  const [persona, setPersona] = useState(initial?.persona ?? "");
  const [capability, setCapability] = useState(initial?.capability ?? "");
  const [benefit, setBenefit] = useState(initial?.benefit ?? "");
  const [priority, setPriority] = useState<UserStory["priority"]>(initial?.priority ?? "should");
  const [acceptance, setAcceptance] = useState((initial?.acceptance ?? []).join("\n"));
  return (
    <div className="rounded-lg border border-foreground/20 p-4">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Epic">
            <select className={inputCls} value={epic} disabled={saving} onChange={(e) => setEpic(e.target.value)}>
              {epicIds.map((eid) => <option key={eid} value={eid}>{eid}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputCls} value={priority} disabled={saving} onChange={(e) => setPriority(e.target.value as UserStory["priority"])}>
              <option value="must">must</option><option value="should">should</option><option value="could">could</option>
            </select>
          </Field>
        </div>
        <Field label="As a … (persona)"><input className={inputCls} value={persona} disabled={saving} onChange={(e) => setPersona(e.target.value)} placeholder="e.g. Maintenance Planner" /></Field>
        <Field label="I want … (capability)"><input className={inputCls} value={capability} disabled={saving} onChange={(e) => setCapability(e.target.value)} autoFocus /></Field>
        <Field label="so that … (benefit)"><input className={inputCls} value={benefit} disabled={saving} onChange={(e) => setBenefit(e.target.value)} /></Field>
        <Field label="Acceptance criteria (one per line)"><textarea className={inputCls} rows={3} value={acceptance} disabled={saving} onChange={(e) => setAcceptance(e.target.value)} /></Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <FormButtons saving={saving} onCancel={onCancel}
          onSave={() => onSubmit({ epic, persona, capability, benefit, priority, acceptance: acceptance.split("\n").map((s) => s.trim()).filter(Boolean) })} />
      </div>
    </div>
  );
}

function FormButtons({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" disabled={saving} onClick={onSave}
        className="rounded-md border bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" disabled={saving} onClick={onCancel}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:border-foreground/40 disabled:opacity-50">Cancel</button>
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
