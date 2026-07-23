/**
 * Visibility and redaction (`docs/04-rbac.md §4.8`).
 *
 * Default is **portfolio-transparent**: any authenticated member sees that a use
 * case exists — its title, plant, stage, and lane. Restricted content (business
 * cases, cost estimates, named individuals beyond the lead) is visible only to
 * `view_all` holders and to users named in the use case's record roles.
 * Confidential use cases appear on the board to `view_all` holders only.
 *
 * This is the server-side redaction the board API and detail API both apply, so
 * restricted fields never reach a browser that should not see them (NFR-3,
 * constraint #7).
 */

import { can, type Session } from "./rbac.js";
import type { RegistryRow } from "./registry.js";

export type BoardVisibility = "shown" | "hidden";

/**
 * The record-role emails on a use case, used to widen restricted visibility to
 * named individuals. Populated from the README `## People` table where available.
 */
export interface RecordRoleEmails {
  requester?: string;
  lead?: string;
  sponsor?: string;
  value_owner?: string;
  business_owner?: string;
  delivery_lead?: string;
  run_owner?: string;
}

function isNamedInRoles(session: Session, people: RecordRoleEmails | undefined): boolean {
  if (!people) return false;
  return Object.values(people).some((email) => email && email === session.user);
}

/** Whether a use case appears at all on the board for this session. */
export function boardVisibility(session: Session, row: RegistryRow): BoardVisibility {
  if (!can(session, "view_board")) return "hidden";
  if (row.confidential && !can(session, "view_all")) return "hidden";
  return "shown";
}

/**
 * Whether this session may see the use case's RESTRICTED content (cost figures,
 * business case, named individuals beyond the lead).
 */
export function canSeeRestricted(
  session: Session,
  row: RegistryRow,
  people?: RecordRoleEmails,
): boolean {
  if (can(session, "view_all")) return true;
  return isNamedInRoles(session, people);
}

/** Non-restricted, portfolio-transparent projection of a registry row. */
export interface PublicSummary {
  id: string;
  title: string;
  stage?: RegistryRow["stage"];
  lane?: RegistryRow["lane"];
  status?: RegistryRow["status"];
  plant?: string;
  domain?: string;
  level?: RegistryRow["level"];
  heat?: RegistryRow["heat"];
  since?: string;
  needsAttention?: boolean;
}

/**
 * Redact a registry row to the fields any member may see. Restricted fields
 * (sponsor, value figures) are dropped unless the caller has already checked
 * `canSeeRestricted` and wants the full row.
 */
export function toPublicSummary(row: RegistryRow): PublicSummary {
  const summary: PublicSummary = { id: row.id, title: row.title };
  if (row.stage) summary.stage = row.stage;
  if (row.lane) summary.lane = row.lane;
  if (row.status) summary.status = row.status;
  if (row.plant) summary.plant = row.plant;
  if (row.domain) summary.domain = row.domain;
  if (row.level) summary.level = row.level;
  if (row.heat) summary.heat = row.heat;
  if (row.since) summary.since = row.since;
  if (row.needsAttention) summary.needsAttention = row.needsAttention;
  return summary;
}
