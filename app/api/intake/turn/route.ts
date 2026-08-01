import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { resolveProvider } from "@/lib/model-settings";
import { recordUsage } from "@/lib/usage-meter";
import { loadIntakeGuideline, intakeSystemPrompt, SAVE_DEMAND_TOOL, INTAKE_PLAYBOOK, INTAKE_SKILLS } from "@/lib/agent/intake-guideline";
import { startIntake, submitAnswer, type ChatMessage, type IntakeState } from "@/lib/intake-agent";
import { INTAKE_FIELDS, EMPTY_ANSWERS, missingRequired, type DemandAnswers } from "@/lib/demand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What governs this agent — surfaced so the UI can show (and link) it. */
const GOVERNED_BY = { playbook: INTAKE_PLAYBOOK, skills: [...INTAKE_SKILLS] };

function coerce(a: unknown): DemandAnswers {
  const src = (a ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_ANSWERS };
  for (const k of Object.keys(out) as (keyof DemandAnswers)[]) if (typeof src[k] === "string") out[k] = src[k] as string;
  return out;
}

interface TurnBody { action?: "start" | "answer"; messages?: ChatMessage[]; userText?: string; state?: IntakeState }
interface TurnResult {
  messages: ChatMessage[];
  state: IntakeState;
  mode: "live" | "offline";
  governedBy: { playbook: string; skills: string[] };
}

/**
 * One turn of the intake interview. The playbook `s1-intake` governs the agent:
 * live, it is loaded into the model's system prompt; offline (and on any live
 * failure), the deterministic agent that encodes the same rules runs instead.
 */
export async function POST(req: Request) {
  const session = await getSession(); // real deployment resolves this from the OIDC session
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
    if (body.action === "start" || !body.state) return { ...startIntake(), mode: "offline", governedBy: GOVERNED_BY };
    return { ...submitAnswer(body.state, String(body.userText ?? "")), mode: "offline", governedBy: GOVERNED_BY };
  };

  const provider = await resolveProvider();
  if (!provider.live) return NextResponse.json(runOffline());

  // Live: the model runs the interview, governed by the playbook system prompt.
  try {
    const guideline = await loadIntakeGuideline();
    const system = intakeSystemPrompt(guideline);
    const convo: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const messages = convo.map((m) => ({ role: m.role, content: m.text }));
    messages.push({ role: "user", content: body.action === "start" ? "(begin the intake)" : String(body.userText ?? "") });

    // One interview question at a time, so low effort — and enough room that the
    // question itself is never what gets truncated on a model that thinks first.
    const res = await provider.complete({ system, messages, tools: [SAVE_DEMAND_TOOL], effort: "low", maxTokens: 1500 });
    await recordUsage({ feature: "intake.turn", provider: provider.name, model: provider.model, usage: res.usage });
    const call = res.toolCalls.find((t) => t.name === "save_demand");

    if (call) {
      const answers = coerce(call.input);
      // Guard: the model may call save_demand before every REQUIRED field is real.
      // Don't let the interview reach a "done" state the save route would 400 on —
      // keep collecting and ask for exactly what's missing.
      const missing = missingRequired(answers);
      if (missing.length > 0) {
        const prev: IntakeState = body.state ?? { answers: { ...EMPTY_ANSWERS }, step: 0, done: false, nudged: [] };
        const merged = { ...prev.answers, ...answers };
        const text =
          res.text?.trim() ||
          `Almost there — I still need ${missing.map((f) => f.label.toLowerCase()).join(", ")} before I can write the demand. ${missing[0]!.question}`;
        return NextResponse.json({
          messages: [{ role: "assistant", text }],
          state: { ...prev, answers: merged, done: false },
          mode: "live",
          governedBy: GOVERNED_BY,
        } satisfies TurnResult);
      }
      const state: IntakeState = { answers, step: INTAKE_FIELDS.length, done: true, nudged: [] };
      const text = res.text?.trim() || "Thanks — that's everything I need. I've written the demand page from what you told me; it's below.";
      return NextResponse.json({ messages: [{ role: "assistant", text }], state, mode: "live", governedBy: GOVERNED_BY } satisfies TurnResult);
    }

    const prev: IntakeState = body.state ?? { answers: { ...EMPTY_ANSWERS }, step: 0, done: false, nudged: [] };
    const text = res.text?.trim() || "Could you tell me a bit more?";
    return NextResponse.json({ messages: [{ role: "assistant", text }], state: { ...prev, done: false }, mode: "live", governedBy: GOVERNED_BY } satisfies TurnResult);
  } catch {
    // Never break the interview — fall back to the deterministic agent.
    return NextResponse.json(runOffline());
  }
}
