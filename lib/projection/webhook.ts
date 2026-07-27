/**
 * GitHub webhook signature verification (`X-Hub-Signature-256`, HMAC-SHA256).
 * Pure and constant-time, so the webhook route can trust the payload came from
 * GitHub before it triggers a reconcile.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGithubSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
