/**
 * Lightweight text similarity for the funnel — enough to flag likely-duplicate
 * demands so they can be merged before two teams build the same thing. Pure and
 * dependency-free (token Jaccard), so it is unit-tested without a store and stays
 * deterministic. Not a semantic model — a cheap, explainable overlap signal.
 */

import type { RegistryRow } from "../registry.js";

const STOP = new Set([
  "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "at", "by", "with",
  "per", "from", "into", "über", "und", "der", "die", "das", "für", "von", "im",
]);

/** Normalize text into a set of meaningful tokens (lowercased, destopped, ≥3 chars). */
export function normalizeTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
  return new Set(tokens);
}

/** Jaccard overlap of two token sets: |A∩B| / |A∪B|, in [0,1]. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Similarity score of two rows over their id-free title text, in [0,1]. */
export function rowSimilarity(a: RegistryRow, b: RegistryRow): number {
  return jaccard(normalizeTokens(a.title), normalizeTokens(b.title));
}

export interface DuplicatePair {
  a: { id: string; title: string };
  b: { id: string; title: string };
  score: number;
}

/**
 * All row pairs whose title similarity is at least `threshold`, most similar first.
 * O(n²) over the funnel — fine for a portfolio, and the caller can cap `limit`.
 */
export function findDuplicatePairs(
  rows: readonly RegistryRow[],
  threshold = 0.4,
  limit = 20,
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const score = rowSimilarity(rows[i]!, rows[j]!);
      if (score >= threshold) {
        pairs.push({
          a: { id: rows[i]!.id, title: rows[i]!.title },
          b: { id: rows[j]!.id, title: rows[j]!.title },
          score: Math.round(score * 100) / 100,
        });
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score);
  return pairs.slice(0, limit);
}
