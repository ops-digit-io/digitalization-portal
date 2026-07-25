/**
 * Bounded-concurrency async map. Runs `fn` over `items` with at most `concurrency`
 * in flight, preserving input order in the result.
 *
 * The funnel/registry reads fan out one GitHub request per case/entry. Running them
 * sequentially makes a page wait N round-trips; running them all at once risks
 * GitHub's secondary rate limits and connection storms. A small pool (≈8) gives
 * near-parallel wall-clock while staying a good API citizen.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  const results = new Array<R>(n);
  let next = 0;
  const workerCount = Math.max(1, Math.min(concurrency, n));
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= n) return;
      results[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
