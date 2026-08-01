import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current";
import { readDemand, saveDemand } from "@/lib/demands-store";
import { canEditDemand } from "@/lib/demand-edit";
import {
  parseOverrides, writeOverrides,
  addEpic, updateEpic, removeEpic,
  addStory, updateStory, removeStory, restore,
  type OverlayResult,
} from "@/lib/requirements-overrides";
import { getT } from "@/lib/i18n-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Human edits to the AI-generated requirements — add / change / remove epics and
 * user stories. The edits live as an overlay in the demand README (surviving
 * re-analysis), so this reads the demand, transforms the overlay, and writes the
 * demand back. Gate: `canEditDemand` — the same people who may change a demand may
 * curate its requirements.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  const session = await getSession();
  const id = params.id;

  const md = await readDemand(id);
  if (md === undefined) {
    return NextResponse.json({ ok: false, error: `${t("api.demands.demandPrefix", "Demand")} ${id} ${t("api.demands.notFound", "not found.")}` }, { status: 404 });
  }
  if (!canEditDemand(session, md)) {
    return NextResponse.json({ ok: false, error: t("api.demands.editRequirementsForbidden", "You can only edit requirements for demands you own (or need view-all).") }, { status: 403 });
  }

  let body: {
    action?: string;
    epicId?: string;
    storyId?: string;
    kind?: "epic" | "story";
    id?: string;
    epic?: unknown;
    story?: unknown;
    fields?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: t("api.invalidJson", "invalid JSON") }, { status: 400 });
  }

  const overlay = parseOverrides(md);
  let result: OverlayResult;

  switch (body.action) {
    case "add-epic":
      result = addEpic(overlay, (body.epic ?? {}) as { title: string; description: string });
      break;
    case "update-epic":
      result = updateEpic(overlay, String(body.epicId ?? ""), (body.fields ?? {}) as Record<string, string>);
      break;
    case "remove-epic":
      result = removeEpic(overlay, String(body.epicId ?? ""));
      break;
    case "add-story":
      result = addStory(overlay, (body.story ?? {}) as Record<string, unknown>);
      break;
    case "update-story":
      result = updateStory(overlay, String(body.storyId ?? ""), (body.fields ?? {}) as Record<string, unknown>);
      break;
    case "remove-story":
      result = removeStory(overlay, String(body.storyId ?? ""));
      break;
    case "restore":
      result = restore(overlay, body.kind === "epic" ? "epic" : "story", String(body.id ?? ""));
      break;
    default:
      return NextResponse.json({ ok: false, error: t("api.unknownAction", "unknown action") }, { status: 400 });
  }

  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });

  const next = writeOverrides(md, result.overlay);
  try {
    await saveDemand(id, next, { message: `Edit requirements for ${id} (${body.action})` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, overlay: result.overlay });
}
