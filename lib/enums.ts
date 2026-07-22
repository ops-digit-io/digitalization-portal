/**
 * Case-insensitive enum matching, shared across the registry/board layer.
 * `lib/parse.ts` keeps its own copy to stay self-contained around the README
 * contract; everything else uses this.
 */

/** Return the canonical enum value matching `value` (case-insensitive), or undefined. */
export function matchEnumLoose<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  const lower = value.trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === lower);
}
