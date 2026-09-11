/**
 * The launchpad is shaped by capability, and every tile has declared one.
 *
 * The coverage assertion is the load-bearing one: a tile without a capability
 * would silently default to "everybody", which is how a launchpad drifts into
 * offering an administrator's tools to a requester. TypeScript already requires
 * the field; this requires it to be a REAL capability and to be decided per tile.
 */

import { describe, it, expect } from "vitest";
import { LAUNCHPAD, ALL_TILES, launchpadFor } from "./launchpad";
import { CAPABILITIES, can, ROLES, type Capability, type Session } from "./rbac";

const session = (...roles: Session["roles"]): Session => ({ user: "a@x.com", roles, scopes: [] });
const forSession = (s: Session) => launchpadFor((c) => can(s, c));
const flat = (groups: ReturnType<typeof launchpadFor>) => groups.flatMap((g) => g.tiles);
const byId = (groups: ReturnType<typeof launchpadFor>, id: string) => flat(groups).find((t) => t.tile.id === id)!;

describe("every tile declares who it is for", () => {
  it("names a capability from the real capability set", () => {
    const bad = ALL_TILES.filter((t) => !CAPABILITIES.includes(t.capability));
    expect(bad.map((t) => t.id)).toEqual([]);
  });

  it("never declares `all` outside the admin tools", () => {
    // `all` is the admin capability; a tile claiming it is asserting the tool is
    // for administrators, which must be a deliberate and rare choice.
    const admin = ALL_TILES.filter((t) => t.capability === "all").map((t) => t.id);
    expect(admin.sort()).toEqual(["categories", "poc-templates", "settings", "traces", "usage"]);
  });

  it("plans every unbuilt tile against a milestone", () => {
    for (const tile of ALL_TILES.filter((t) => t.planned)) {
      expect(tile.planned!.milestone, tile.id).toMatch(/^[MN]\d+$/);
    }
  });
});

describe("the launchpad for a session", () => {
  it("shows every tile to everybody — locking is not hiding", () => {
    const requester = forSession(session("requester"));
    expect(flat(requester)).toHaveLength(ALL_TILES.length);
    expect(requester.map((g) => g.category)).toEqual(LAUNCHPAD.map((g) => g.category));
  });

  it("unlocks a requester's own tools and locks what their role cannot do", () => {
    const requester = forSession(session("requester"));
    expect(byId(requester, "intake").locked).toBe(false); // draft
    expect(byId(requester, "board").locked).toBe(false); // view_board
    expect(byId(requester, "settings").locked).toBe(true); // all
    expect(byId(requester, "triage").locked).toBe(true); // assign_lane
    expect(byId(requester, "value").locked).toBe(true); // view_all
  });

  it("unlocks triage and portfolio tools for the roles that hold them", () => {
    expect(byId(forSession(session("triage")), "triage").locked).toBe(false);
    expect(byId(forSession(session("portfolio_forum")), "backlog").locked).toBe(false);
    expect(byId(forSession(session("it_liaison")), "handovers").locked).toBe(false);
    expect(byId(forSession(session("reviewer")), "skill-library").locked).toBe(false);
  });

  it("unlocks everything for an admin, and nothing for a session with no roles", () => {
    expect(flat(forSession(session("admin"))).every((t) => !t.locked)).toBe(true);
    expect(flat(forSession(session())).every((t) => t.locked)).toBe(true);
  });

  it("leaves no tile unreachable by every shipped role", () => {
    // A tool nobody can open is either a missing role or a wrong capability.
    const unreachable = ALL_TILES.filter(
      (tile) => !ROLES.some((r) => can(session(r.id), tile.capability)),
    );
    expect(unreachable.map((t) => t.id)).toEqual([]);
  });

  it("keeps planned and locked as separate facts", () => {
    const admin = forSession(session("admin"));
    const traces = byId(admin, "traces");
    expect(traces.tile.planned).toBeDefined(); // unbuilt
    expect(traces.locked).toBe(false); // …but an admin would be allowed to open it
  });

  it("asks the predicate for exactly the capabilities the tiles declare", () => {
    const asked: Capability[] = [];
    launchpadFor((c) => (asked.push(c), true));
    expect(new Set(asked)).toEqual(new Set(ALL_TILES.map((t) => t.capability)));
  });
});
