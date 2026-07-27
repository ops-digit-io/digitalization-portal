/**
 * Outbound notifier — sends the review digest by email.
 *
 * Net-new and INERT-BUT-READY: `getNotifier()` returns null unless email is
 * configured, so the in-app /digest page works with zero infra. Dependency-free —
 * posts to an HTTP email API with `fetch` (Resend-shaped by default), matching the
 * repo's no-SDK ethos (no nodemailer/SMTP). Never throws out of `sendDigest`: a
 * failed send is counted, not fatal, so the cron stays idempotent and green.
 */

import type { Digest, DigestPerson } from "../digest/service.js";
import { REASON_LABEL } from "../digest/rules.js";

export interface NotifyResult {
  channel: string;
  /** Emails successfully accepted by the provider. */
  sent: number;
  /** Recipients skipped (no valid email) or that failed to send. */
  skipped: number;
  recipients: string[];
}

export interface Notifier {
  readonly channel: string;
  sendDigest(digest: Digest, opts?: { teamEmail?: string; appUrl?: string }): Promise<NotifyResult>;
}

/** A conservative email check — enough to avoid sending to a free-text name. */
export function isEmail(s: string | undefined): boolean {
  return !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function itemLine(item: Digest["items"][number], appUrl?: string): string {
  const reasons = item.reasons.map((r) => REASON_LABEL[r]).join(", ");
  const age = item.ageDays !== undefined ? ` · ${item.ageDays}d in stage` : "";
  const over = item.overdueDays !== undefined ? ` · ${item.overdueDays}d past review` : "";
  const label = `${item.id} — ${esc(item.title)} (${reasons}${age}${over})`;
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/uc/${item.id}` : undefined;
  return link ? `<li><a href="${link}">${label}</a></li>` : `<li>${label}</li>`;
}

function teamHtml(digest: Digest, appUrl?: string): string {
  const s = digest.summary;
  return [
    `<p><strong>${s.flagged}</strong> demand(s) need attention (${s.bySeverity.high} high, ${s.bySeverity.medium} medium, ${s.bySeverity.low} low).</p>`,
    `<ul>${digest.items.map((i) => itemLine(i, appUrl)).join("")}</ul>`,
    `<p style="color:#888;font-size:12px">Review digest · ${digest.generatedAt.slice(0, 10)} · surfaced for review, not auto-enforced.</p>`,
  ].join("");
}

function personHtml(person: DigestPerson, appUrl?: string): string {
  return [
    `<p>${person.items.length} demand(s) you're accountable for need a look:</p>`,
    `<ul>${person.items.map((i) => itemLine(i, appUrl)).join("")}</ul>`,
    `<p style="color:#888;font-size:12px">You're listed as an owner. If this has moved on, update the demand.</p>`,
  ].join("");
}

class EmailNotifier implements Notifier {
  readonly channel = "email";
  constructor(private readonly apiKey: string, private readonly from: string, private readonly apiUrl: string) {}

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [to], subject, html }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendDigest(digest: Digest, opts?: { teamEmail?: string; appUrl?: string }): Promise<NotifyResult> {
    let sent = 0;
    let skipped = 0;
    const recipients: string[] = [];

    if (digest.summary.flagged === 0) return { channel: this.channel, sent, skipped, recipients };

    // Team digest to the configured forum/ops address.
    if (isEmail(opts?.teamEmail)) {
      const ok = await this.send(opts!.teamEmail!, `Review digest — ${digest.summary.flagged} demand(s) need attention`, teamHtml(digest, opts?.appUrl));
      if (ok) { sent++; recipients.push(opts!.teamEmail!); } else skipped++;
    }

    // Per-demand nudges to each accountable person with a real email.
    for (const person of digest.byPerson) {
      if (!isEmail(person.email)) { skipped++; continue; }
      const ok = await this.send(person.email!, `${person.items.length} demand(s) need your review`, personHtml(person, opts?.appUrl));
      if (ok) { sent++; recipients.push(person.email!); } else skipped++;
    }

    return { channel: this.channel, sent, skipped, recipients };
  }
}

/** The active notifier, or null when email isn't configured (in-app digest only). */
export function getNotifier(env: Record<string, string | undefined> = process.env): Notifier | null {
  if (env.EMAIL_API_KEY && env.EMAIL_FROM) {
    return new EmailNotifier(env.EMAIL_API_KEY, env.EMAIL_FROM, env.EMAIL_API_URL ?? "https://api.resend.com/emails");
  }
  return null;
}
