/**
 * Agent run traces (`docs/08-ai-architecture.md`, FR-6.5: every agent action is
 * traced and replayable). A trace records each step — model turns, tool calls,
 * tool results, and the tools that were WITHHELD (listed explicitly with the
 * reason, per `docs/16-ui.md §16.5 Traces`).
 */

export type TraceStepKind = "model" | "tool_call" | "tool_result" | "note" | "error";

export interface TraceStep {
  index: number;
  kind: TraceStepKind;
  label: string;
  detail?: string;
  usage?: { input: number; output: number };
}

export interface Trace {
  id: string;
  session: string;
  provider: string;
  live: boolean;
  /** Tools offered to this run. */
  toolsOffered: string[];
  /** Tools withheld and why (e.g. capability the session lacks, kill switch). */
  toolsWithheld: { name: string; reason: string }[];
  steps: TraceStep[];
  totalUsage: { input: number; output: number };
  startedAt: string;
  finishedAt?: string;
}

export class TraceRecorder {
  private step = 0;
  readonly trace: Trace;

  constructor(init: {
    id: string;
    session: string;
    provider: string;
    live: boolean;
    startedAt: string;
    toolsOffered: string[];
    toolsWithheld: { name: string; reason: string }[];
  }) {
    this.trace = {
      id: init.id,
      session: init.session,
      provider: init.provider,
      live: init.live,
      toolsOffered: init.toolsOffered,
      toolsWithheld: init.toolsWithheld,
      steps: [],
      totalUsage: { input: 0, output: 0 },
      startedAt: init.startedAt,
    };
  }

  add(kind: TraceStepKind, label: string, detail?: string, usage?: { input: number; output: number }): void {
    const step: TraceStep = { index: this.step++, kind, label };
    if (detail !== undefined) step.detail = detail;
    if (usage) {
      step.usage = usage;
      this.trace.totalUsage.input += usage.input;
      this.trace.totalUsage.output += usage.output;
    }
    this.trace.steps.push(step);
  }

  finish(finishedAt: string): Trace {
    this.trace.finishedAt = finishedAt;
    return this.trace;
  }
}
