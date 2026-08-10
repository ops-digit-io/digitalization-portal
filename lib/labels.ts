/**
 * Pure English fallback label maps for the funnel enumerations.
 *
 * These live in a dependency-free module (NO `next/headers`, no React) so BOTH server
 * components (which translate via `getT()`) and client components (via `useI18n()`) can
 * import the fallback map without pulling a server-only dependency into a client bundle.
 * The translated strings live under `enum.*` in `lib/i18n.ts`; these are the defaults the
 * `t(key, fallback)` calls pass, and the source of truth for the canonical English word.
 */

import type { Lane } from "./types.js";

export const LANE_LABEL: Record<Lane, string> = {
  run: "run",
  regulatory: "regulatory",
  continuous_improvement: "continuous improvement",
  transform: "transform",
  innovation: "innovation",
  data_ai: "data / AI",
  local: "local",
};
