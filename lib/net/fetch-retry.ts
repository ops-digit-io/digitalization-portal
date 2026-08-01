/**
 * Bounded, transient-only retry around `fetch`, shared by the GitHub host and
 * the model providers — the two seams every module in the portal stands on.
 *
 * Scope is deliberately narrow. Retried: network failures, per-attempt
 * timeouts, and the statuses that mean "try again" (408, 429, 5xx and
 * Anthropic's 529). Never retried: 4xx that mean "you are wrong" — a 401 does
 * not get better by asking twice, and retrying a 422 turns one clear error
 * into three slow ones.
 *
 * Every attempt carries its own timeout: a hung socket must fail the attempt,
 * not the whole route. `Retry-After` is honoured but capped — this runs inside
 * request handlers, and "the server said wait 90 s" is a reason to fail fast,
 * not to hold a connection open.
 */

export interface RetryOptions {
  /** Total attempts, first try included. Default 3. */
  attempts?: number;
  /** Base backoff in ms; attempt n waits base·2^(n-1). Default 400. */
  baseMs?: number;
  /** Per-attempt timeout in ms. Default 15 000. */
  timeoutMs?: number;
  /** Cap on a server-sent Retry-After, ms. Default 5 000. */
  retryAfterCapMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 529 || (status >= 500 && status < 600);
}

function retryAfterMs(res: Response, cap: number): number | null {
  const h = res.headers.get("retry-after");
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.min(Math.max(0, secs * 1000), cap);
  const at = Date.parse(h);
  return Number.isNaN(at) ? null : Math.min(Math.max(0, at - Date.now()), cap);
}

/**
 * `fetch` with bounded retry. Returns the last `Response` (ok or not) once out
 * of attempts — status handling stays the caller's job — and throws only when
 * every attempt failed at the network level.
 */
export async function fetchRetry(url: string, init: RequestInit, opts: RetryOptions = {}): Promise<Response> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseMs = opts.baseMs ?? 400;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const cap = opts.retryAfterCapMs ?? 5_000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!isTransientStatus(res.status) || attempt === attempts) return res;
      lastError = new Error(`HTTP ${res.status}`);
      // Drain the body so the socket can be reused before the retry.
      await res.arrayBuffer().catch(() => undefined);
      await sleep(retryAfterMs(res, cap) ?? baseMs * 2 ** (attempt - 1));
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      await sleep(baseMs * 2 ** (attempt - 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
