import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { DEMO_SESSION } from "@/lib/seed";
import { getProvider } from "@/lib/agent/provider";
import { loadIntakeGuideline, intakeSystemPrompt, SAVE_DEMAND_TOOL } from "@/lib/agent/intake-guideline";
import { startIntake, submitAnswer, type ChatMessage, type IntakeState } from "@/lib/intake-agent";
import { INTAKE_FIELDS, EMPTY_ANSWERS, type DemandAnswers } from "@/lib/demand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerce(a: unknown): DemandAnswers {
  const src = (a ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_ANSWERS };
  for (const k of Object.keys(out) as (keyof DemandAnswers)[]) if (typeof src[k] === "string") out[k] = src[k] as string;
  return out;
}

interface TurnBody { action?: "start" | "answer"; messages?: ChatMessage[]; userText?: string; state?: IntakeState }
interface TurnResult { messages: ChatMessage[]; state: IntakeState; mode: "live" | "offline" }

/**
 * One turn of the intake interview. The playbook `s1-intake` governs the agent:
 * live, it is loaded into the model's system prompt; offline (and on any live
 * failure), the deterministic agent that encodes the same rules runs instead.
 */
export async function POST(req: Request) {
  const session = DEMO_SESSION; // real deployment resolves this from the OIDC session
  if (!can(session, "draft")) {
    return NextResponse.json({ error: "missing capability: draft" }, { status: 403 });
  }

  let body: TurnBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // The deterministic agent — the offline path and the fallback.
  const runOffline = (): TurnResult => {
    if (body.action === "start" || !body.state) return { ...startIntake(), mode: "offline" };
    return { ...submitAnswer(body.state, String(body.userText ?? "")), mode: "offline" };
  };

  const provider = getProvider();
  if (!provider.live) return NextResponse.json(runOffline());

  // Live: the model runs the interview, governed by the playbook system prompt.
  try {
    const guideline = await loadIntakeGuideline();
    const system = intakeSystemPrompt(guideline);
    const convo: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const messages = convo.map((m) => ({ role: m.role, content: m.text }));
    messages.push({ role: "user", content: body.action === "start" ? "(begin the intake)" : String(body.userText ?? "") });

    const res = await provider.complete({ system, messages, tools: [SAVE_DEMAND_TOOL], maxTokens: 700 });
    const call = res.toolCalls.find((t) => t.name === "save_demand");

    if (call) {
      const answers = coerce(call.input);
      const state: IntakeState = { answers, step: INTAKE_FIELDS.length, done: true, nudged: [] };
      const text = res.text?.trim() || "Thanks — that's everything I need. I've written the demand page from what you told me; it's below.";
      return NextResponse.json({ messages: [{ role: "assistant", text }], state, mode: "live" } satisfies TurnResult);
    }

    const prev: IntakeState = body.state ?? { answers: { ...EMPTY_ANSWERS }, step: 0, done: false, nudged: [] };
    const text = res.text?.trim() || "Could you tell me a bit more?";
    return NextResponse.json({ messages: [{ role: "assistant", text }], state: { ...prev, done: false }, mode: "live" } satisfies TurnResult);
  } catch {
    // Never break the interview — fall back to the deterministic agent.
    return NextResponse.json(runOffline());
  }
}
