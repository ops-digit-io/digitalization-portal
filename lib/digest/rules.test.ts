import { describe, it, expect } from "vitest";
import { selectDigestItems, type DigestDemand } from "./rules.js";
import { groupByPerson, summarize } from "./service.js";

const NOW = "2026-05-19T00:00:00Z";

const base: DigestDemand = { id: "UC-2026-0001", title: "X", stage: "S2", status: "active", people: {} };

describe("selectDigestItems", () => {
  it("flags a stalled active demand (>30 days in stage)", () => {
    const items = selectDigestItems([{ ...base, since: "2026-04-01" }], NOW); // 48 days
    expect(items).toHaveLength(1);
    expect(items[0]!.reasons).toContain("stalled");
    expect(items[0]!.ageDays).toBe(48);
  });

  it("does NOT flag a fresh demand", () => {
    expect(selectDigestItems([{ ...base, since: "2026-05-10" }], NOW)).toHaveLength(0); // 9 days
  });

  it("flags a past review date and computes overdue days; a future date does not flag", () => {
    const past = selectDigestItems([{ ...base, since: "2026-05-15", reviewOn: "2026-05-01" }], NOW);
    expect(past[0]!.reasons).toContain("past_review");
    expect(past[0]!.overdueDays).toBe(18);
    const future = selectDigestItems([{ ...base, since: "2026-05-15", reviewOn: "2026-09-01" }], NOW);
    expect(future).toHaveLength(0);
  });

  it("flags missing sponsor/value-owner only from S3+", () => {
    const s3 = selectDigestItems([{ ...base, stage: "S3", since: "2026-05-15", people: { requester: "a@x.com" } }], NOW);
    expect(s3[0]!.reasons).toContain("missing_owner");
    expect(s3[0]!.severity).toBe("high");
    const s2 = selectDigestItems([{ ...base, stage: "S2", since: "2026-05-15", people: {} }], NOW);
    expect(s2).toHaveLength(0); // no owner requirement before S3
  });

  it("flags an unreadable record as drift (high)", () => {
    const items = selectDigestItems([{ ...base, since: "2026-05-15", needsAttention: true }], NOW);
    expect(items[0]!.reasons).toContain("drift");
    expect(items[0]!.severity).toBe("high");
  });

  it("combines reasons and picks accountable owners", () => {
    const items = selectDigestItems([{ ...base, stage: "S4", since: "2026-03-01", reviewOn: "2026-05-01", people: { sponsor: "s@x.com" } }], NOW);
    expect(items[0]!.reasons).toEqual(expect.arrayContaining(["stalled", "past_review", "missing_owner"]));
    expect(items[0]!.accountable).toEqual([{ role: "sponsor", person: "s@x.com" }]);
  });

  it("sorts most-severe first", () => {
    const items = selectDigestItems(
      [
        { ...base, id: "UC-1", since: "2026-04-01" }, // stalled → medium
        { ...base, id: "UC-2", since: "2026-05-15", needsAttention: true }, // drift → high
      ],
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(["UC-2", "UC-1"]);
  });
});

describe("groupByPerson / summarize", () => {
  const items = selectDigestItems(
    [
      { ...base, id: "UC-1", stage: "S4", since: "2026-03-01", people: { sponsor: "s@x.com" } },
      { ...base, id: "UC-2", since: "2026-04-01", people: { sponsor: "s@x.com", requester: "Jane Doe" } },
    ],
    NOW,
  );

  it("groups by person and marks emails vs names", () => {
    const groups = groupByPerson(items);
    const sponsor = groups.find((g) => g.person === "s@x.com")!;
    expect(sponsor.email).toBe("s@x.com");
    expect(sponsor.items).toHaveLength(2);
    const jane = groups.find((g) => g.person === "Jane Doe")!;
    expect(jane.email).toBeUndefined(); // a name, not an email → team-only
  });

  it("summarizes counts by severity and reason", () => {
    const s = summarize(items);
    expect(s.flagged).toBe(2);
    expect(s.byReason.missing_owner).toBeGreaterThanOrEqual(1);
  });
});
