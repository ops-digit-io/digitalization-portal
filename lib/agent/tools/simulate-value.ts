/**
 * `simulate-value` — Feature 1's agent tool. The build plan's worked example of
 * an ADDITIVE capability, now backed by the shared deterministic engine
 * (`lib/simulation.ts`) and carrying a JSON Schema so a live model can call it.
 *
 * Output is a DRAFT markdown section destined for a pull request — never a
 * committed figure. Bound to `draft`; merges nothing, passes no gate.
 */

import type { AgentTool } from "../tools.js";
import { runValueSimulation, type SimulationInput, type SimulationOutput } from "../../simulation.js";

export const simulateValueTool: AgentTool<SimulationInput, SimulationOutput> = {
  name: "simulate-value",
  description:
    "Compute a P10/P50/P90 value band and an assumption tornado for a business case. Output is a draft section, never a committed figure.",
  capability: "draft",
  inputSchema: {
    type: "object",
    properties: {
      baseAnnualGross: { type: "number", description: "The base-case annual gross value in EUR." },
      assumptions: {
        type: "array",
        description: "The business case's assumptions.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            sensitivity: {
              type: "number",
              description: "Fractional impact (0–1) if this assumption fails to hold.",
            },
            tested: { type: "boolean" },
          },
          required: ["name", "sensitivity", "tested"],
        },
      },
    },
    required: ["baseAnnualGross", "assumptions"],
  },
  run(input) {
    return runValueSimulation(input);
  },
};
