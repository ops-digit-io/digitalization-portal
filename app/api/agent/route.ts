/**
 * `/api/agent` — the agent turn endpoint (`docs/12-architecture.md §12.3`).
 *
 * Server-side only: credentials never reach the browser (constraint #7). It runs
 * the agent loop under the session's authority with session-scoped tools, wraps
 * any use-case content as external data, and returns the reply plus a trace
 * summary. Live when ANTHROPIC_API_KEY is set; deterministic offline otherwise.
 */

import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { runAgent } from "@/lib/agent/loop";
import { resolveProvider } from "@/lib/model-settings";
import { createDefaultRegistry } from "@/lib/agent/registry";
import { makeImplementationAnalysisTool } from "@/lib/agent/tools/implementation-analysis";
import { makeStartPocTool } from "@/lib/agent/tools/start-poc";
import { makeDuplicateScanTool } from "@/lib/agent/tools/duplicate-scan";
import { agentToolsEnabled } from "@/lib/agent/tools";
import { factsBlock } from "@/lib/agent/prompt";
import { loadAnalystGuideline, analystSystemPrompt, ANALYST_GOVERNED_BY } from "@/lib/agent/analyst-guideline";
import { orgContextDigest } from "@/lib/org/digest";
import { wrapExternal } from "@/lib/agent/wrap";
import { parseBusinessCase, toSimulationInput } from "@/lib/businesscase";
import { listDemandRowsWithValue, readArtifact } from "@/lib/demands-store";
import { getSession } from "@/lib/auth/current";
import { throttle, AI_BUDGET } from "@/lib/api/throttle";

export const runtime = "nodejs";

type Body = {
  message?: string;
  task?: "chat" | "simulate" | "analysis" | "poc";
  useCaseId?: string;
  horizon?: "quarter" | "year";
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Authentication/authorization is the session's (constraint #3): getSession resolves
  // the OIDC session when configured, else the demo session, else ANONYMOUS (no roles).
  // Defense-in-depth alongside the middleware guard — the analyst needs view_board;
  // each tool then enforces its own capability inside the loop.
  const session = await getSession();
  if (!can(session, "view_board")) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  // The analyst is a paid model call plus a whole-corpus read — throttle per user.
  const throttled = await throttle("agent", AI_BUDGET);
  if (throttled) return throttled;
  const provider = await resolveProvider();
  // Real funnel rows (with real business-case value), never seed.
  const rows = await listDemandRowsWithValue();
  const registry = createDefaultRegistry()
    .register(makeImplementationAnalysisTool(rows))
    .register(makeStartPocTool(rows))
    .register(makeDuplicateScanTool(rows));

  const task = body.task ?? "chat";
  let userMessage = body.message ?? "";
  let toolNames: string[] | undefined;
  let link: string | undefined;

  if (task === "simulate" && body.useCaseId) {
    const bc = await readArtifact(body.useCaseId, "business-case");
    if (!bc) return NextResponse.json({ error: "no business case for that use case" }, { status: 404 });
    const facts = parseBusinessCase(bc);
    toolNames = ["simulate-value"];
    userMessage = [
      `Simulate the value band for ${body.useCaseId}. Use the simulate-value tool, then explain which assumption drives the downside.`,
      "",
      wrapExternal(bc, { source: `${body.useCaseId}/business-case.md`, kind: "use-case artifact" }),
      "",
      factsBlock(toSimulationInput(facts)),
    ].join("\n");
  } else if (task === "analysis") {
    toolNames = ["implementation-analysis"];
    const horizon = body.horizon ?? "quarter";
    userMessage = [
      `Analyse the portfolio implementation workload and business value for the next ${horizon}. Use the implementation-analysis tool, then summarise the workload, the value that lands, and the top use cases by value-per-effort.`,
      factsBlock({ horizon }),
    ].join("\n");
  } else if (task === "poc" && body.useCaseId) {
    toolNames = ["start-poc"];
    link = `/uc/${body.useCaseId}/poc`;
    userMessage = [
      `Start a PoC for ${body.useCaseId}: scaffold the repository and draft the spec with the start-poc tool, then tell the user to approve the spec to build the artifact. Do not build the artifact yourself.`,
      factsBlock({ useCaseId: body.useCaseId }),
    ].join("\n");
  }

  // Behaviour comes from the library (portfolio-query playbook + portfolio-analysis
  // skill), loaded dynamically — never a hardcoded prompt. The organization context
  // (Department OS) is appended so the analyst reasons about the org behind the demand,
  // not in a vacuum; it degrades to nothing when no department is written down.
  const [guideline, orgContext] = await Promise.all([loadAnalystGuideline(), orgContextDigest()]);
  const system = orgContext ? `${analystSystemPrompt(guideline)}\n\n${orgContext}` : analystSystemPrompt(guideline);

  try {
    const result = await runAgent({
      session,
      provider,
      registry,
      system,
      userMessage,
      now: new Date().toISOString(),
      traceId: `trace-${task}-${body.useCaseId ?? "chat"}`,
      feature: `agent.${task}`,
      enabled: agentToolsEnabled(),
      ...(toolNames ? { toolNames } : {}),
    });

    return NextResponse.json({
      text: result.text,
      ...(link ? { link } : {}),
      governedBy: ANALYST_GOVERNED_BY,
      provider: { name: provider.name, live: provider.live },
      trace: {
        toolsOffered: result.trace.toolsOffered,
        toolsWithheld: result.trace.toolsWithheld,
        steps: result.trace.steps,
        usage: result.trace.totalUsage,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "agent error" },
      { status: 500 },
    );
  }
}
