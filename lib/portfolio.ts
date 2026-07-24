/**
 * Portfolio data source for the board and funnel views.
 *
 * One switch, the same one the intake store and skills registry use: when the
 * GitHub App is configured the portfolio is read LIVE from the `du-demands`
 * funnel (every case parsed into a board row on demand); otherwise it renders
 * from the bundled demo seed so the offline deploy still shows a full board.
 *
 * This is what closes the gap where the board looked rich but was disconnected
 * from the demands the portal actually captured — now a demand saved through
 * Intake appears on the board on the next request, live, not only after a
 * redeploy or only in the plain `/demands` table.
 *
 * `now` is the reference instant for stage-age / dwell. Live uses the wall clock;
 * the seed pins a fixed instant so the demo is deterministic. The pure assembly
 * functions (`assembleBoard`, `analyzeFunnel`) take `now` as an argument and never
 * read the clock themselves.
 */

import type { RegistryRow } from "./registry.js";
import { hasGitHubCredentials } from "./git/index.js";
import { listDemandRowsWithValue } from "./demands-store.js";

export interface PortfolioData {
  rows: RegistryRow[];
  /** ISO reference instant for stage-age / dwell computations. */
  now: string;
  /** True when rows came from the live `du-demands` funnel (GitHub), false for the local working tree. */
  live: boolean;
  /** Where the rows came from — the funnel repo (live) or the local workspace. */
  source: string;
}

/**
 * Load the portfolio rows for every board / funnel / analysis / value view.
 *
 * ALWAYS the real funnel — the demands the portal actually holds (`du-demands`
 * over GitHub when configured, else the local working tree). There is NO seed
 * fallback: an empty or thin funnel renders empty or thin, never fabricated. Value
 * figures come from real `business-case.md` artifacts (absent until a case has one).
 */
export async function loadPortfolioRows(): Promise<PortfolioData> {
  const github = hasGitHubCredentials();
  const rows = await listDemandRowsWithValue();
  return {
    rows,
    now: new Date().toISOString(),
    live: github,
    source: github ? (process.env.DEMANDS_REPO ?? "du-demands") : "local workspace",
  };
}
