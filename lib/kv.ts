/**
 * Minimal KV client (Upstash/Vercel REST). Shared by the rate limiter and any other
 * feature that needs raw commands. Returns/throws exactly like the store backends;
 * `kvConfigured()` gates callers so they can fall back when KV isn't provisioned.
 */

export function kvConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

export async function kvCommand<T>(args: (string | number)[], env: Record<string, string | undefined> = process.env): Promise<T> {
  const url = (env.KV_REST_API_URL ?? "").replace(/\/$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${env.KV_REST_API_TOKEN ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify(args.map(String)),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { result: T }).result;
}

/**
 * Run several commands in ONE round trip (Upstash `/pipeline`). The usage meter
 * writes a handful of counters per model call; without this that would be a
 * handful of sequential HTTP requests on a hot path. Returns each command's
 * result in order. Throws only on a transport/HTTP failure — per-command errors
 * come back in the array, exactly as the REST pipeline reports them.
 */
export async function kvPipeline<T = unknown>(commands: (string | number)[][], env: Record<string, string | undefined> = process.env): Promise<T[]> {
  if (commands.length === 0) return [];
  const url = (env.KV_REST_API_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.KV_REST_API_TOKEN ?? ""}`, "content-type": "application/json" },
    body: JSON.stringify(commands.map((c) => c.map(String))),
  });
  if (!res.ok) throw new Error(`KV pipeline → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { result: T }[]).map((r) => r.result);
}
