/**
 * Chromium resolution for the capture scripts.
 *
 * Sandboxes and CI images ship a pre-installed Chromium under
 * PLAYWRIGHT_BROWSERS_PATH whose build number rarely matches the one the
 * installed Playwright expects, so Playwright's own resolver fails on a version
 * it could happily drive. Find any build under that root and use it; if there is
 * none, return no override and let Playwright resolve its own download. The
 * layout searched for is "chromium-<build>" → "chrome-linux" → the "chrome" binary.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";

/** Launch options for `chromium.launch()` — `{}` when Playwright should decide. */
export function launchOptions() {
  const direct = [
    join(ROOT, "chromium", "chrome-linux", "chrome"),
    join(ROOT, "chrome-linux", "chrome"),
  ].find((p) => existsSync(p));
  if (direct) return { executablePath: direct };

  let entries = [];
  try {
    entries = readdirSync(ROOT);
  } catch {
    return {};
  }
  // Prefer the full browser over the headless shell: the shell renders the same
  // pages but is the wrong tool for video, where we want the real compositor.
  const candidates = entries
    .filter((e) => e.startsWith("chromium-"))
    .concat(entries.filter((e) => e.startsWith("chromium_headless_shell-")))
    .map((e) => [join(ROOT, e, "chrome-linux", "chrome"), join(ROOT, e, "chrome-linux", "headless_shell")])
    .flat();

  const exe = candidates.find((p) => existsSync(p));
  return exe ? { executablePath: exe } : {};
}
