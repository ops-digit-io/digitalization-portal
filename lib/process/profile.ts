/**
 * Assembles the one-page Prozess-Gesundheitsprofil for an engagement from its
 * stored ratings (git-backed store → health-model).
 */

import * as store from "./store";
import { healthProfile, type ProfileInput, type HealthProfile } from "./health-model";

export async function profileOf(slug: string): Promise<HealthProfile> {
  const [m, r] = await Promise.all([store.meta(slug), store.ratings(slug)]);
  const components = (m?.components ?? []).map((c) => ({ id: c.id, label: c.label, ratings: r.components[c.id] || {} }));
  const input: ProfileInput = { ratings: r.criteria, ...(components.length ? { components } : {}) };
  return healthProfile(input);
}
