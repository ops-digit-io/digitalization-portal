/**
 * Outbound channels — how the review digest leaves the portal (N4).
 *
 * INERT-BUT-READY: `getNotifiers()` returns only the channels the environment has
 * configured, and an empty list is a valid state — the in-app /digest page works
 * with zero infra. Dependency-free: every channel posts with `fetch`, matching the
 * repo's no-SDK ethos (no nodemailer, no vendor client). Never throws out of
 * `sendDigest`: a failed send is counted, not fatal, so the cron stays idempotent
 * and green whichever channel is having a bad day.
 *
 * Two channels ship, and they carry DIFFERENT payloads on purpose:
 *
 *   email    the team digest to a forum address, plus a private nudge to each
 *            accountable person.
 *   webhook  the team digest ONLY, to a shared Teams/Slack channel.
 *
 * A shared channel never receives the per-person nudges. Posting "Jane has four
 * demands needing review" into a room is a statement about a person in front of
 * an audience, and this portal's people-facing rule (`docs/MAP.md §4`) is that a
 * finding is about the organisation's work, never about a person. The nudge is
 * addressed to the one human who can act on it; the room gets the portfolio.
 */

import type { Digest, DigestPerson } from "../digest/service.js";
import { REASON_LABEL } from "../digest/rules.js";

export interface NotifyResult {
  channel: string;
  /** Messages successfully accepted by the provider. */
  sent: number;
  /** Recipients skipped (no valid address) or that failed to send. */
  skipped: number;
  /** Where it went — an address, or a channel name for a webhook. */
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

/* ----------------------------------------------------------------- webhook */

/**
 * The payload shape a chat webhook expects. Slack and anything Slack-shaped take a
 * bare `{ text }`; Microsoft Teams (Workflows / Power Automate, the path that
 * replaced the retiring Office 365 connectors) takes an Adaptive Card wrapped in a
 * message envelope. Detected from the URL so the common case needs no setting,
 * overridable when the host is a proxy or a gateway that hides its provider.
 */
export type WebhookFormat = "slack" | "teams";

export function webhookFormat(url: string, override?: string): WebhookFormat {
  const o = (override ?? "").trim().toLowerCase();
  if (o === "slack" || o === "teams") return o;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "slack"; // an unparseable URL will fail at send; `{text}` is the safer guess
  }
  const teams = ["logic.azure.com", "webhook.office.com", "office.com", "azure.com"];
  return teams.some((h) => host === h || host.endsWith(`.${h}`)) ? "teams" : "slack";
}

/** A chat channel is a summary surface, not a report — long lists get truncated. */
const MAX_WEBHOOK_ITEMS = 15;

/** The team digest as plain text — the one message a shared channel receives. */
export function webhookText(digest: Digest, appUrl?: string): string {
  const s = digest.summary;
  const base = appUrl?.replace(/\/$/, "");
  const head = `${s.flagged} demand(s) need attention — ${s.bySeverity.high} high, ${s.bySeverity.medium} medium, ${s.bySeverity.low} low.`;
  const lines = digest.items.slice(0, MAX_WEBHOOK_ITEMS).map((item) => {
    const reasons = item.reasons.map((r) => REASON_LABEL[r]).join(", ");
    const where = base ? `${base}/uc/${item.id}` : item.id;
    return `• ${item.id} — ${item.title} (${reasons}) ${where}`;
  });
  const more = digest.items.length > MAX_WEBHOOK_ITEMS ? [`…and ${digest.items.length - MAX_WEBHOOK_ITEMS} more.`] : [];
  const foot = base ? `Review digest · ${digest.generatedAt.slice(0, 10)} · ${base}/digest` : `Review digest · ${digest.generatedAt.slice(0, 10)}`;
  return [head, ...lines, ...more, foot].join("\n");
}

export function webhookBody(format: WebhookFormat, digest: Digest, appUrl?: string): unknown {
  const text = webhookText(digest, appUrl);
  if (format === "slack") return { text };
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: "Review digest", weight: "Bolder", size: "Medium" },
            { type: "TextBlock", text, wrap: true },
          ],
        },
      },
    ],
  };
}

/**
 * Posts the team digest to one chat webhook. The TEAM digest only — see the module
 * note: per-person nudges are not for a shared room.
 */
class WebhookNotifier implements Notifier {
  readonly channel = "webhook";
  constructor(
    private readonly url: string,
    private readonly format: WebhookFormat,
    /** What to call the destination in the result — never the URL, which carries a secret. */
    private readonly label: string,
  ) {}

  async sendDigest(digest: Digest, opts?: { teamEmail?: string; appUrl?: string }): Promise<NotifyResult> {
    const nothing = { channel: this.channel, sent: 0, skipped: 0, recipients: [] };
    if (digest.summary.flagged === 0) return nothing;
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookBody(this.format, digest, opts?.appUrl)),
      });
      return res.ok
        ? { channel: this.channel, sent: 1, skipped: 0, recipients: [this.label] }
        : { channel: this.channel, sent: 0, skipped: 1, recipients: [] };
    } catch {
      return { channel: this.channel, sent: 0, skipped: 1, recipients: [] };
    }
  }
}

/* ------------------------------------------------------------------ wiring */

/**
 * Every configured outbound channel, in delivery order. An EMPTY LIST IS NORMAL:
 * with nothing configured the digest is an in-app page and the cron reports zero
 * sends rather than failing. Adding a channel is a class and one line here.
 */
export function getNotifiers(env: Record<string, string | undefined> = process.env): Notifier[] {
  const out: Notifier[] = [];
  if (env.EMAIL_API_KEY && env.EMAIL_FROM) {
    out.push(new EmailNotifier(env.EMAIL_API_KEY, env.EMAIL_FROM, env.EMAIL_API_URL ?? "https://api.resend.com/emails"));
  }
  const url = env.DIGEST_WEBHOOK_URL?.trim();
  if (url) {
    const format = webhookFormat(url, env.DIGEST_WEBHOOK_FORMAT);
    out.push(new WebhookNotifier(url, format, env.DIGEST_WEBHOOK_NAME?.trim() || `${format} channel`));
  }
  return out;
}

/** Send one digest through every configured channel. One channel's failure never
 *  stops another's: each `sendDigest` already absorbs its own errors, and this
 *  guards the unexpected so the cron cannot be taken down by a notifier. */
export async function sendDigestEverywhere(
  digest: Digest,
  opts?: { teamEmail?: string; appUrl?: string },
  env: Record<string, string | undefined> = process.env,
): Promise<NotifyResult[]> {
  const notifiers = getNotifiers(env);
  const results: NotifyResult[] = [];
  for (const n of notifiers) {
    try {
      results.push(await n.sendDigest(digest, opts));
    } catch {
      results.push({ channel: n.channel, sent: 0, skipped: 1, recipients: [] });
    }
  }
  return results;
}
