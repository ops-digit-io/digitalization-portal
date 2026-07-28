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
 *
 * "New plant means new RBAC": when `knownPlants` is supplied (the admin-managed plant
 * list), a suffix only grants a scope if it names a KNOWN plant — so a plant scope is
 * legitimate only once that plant exists, and the scope stored is the plant's canonical
 * spelling. The role membership is still granted (the user is a champion); they simply
 * hold no plant scope until the plant is added. Omit `knownPlants` to accept any suffix
 * (the original, unvalidated behaviour — kept so the pure function stays testable).
 */

import { ROLES, type Role, type Session } from "./rbac.js";

/** Resolve a portal session from the user id and their raw IdP group names. */
export function resolveSession(user: string, groups: readonly string[], knownPlants?: readonly string[]): Session {
  const roles = new Set<Role>();
  const scopes = new Set<string>();
  const validate = knownPlants !== undefined;
  const canonical = new Map((knownPlants ?? []).map((p) => [p.trim().toLowerCase(), p.trim()]));

  for (const raw of groups) {
    const group = raw.trim();
    if (group === "") continue;

    for (const role of ROLES) {
      if (group === role.group) {
        // Exact base-group match: role granted, no plant scope from this group.
        roles.add(role.id);
      } else if (role.scope === "plant" && group.startsWith(`${role.group}-`)) {
        // Suffixed group: role granted; scope only if the plant is known (when validating).
        const suffix = group.slice(role.group.length + 1).trim();
        if (suffix !== "") {
          roles.add(role.id);
          if (!validate) scopes.add(suffix);
          else {
            const known = canonical.get(suffix.toLowerCase());
            if (known) scopes.add(known);
          }
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
