/**
 * Session resolution from identity-provider group claims (`docs/04-rbac.md §4.4`).
 *
 * Pure and deterministic: given the user's identifier and their IdP groups, it
 * produces the portal `Session` (roles + plant scopes). This is the seam the
 * Auth.js callback (M2) calls; keeping it a pure function means the whole trust
 * chain is unit-testable without a live OIDC provider.
 *
 * Plant scope comes from the group SUFFIX for plant-scoped roles: membership in
 * `DU-Portal-Champions-DE-ALD` grants the champion role scoped to plant DE-ALD.
 * (The spec applied this to gatekeepers; with gatekeeper removed, champion is the
 * plant-scoped role.) A base group with no suffix grants the role with no scope.
 */

import { ROLES, type Role, type Session } from "./rbac.js";

/** Resolve a portal session from the user id and their raw IdP group names. */
export function resolveSession(user: string, groups: readonly string[]): Session {
  const roles = new Set<Role>();
  const scopes = new Set<string>();

  for (const raw of groups) {
    const group = raw.trim();
    if (group === "") continue;

    for (const role of ROLES) {
      if (group === role.group) {
        // Exact base-group match: role granted, no plant scope from this group.
        roles.add(role.id);
      } else if (role.scope === "plant" && group.startsWith(`${role.group}-`)) {
        // Suffixed group: role granted, scoped to the plant in the suffix.
        const suffix = group.slice(role.group.length + 1).trim();
        if (suffix !== "") {
          roles.add(role.id);
          scopes.add(suffix);
        }
      }
    }
  }

  return { user, roles: [...roles], scopes: [...scopes] };
}

/** True if the resolved session holds any portal role at all (else → 403/redirect). */
export function isPortalMember(session: Session): boolean {
  return session.roles.length > 0;
}
