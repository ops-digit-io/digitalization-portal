"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Match {
  id: string;
  title: string;
  stage: string | null;
  lane: string | null;
  pending: boolean;
}

/**
 * Shows demands already in the funnel that resemble what the requester is typing,
 * so they can link/upvote instead of creating a duplicate. Debounced; silent until
 * there's a match. Reads the funnel through /api/intake/similar (committed + pending).
 */
export function SimilarDemands({ query }: { query: string }) {
  const [matches, setMatches] = useState<Match[]>([]);

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

  return (
    <div className="rounded-md border border-info/40 bg-info/5 p-2.5 text-xs">
      <div className="font-medium text-foreground">Possibly already captured — open one instead of duplicating?</div>
      <ul className="mt-1 space-y-0.5">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={`/uc/${m.id}`} target="_blank" className="font-mono underline hover:text-foreground">{m.id}</Link>{" "}
            <span className="text-muted-foreground">
              {m.title}
              {m.stage ? ` · ${m.stage}` : ""}
              {m.pending ? " · pending" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
