/**
 * Model pricing — turns token counts into money for the cost overview.
 *
 * Rates are per 1,000,000 tokens, in USD, as published for the first-party
 * Anthropic API (the OpenAI rows are the public list prices). They are a
 * DELIBERATELY SMALL, hand-maintained table: an estimate the portal can show is
 * worth more than a live billing integration nobody wired, and a wrong number
 * here is a cost estimate that reads high or low, never a broken page.
 *
 * Cache accounting follows Anthropic's model: a cache READ bills at a fraction
 * of the input rate, a cache WRITE at a premium over it. Both are derived from
 * the model's input rate so the table stays one number per direction.
 *
 * An unknown model returns `null` cost — shown as "—", never guessed. Costs are
 * always labelled an estimate in the UI.
 */

export interface Rate {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
}

/** Cache read is a tenth of the input rate; a 5-minute write is a 1.25× premium. */
const CACHE_READ_FACTOR = 0.1;
const CACHE_WRITE_FACTOR = 1.25;

/** Per-1M USD rates. Keyed by exact model id; prefix-matched as a fallback so a
 *  dated or suffixed variant still resolves to its family. */
export const RATES: Record<string, Rate> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-fable-5": { input: 10, output: 50 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "o3": { input: 2, output: 8 },
  "o3-mini": { input: 1.1, output: 4.4 },
};

/** The rate for a model id, or undefined when the table doesn't know it. Tries an
 *  exact match, then the longest known id that the given id starts with (so
 *  "claude-opus-5-20260101" still finds "claude-opus-5"). */
export function rateFor(model: string | undefined): Rate | undefined {
  if (!model) return undefined;
  if (RATES[model]) return RATES[model];
  const prefix = Object.keys(RATES)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? RATES[prefix] : undefined;
}

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

/**
 * The estimated USD cost of one call (or an aggregate) for a model. `null` when
 * the model isn't in the table — the caller shows "—" rather than a fiction.
 *
 * Input tokens and cache-write/read tokens are billed separately: Anthropic
 * reports cache reads and writes OUTSIDE `input_tokens`, so they are added on
 * top rather than folded in.
 */
export function estimateCost(model: string | undefined, t: TokenCounts): number | null {
  const rate = rateFor(model);
  if (!rate) return null;
  const perM = (tokens: number, usd: number) => (tokens / 1_000_000) * usd;
  return (
    perM(t.input, rate.input) +
    perM(t.output, rate.output) +
    perM(t.cacheRead ?? 0, rate.input * CACHE_READ_FACTOR) +
    perM(t.cacheWrite ?? 0, rate.input * CACHE_WRITE_FACTOR)
  );
}

/** Whether the pricing table can price this model — for the UI to flag estimates
 *  it cannot make. */
export function isPriced(model: string | undefined): boolean {
  return rateFor(model) !== undefined;
}
