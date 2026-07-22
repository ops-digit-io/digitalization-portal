/**
 * Authorization — roles, capabilities, and `can()` (`docs/04-rbac.md §4.3, §4.4`).
 *
 * ADAPTED per a locked build decision: **no `gatekeeper` role.** The spec scopes
 * G3–G5 authority to plant-scoped gatekeepers; here that role is removed and its
 * gate authority moves to the (unscoped) portfolio forum. Consequences:
 *   - plant scope governs `view_plant` only — it never gates a `gate_pass`;
 *   - multi-plant gate rules are moot (the remaining gate authority is unscoped).
 *
 * Authorization roles (capability) are distinct from record roles (accountability
 * fields on the use case). Being named sponsor grants no merge rights, and the
 * portal never infers one from the other.
 *
 * Extensibility seam: roles and capabilities are data. Adding a capability is a
 * `CAPABILITIES` entry plus a reference here; `registry/rbac.md` mirrors these
 * tables for the humans who maintain them, and changes there require a second
 * approver (`§4.5`).
 */

import { type Gate } from "./types.js";

export type Capability =
  | "create_uc"
  | "view_own"
  | "view_plant"
  | "view_all"
  | "view_board"
  | "assign_lane"
  | "gate_pass"
  | "park"
  | "kill"
  | "draft"
  | "comment"
  | "link_uc"
  | "accept_handover"
  | "reprioritize"
  | "all";

export const CAPABILITIES: readonly Capability[] = [
  "create_uc",
  "view_own",
  "view_plant",
  "view_all",
  "view_board",
  "assign_lane",
  "gate_pass",
  "park",
  "kill",
  "draft",
  "comment",
  "link_uc",
  "accept_handover",
  "reprioritize",
  "all",
];

/** Authorization roles (gatekeeper removed per the locked decision). */
export type Role =
  | "requester"
  | "champion"
  | "triage"
  | "reviewer"
  | "portfolio_forum"
  | "it_liaison"
  | "admin";

export type ScopeKind = "none" | "plant" | "unscoped";

export interface RoleDef {
  id: Role;
  /** Identity-provider group whose membership grants this role. */
  group: string;
  capabilities: Capability[];
  scope: ScopeKind;
  /** Gates this role may open a pull request for. */
  gates: Gate[];
}

/**
 * Capabilities that plant scope constrains. Only view reach is plant-scoped;
 * gate authority is not (there is no gatekeeper). Keeping this explicit means a
 * future scoped capability is a one-line change, not a rework of `can()`.
 */
const PLANT_SCOPED_CAPABILITIES: ReadonlySet<Capability> = new Set(["view_plant"]);

export const ROLES: readonly RoleDef[] = [
  {
    id: "requester",
    group: "DU-Portal-AllStaff",
    capabilities: ["create_uc", "view_own", "view_board", "draft", "comment"],
    scope: "none",
    gates: [],
  },
  {
    id: "champion",
    group: "DU-Portal-Champions",
    capabilities: ["create_uc", "view_board", "view_plant", "draft", "comment"],
    scope: "plant",
    gates: [],
  },
  {
    id: "triage",
    group: "DU-Portal-Triage",
    capabilities: ["view_all", "view_board", "assign_lane", "gate_pass", "draft", "comment", "park", "link_uc"],
    scope: "unscoped",
    gates: ["G1", "G2"],
  },
  {
    id: "reviewer",
    group: "DU-Portal-Reviewers",
    capabilities: ["view_all", "view_board", "comment", "draft"],
    scope: "unscoped",
    gates: [],
  },
  {
    // Absorbs the former gatekeeper's G3–G5 authority. Unscoped by design.
    id: "portfolio_forum",
    group: "DU-Portal-PortfolioForum",
    capabilities: ["view_all", "view_board", "gate_pass", "park", "kill", "reprioritize", "comment"],
    scope: "unscoped",
    gates: ["G2", "G3", "G4", "G5", "G6", "G7"],
  },
  {
    id: "it_liaison",
    group: "DU-Portal-IT",
    capabilities: ["view_all", "view_board", "comment", "accept_handover", "draft"],
    scope: "none",
    gates: [],
  },
  {
    id: "admin",
    group: "DU-Portal-Admins",
    capabilities: ["all"],
    scope: "unscoped",
    gates: ["G1", "G2", "G3", "G4", "G5", "G6", "G7"],
  },
] as const;

export function roleDef(role: Role): RoleDef | undefined {
  return ROLES.find((r) => r.id === role);
}

export interface Session {
  user: string;
  roles: Role[];
  /** Plant codes in scope, e.g. ["DE-ALD"]. Empty for unscoped or scope-less roles. */
  scopes: string[];
}

export interface CanContext {
  plant?: string;
  gate?: Gate;
  useCase?: string;
  /** The use case's requester email, for the self-approval rule. */
  requester?: string;
}

function roleGrants(role: RoleDef, capability: Capability): boolean {
  return role.capabilities.includes("all") || role.capabilities.includes(capability);
}

/**
 * Central authorization check (`§4.4`, adapted):
 *
 *   can = role grants capability
 *       ∧ (capability ≠ gate_pass ∨ some role permits context.gate)
 *       ∧ (capability not plant-scoped ∨ context.plant ∈ session.scopes)
 *       ∧ ¬ self-approval on one's own use case
 */
export function can(session: Session, capability: Capability, context: CanContext = {}): boolean {
  const roles = session.roles.map(roleDef).filter((r): r is RoleDef => r !== undefined);
  if (roles.length === 0) return false;

  // Admin shortcut: the `all` capability satisfies everything.
  if (roles.some((r) => r.capabilities.includes("all"))) return true;

  if (!roles.some((r) => roleGrants(r, capability))) return false;

  // Gate authority: some role that grants gate_pass must list this gate.
  if (capability === "gate_pass") {
    if (!context.gate) return false;
    const gatePermitted = roles.some(
      (r) => roleGrants(r, "gate_pass") && r.gates.includes(context.gate!),
    );
    if (!gatePermitted) return false;
  }

  // Plant scope: only constrains view_plant. A scoped role must hold the plant.
  if (PLANT_SCOPED_CAPABILITIES.has(capability)) {
    if (!context.plant || !session.scopes.includes(context.plant)) return false;
  }

  // Separation of duties: the requester may not approve their own use case.
  if ((capability === "gate_pass" || capability === "kill") && context.requester) {
    if (context.requester === session.user) return false;
  }

  return true;
}
