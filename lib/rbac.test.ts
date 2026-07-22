import { describe, expect, it } from "vitest";
import { can, type Session } from "./rbac.js";

const requester: Session = { user: "req@example.com", roles: ["requester"], scopes: [] };
const champion: Session = { user: "champ@example.com", roles: ["champion"], scopes: ["DE-ALD"] };
const triage: Session = { user: "triage@example.com", roles: ["triage"], scopes: [] };
const forum: Session = { user: "forum@example.com", roles: ["portfolio_forum"], scopes: [] };
const itLiaison: Session = { user: "it@example.com", roles: ["it_liaison"], scopes: [] };
const admin: Session = { user: "admin@example.com", roles: ["admin"], scopes: [] };
const nobody: Session = { user: "ghost@example.com", roles: [], scopes: [] };

describe("basic capability grants", () => {
  it("requester can create and view own but not view all", () => {
    expect(can(requester, "create_uc")).toBe(true);
    expect(can(requester, "view_own")).toBe(true);
    expect(can(requester, "view_all")).toBe(false);
  });

  it("no-role session can do nothing", () => {
    expect(can(nobody, "view_board")).toBe(false);
    expect(can(nobody, "view_own")).toBe(false);
  });

  it("admin can do everything via `all`", () => {
    expect(can(admin, "kill")).toBe(true);
    expect(can(admin, "gate_pass", { gate: "G4" })).toBe(true);
    expect(can(admin, "reprioritize")).toBe(true);
  });
});

describe("plant scope constrains view_plant only", () => {
  it("champion sees their own plant", () => {
    expect(can(champion, "view_plant", { plant: "DE-ALD" })).toBe(true);
  });
  it("champion cannot view another plant", () => {
    expect(can(champion, "view_plant", { plant: "SK-PUC" })).toBe(false);
  });
});

describe("gate authority (no gatekeeper — forum holds G3–G7)", () => {
  it("triage may open G1 and G2 but not G3", () => {
    expect(can(triage, "gate_pass", { gate: "G1" })).toBe(true);
    expect(can(triage, "gate_pass", { gate: "G2" })).toBe(true);
    expect(can(triage, "gate_pass", { gate: "G3" })).toBe(false);
  });

  it("portfolio forum may open G3, G4, G5 (former gatekeeper gates) and G6, G7", () => {
    for (const g of ["G3", "G4", "G5", "G6", "G7"] as const) {
      expect(can(forum, "gate_pass", { gate: g })).toBe(true);
    }
  });

  it("gate_pass without a gate in context is refused", () => {
    expect(can(forum, "gate_pass")).toBe(false);
  });

  it("a viewer role cannot pass any gate", () => {
    expect(can(requester, "gate_pass", { gate: "G1" })).toBe(false);
  });
});

describe("self-approval", () => {
  it("refuses gate_pass when the actor is the use case requester", () => {
    expect(
      can(forum, "gate_pass", { gate: "G3", requester: "forum@example.com" }),
    ).toBe(false);
  });
  it("permits gate_pass when the requester is someone else", () => {
    expect(
      can(forum, "gate_pass", { gate: "G3", requester: "other@example.com" }),
    ).toBe(true);
  });
  it("refuses kill of one's own use case", () => {
    expect(can(forum, "kill", { requester: "forum@example.com" })).toBe(false);
  });
});

describe("handover acceptance", () => {
  it("IT liaison can accept a handover; forum cannot", () => {
    expect(can(itLiaison, "accept_handover")).toBe(true);
    expect(can(forum, "accept_handover")).toBe(false);
  });
});
