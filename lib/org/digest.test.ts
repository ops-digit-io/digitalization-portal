/**
 * The org-context digest is what the analyst reads — so it must be present, bounded and
 * grounded in the real Department OS data (here, the bundled seed).
 */

import { describe, it, expect } from "vitest";
import { orgContextDigest } from "./digest";

describe("orgContextDigest", () => {
  it("summarises the org for a prompt: the seeded department, its purpose and a lane's autonomy", async () => {
    const digest = await orgContextDigest();
    expect(digest).toContain("ORGANIZATION CONTEXT (Department OS)");
    expect(digest).toContain("Operations Digitalization");
    // The seeded Connectivity Assessment lane runs at `recommend` — the autonomy signal.
    expect(digest).toMatch(/Connectivity Assessment \[recommend\]/);
    // Bounded — a digest for a prompt, not a dump.
    expect(digest.length).toBeLessThan(4000);
  });
});
