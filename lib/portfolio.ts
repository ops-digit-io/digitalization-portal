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
import { listDemandRows } from "./demands-store.js";
import { SEED_ROWS, DEMO_NOW } from "./seed.js";

export interface PortfolioData {
  rows: RegistryRow[];
  /** ISO reference instant for stage-age / dwell computations. */
  now: string;
  /** True when rows came from the live `du-demands` funnel, false for the demo seed. */
  live: boolean;
  /** The funnel repo the rows came from, when live. */
  source?: string;
}

/**
 * Load the portfolio rows for board / funnel rendering. Live from `du-demands`
 * when the GitHub App is configured, else the demo seed.
 */
export async function loadPortfolioRows(): Promise<PortfolioData> {
  if (hasGitHubCredentials()) {
    const rows = await listDemandRows();
    return { rows, now: new Date().toISOString(), live: true, source: process.env.DEMANDS_REPO ?? "du-demands" };
  }
  return { rows: [...SEED_ROWS], now: DEMO_NOW, live: false };
}
