/**
 * Public library surface for the Opsphere core.
 *
 * The portal's route handlers and UI import from here. Everything below is pure,
 * server-safe logic — no route merges a pull request, no agent tool passes a gate.
 */

// Domain vocabulary
export * from "./types.js";

// Markdown / parsing
export { parseUseCase, parsePeople } from "./parse.js";
export type { ParsedUseCase, ParsedState, GateRow, ParseError, PeopleMap } from "./parse.js";
export { parseFirstTable, columnIndex, splitRow } from "./markdown.js";
export { matchEnumLoose } from "./enums.js";

// Lifecycle + taxonomies (data-driven seams)
export * from "./stages.js";
export * from "./lanes.js";
export * from "./value.js";

// Enforcement
export { canOpenGate, validateConfidence, stageAtOrAfter } from "./gates.js";
export type { GateDecision, GateCheckInput, BusinessCaseFacts } from "./gates.js";

// Authorization + identity
export { can, ROLES, CAPABILITIES, roleDef } from "./rbac.js";
export type { Capability, Role, RoleDef, Session, CanContext } from "./rbac.js";
export { resolveSession, isPortalMember } from "./session.js";

// Registry / board / visibility
export { parseRegistryIndex } from "./registry.js";
export type { RegistryRow } from "./registry.js";
export { serializeRegistryIndex, rowChanged } from "./reconcile.js";
export { assembleBoard } from "./board.js";
export type { Board, BoardCard, BoardFilter } from "./board.js";
export {
  boardVisibility,
  canSeeRestricted,
  toPublicSummary,
} from "./visibility.js";
export type { BoardVisibility, PublicSummary, RecordRoleEmails } from "./visibility.js";

// CODEOWNERS
export { generateCodeowners } from "./codeowners.js";
export type { CodeownersInput } from "./codeowners.js";

// Agent layer (extension seams)
export {
  ToolRegistry,
  ToolRegistrationError,
  FORBIDDEN_TOOL_CAPABILITIES,
  agentToolsEnabled,
} from "./agent/tools.js";
export type { AgentTool, AgentToolContext } from "./agent/tools.js";
export { createDefaultRegistry } from "./agent/registry.js";
export { loadSkill, loadPlaybook, declaredCapabilities } from "./agent/skills.js";
export type { Skill, Playbook } from "./agent/skills.js";
export { parseFrontmatter, metaList } from "./agent/frontmatter.js";
