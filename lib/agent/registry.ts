/**
 * The default agent tool registry. This is the ONE place tools are wired up;
 * adding a capability to the agent is adding a line here (plus its tool file).
 *
 * Every tool passes the registration invariant (no gate/merge/decision
 * capability), enforced by `ToolRegistry.register`. The M5 read-only set is
 * `portfolio-query`; `simulate-value` demonstrates a later additive tool.
 */

import { ToolRegistry } from "./tools.js";
import { portfolioQueryTool } from "./tools/portfolio-query.js";
import { simulateValueTool } from "./tools/simulate-value.js";

export function createDefaultRegistry(): ToolRegistry {
  return new ToolRegistry().register(portfolioQueryTool).register(simulateValueTool);
}
