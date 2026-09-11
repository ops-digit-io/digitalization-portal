import { describe, it, expect, vi, afterEach } from "vitest";
import { getNotifiers, isEmail, webhookFormat, webhookText, webhookBody, sendDigestEverywhere } from "./index.js";
import type { Digest } from "../digest/service.js";

const EMAIL = { EMAIL_API_KEY: "k", EMAIL_FROM: "DU <du@x.com>" };
const HOOK = { DIGEST_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/xyz" };

const digest = (flagged: number): Digest => ({
  generatedAt: "2026-09-11T07:00:00.000Z",
  items: Array.from({ length: flagged }, (_, i) => ({
    id: `UC-2026-00${i + 1}`,
    title: `Demand ${i + 1}`,
    reasons: ["stalled" as const],
    accountable: [],
    severity: "high" as const,
  })),
  byPerson: [{ person: "Jane", email: "jane@x.com", items: [] }],
  summary: {
    flagged,
    bySeverity: { high: flagged, medium: 0, low: 0 },
    byReason: { stalled: flagged, past_review: 0, missing_owner: 0, drift: 0, parked_overdue: 0 },
  },
});

afterEach(() => vi.unstubAllGlobals());

/** Stub fetch, recording every request, answering with the given status. */
function stubFetch(status = 200) {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: status < 400, status } as Response;
  });
  return calls;
}

describe("configured channels", () => {
  it("is empty (inert) when nothing is configured", () => {
    expect(getNotifiers({})).toEqual([]);
    expect(getNotifiers({ EMAIL_API_KEY: "k" })).toEqual([]); // needs FROM too
  });

  it("carries each channel the environment configures, and both together", () => {
    expect(getNotifiers(EMAIL).map((n) => n.channel)).toEqual(["email"]);
    expect(getNotifiers(HOOK).map((n) => n.channel)).toEqual(["webhook"]);
    expect(getNotifiers({ ...EMAIL, ...HOOK }).map((n) => n.channel)).toEqual(["email", "webhook"]);
  });
});

describe("webhook format detection", () => {
  it("reads the provider off the URL", () => {
    expect(webhookFormat("https://hooks.slack.com/services/T/B/x")).toBe("slack");
    expect(webhookFormat("https://prod-12.westeurope.logic.azure.com/workflows/x")).toBe("teams");
    expect(webhookFormat("https://acme.webhook.office.com/webhookb2/x")).toBe("teams");
  });

  it("prefers an explicit override, and falls back rather than throwing", () => {
    expect(webhookFormat("https://hooks.slack.com/x", "teams")).toBe("teams");
    expect(webhookFormat("https://gateway.internal/hook", "SLACK")).toBe("slack");
    expect(webhookFormat("not a url")).toBe("slack");
    expect(webhookFormat("https://gateway.internal/hook", "nonsense")).toBe("slack");
  });
});

describe("the webhook payload", () => {
  it("summarises the portfolio and links each demand", () => {
    const text = webhookText(digest(2), "https://portal.example.com/");
    expect(text).toContain("2 demand(s) need attention");
    expect(text).toContain("https://portal.example.com/uc/UC-2026-001");
    expect(text).not.toContain("//uc/"); // the trailing slash is trimmed once
  });

  it("truncates a long list rather than pasting a report into a chat room", () => {
    const text = webhookText(digest(20));
    expect(text).toContain("…and 5 more.");
    expect(text.split("\n").filter((l) => l.startsWith("•"))).toHaveLength(15);
  });

  it("shapes itself per provider", () => {
    expect(webhookBody("slack", digest(1))).toHaveProperty("text");
    const teams = webhookBody("teams", digest(1)) as { attachments: { contentType: string }[] };
    expect(teams.attachments[0]!.contentType).toBe("application/vnd.microsoft.card.adaptive");
  });
});

describe("sending", () => {
  it("posts the team digest to the webhook — and never a per-person nudge", async () => {
    const calls = stubFetch();
    const results = await sendDigestEverywhere(digest(1), { appUrl: "https://p.example.com" }, HOOK);
    expect(results).toEqual([{ channel: "webhook", sent: 1, skipped: 0, recipients: ["slack channel"] }]);
    expect(calls).toHaveLength(1); // one team message, not one per accountable person
    expect(JSON.stringify(calls[0]!.body)).not.toContain("jane@x.com");
  });

  it("never echoes the webhook URL, which carries the secret", async () => {
    stubFetch();
    const [result] = await sendDigestEverywhere(digest(1), {}, { ...HOOK, DIGEST_WEBHOOK_NAME: "#digital-unit" });
    expect(result!.recipients).toEqual(["#digital-unit"]);
    expect(JSON.stringify(result)).not.toContain("hooks.slack.com");
  });

  it("says nothing at all when nothing is flagged", async () => {
    const calls = stubFetch();
    const results = await sendDigestEverywhere(digest(0), {}, { ...EMAIL, ...HOOK });
    expect(calls).toEqual([]);
    expect(results.every((r) => r.sent === 0)).toBe(true);
  });

  it("counts a rejected send instead of throwing, so the cron stays green", async () => {
    stubFetch(500);
    const results = await sendDigestEverywhere(digest(1), {}, HOOK);
    expect(results).toEqual([{ channel: "webhook", sent: 0, skipped: 1, recipients: [] }]);
  });

  it("keeps delivering to the other channels when one is unreachable", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("slack")) throw new Error("connection reset");
      return { ok: true, status: 200 } as Response;
    });
    const results = await sendDigestEverywhere(digest(1), { teamEmail: "forum@x.com" }, { ...EMAIL, ...HOOK });
    expect(results.find((r) => r.channel === "email")!.sent).toBeGreaterThan(0);
    expect(results.find((r) => r.channel === "webhook")).toEqual({ channel: "webhook", sent: 0, skipped: 1, recipients: [] });
  });
});

describe("isEmail", () => {
  it("accepts real emails and rejects free-text names", () => {
    expect(isEmail("a@x.com")).toBe(true);
    expect(isEmail("Jane Doe")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail("<!-- required before G3 -->")).toBe(false);
  });
});
