"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RELATION_LABEL, type Reference, type Relation } from "@/lib/references";

interface Match {
  id: string;
  title: string;
  stage: string | null;
  lane: string | null;
  pending: boolean;
}

/**
 * Demands already in the funnel that resemble what the requester is typing — and,
 * more importantly, the place they record what they decided about them.
 *
 * The check used to ask "open one instead of duplicating?" and offer only a link.
 * A requester who looked, judged "related but not the same", and filed anyway had
 * their judgement thrown away: nothing in the funnel remembered that these two
 * demands had ever been compared. That is a direct cost against the portal's
 * central promise — every demand captured once — because the next person to look
 * has to make the same comparison from scratch.
 *
 * So the match list carries the two answers worth recording, and they travel with
 * the demand into its `## Related` section on save. Choosing neither is also fine:
 * silence is not a claim, and an unrecorded comparison is better than a wrong edge.
 */

/** The judgements a requester can make about a match, in the order they occur. */
const CHOICES: { relation: Relation; label: string; hint: string }[] = [
  { relation: "duplicate", label: "Duplicate", hint: "The same demand — triage should merge these." },
  { relation: "related", label: "Related", hint: "Different demands that touch the same thing." },
];

export function SimilarDemands({
  query,
  links,
  onLinksChange,
}: {
  query: string;
  /** Relations chosen so far. Omit both props to keep the read-only behaviour. */
  links?: Reference[];
  onLinksChange?: (refs: Reference[]) => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const editable = typeof onLinksChange === "function";
  const chosen = links ?? [];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setMatches([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/intake/similar?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { matches?: Match[] };
        if (alive) setMatches(data.matches ?? []);
      } catch {
        /* ignore */
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  if (matches.length === 0) return null;

  const relationFor = (id: string): Relation | undefined => chosen.find((r) => r.id === id)?.relation;

  function choose(id: string, relation: Relation) {
    if (!onLinksChange) return;
    const rest = chosen.filter((r) => r.id !== id);
    // Clicking the active choice clears it — a mis-click must be undoable, or
    // people stop clicking at all.
    if (relationFor(id) === relation) {
      onLinksChange(rest);
      return;
    }
    onLinksChange([...rest, { kind: "demand", id, relation, note: "flagged at intake" }]);
  }

  return (
    <div className="rounded-md border border-info/40 bg-info/5 p-2.5 text-xs">
      <div className="font-medium text-foreground">
        {editable
          ? "Possibly already captured — open one, then say how it relates."
          : "Possibly already captured — open one instead of duplicating?"}
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {matches.map((m) => {
          const active = relationFor(m.id);
          return (
            <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link href={`/uc/${m.id}`} target="_blank" className="font-mono underline hover:text-foreground">
                {m.id}
              </Link>
              <span className="text-muted-foreground">
                {m.title}
                {m.stage ? ` · ${m.stage}` : ""}
                {m.pending ? " · pending" : ""}
              </span>
              {editable && (
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {CHOICES.map((c) => (
                    <button
                      key={c.relation}
                      type="button"
                      title={c.hint}
                      aria-pressed={active === c.relation}
                      onClick={() => choose(m.id, c.relation)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        active === c.relation
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {editable && chosen.length > 0 && (
        <p className="mt-2 border-t border-info/30 pt-1.5 text-[11px] text-muted-foreground">
          {chosen.length === 1 ? "1 link" : `${chosen.length} links`} will be recorded on this demand:{" "}
          {chosen.map((r) => `${r.id} (${RELATION_LABEL[r.relation ?? "related"]})`).join(", ")}.
        </p>
      )}
    </div>
  );
}
