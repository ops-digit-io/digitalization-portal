import { describe, it, expect } from "vitest";
import { editDemand, canEditDemand } from "./demand-edit.js";
import { buildDemand, parseDemandToAnswers, EMPTY_ANSWERS } from "./demand.js";
import { parseUseCase, parsePeople } from "./parse.js";
import type { Session } from "./rbac.js";

/** A demand that has already progressed: triaged lane, a passed gate, named owners,
 *  and two history lines — exactly the state `editDemand` must not disturb. */
function advanced(): string {
  const base = buildDemand(
    { id: "UC-2026-0090", createdOn: "2026-06-01", lane: "data_ai" },
    { ...EMPTY_ANSWERS, title: "Vision QC", plant: "DE-ALD", domain: "quality",
      problem: "Manual inspection misses defects", currentPain: "3% scrap", desiredOutcome: "Cut scrap by half",
      requester: "req@example.com" },
  );
  // Advance it a little: pass G1, set owners, add a history line.
  return base
    .replace("| G1 Intake accepted | open | | | |", "| G1 Intake accepted | passed | 2026-06-05 | champ@example.com | ok |")
    .replace("- **Stage:** S1", "- **Stage:** S2")
    .replace("| Sponsor | <!-- required before G3 --> |", "| Sponsor | boss@example.com |")
    .replace("| Value owner | <!-- required before G3 --> |", "| Value owner | vo@example.com |")
    .replace(
      "- 2026-06-01 — captured via portal intake (s1-intake playbook)",
      "- 2026-06-01 — captured via portal intake (s1-intake playbook)\n- 2026-06-05 — G1 passed by champ@example.com",
    );
}

const opts = { actor: "editor@example.com", date: "2026-07-10" };

describe("editDemand", () => {
  it("patches a prose section without touching stage, gates, lane, or history", () => {
    const md = advanced();
    const res = editDemand(md, { problem: "Rewritten problem statement" }, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const p = parseUseCase(res.markdown);
    expect(p.state.stage).toBe("S2");
    expect(p.state.lane).toBe("data_ai");
    expect(p.gates.find((g) => g.id === "G1")?.status).toBe("passed");
    // Prior history preserved, new line appended.
    expect(res.markdown).toContain("2026-06-05 — G1 passed by champ@example.com");
    expect(res.markdown).toContain("2026-07-10 — edited (Problem) by editor@example.com");
    // The new prose landed.
    expect(parseDemandToAnswers(res.markdown).problem).toBe("Rewritten problem statement");
    expect(res.changed).toEqual(["Problem"]);
  });

  it("edits the title while keeping the UC-id prefix", () => {
    const res = editDemand(advanced(), { title: "Vision QC v2" }, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.markdown).toMatch(/^#\s+UC-2026-0090\s+·\s+Vision QC v2$/m);
  });

  it("edits plant/domain in ## State and owners in ## People", () => {
    const res = editDemand(advanced(), { plant: "SK-PUC", domain: "maintenance", sponsor: "newboss@example.com", value_owner: "newvo@example.com" }, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = parseUseCase(res.markdown);
    expect(p.state.plant).toBe("SK-PUC");
    expect(p.state.domain).toBe("maintenance");
    const people = parsePeople(res.markdown);
    expect(people.sponsor).toBe("newboss@example.com");
    expect(people.value_owner).toBe("newvo@example.com");
    // Requester untouched.
    expect(people.requester).toBe("req@example.com");
  });

  it("refuses to blank a required field", () => {
    const res = editDemand(advanced(), { problem: "" }, opts);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/required/i);
  });

  it("refuses when nothing changed", () => {
    const res = editDemand(advanced(), { problem: "Manual inspection misses defects" }, opts);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toMatch(/nothing changed/i);
  });

  it("records every changed field in the history line", () => {
    const res = editDemand(advanced(), { desiredOutcome: "New outcome", sponsor: "s2@example.com" }, opts);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.changed).toContain("Desired outcome");
    expect(res.changed).toContain("sponsor");
    expect(res.markdown).toContain("2026-07-10 — edited (Desired outcome, sponsor) by editor@example.com");
  });
});

describe("canEditDemand", () => {
  const md = advanced(); // requester = req@example.com
  const session = (user: string, roles: Session["roles"]): Session => ({ user, roles, scopes: [] });

  it("lets the named requester edit their own demand (draft, no view-all)", () => {
    expect(canEditDemand(session("req@example.com", ["requester"]), md)).toBe(true);
  });

  it("lets a view-all role edit any demand", () => {
    expect(canEditDemand(session("triager@example.com", ["triage"]), md)).toBe(true);
  });

  it("blocks a drafting user who is neither the requester nor view-all", () => {
    expect(canEditDemand(session("someone@example.com", ["requester"]), md)).toBe(false);
  });

  it("blocks a user without the draft capability", () => {
    // No role at all → no draft.
    expect(canEditDemand(session("req@example.com", []), md)).toBe(false);
  });
});
