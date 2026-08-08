/**
 * `/api/templates` — manage the PoC template repositories from inside the app.
 *
 * Actions (all require `all` — this is administration of org repos):
 *   - "create":   create + flag-as-template + populate a stack's du-template-* repo
 *                 (or every missing one). Needs the portal's GitHub App.
 *   - "register": register a custom template (metadata pointing at a template repo).
 *   - "remove":   drop a custom template.
 *
 * Reading the health of the repos is done in the page (server component); this route
 * is the mutations. The portal never merges and never deletes a repo here.
 */

import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getGitHost } from "@/lib/git";
import { getSession } from "@/lib/auth/current";
import { POC_STACKS, pocStack, type PocStack } from "@/lib/poc/templates";
import { provisionTemplateRepo } from "@/lib/poc/template-provision";
import {
  listCustomTemplates,
  addCustomTemplate,
  removeCustomTemplate,
  customToStack,
  type CustomTemplate,
} from "@/lib/poc/custom-templates";

export const runtime = "nodejs";

/** The registered custom templates, as picker metadata (no auth — names only). */
export async function GET() {
  const customs = await listCustomTemplates().catch(() => []);
  return NextResponse.json({
    customs: customs.map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category,
      language: "custom",
      description: c.description,
      upstream: c.upstream,
      run: "generate from template",
    })),
  });
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : "request failed");
const statusOf = (e: unknown): number => (typeof (e as { status?: number })?.status === "number" ? (e as { status: number }).status : 500);

async function resolveStack(id: string): Promise<PocStack | undefined> {
  const built = pocStack(id);
  if (built) return built;
  const custom = (await listCustomTemplates()).find((c) => c.id === id);
  return custom ? customToStack(custom) : undefined;
}

export async function POST(req: Request) {
  const session = await getSession();
  let body: { action?: string; stackId?: string; private?: boolean; template?: Partial<CustomTemplate>; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!can(session, "all")) {
    return NextResponse.json({ error: "administration required" }, { status: 403 });
  }

  if (body.action === "register") {
    try {
      return NextResponse.json({ ok: true, template: await addCustomTemplate(body.template ?? {}) });
    } catch (e) {
      return NextResponse.json({ error: msg(e) }, { status: statusOf(e) });
    }
  }

  if (body.action === "remove") {
    try {
      await removeCustomTemplate(String(body.id));
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: msg(e) }, { status: statusOf(e) });
    }
  }

  if (body.action === "create") {
    const host = getGitHost();
    if (host.kind !== "github") {
      return NextResponse.json(
        { error: "No GitHub App configured — set GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_ORG to create template repos." },
        { status: 400 },
      );
    }
    const all = [...POC_STACKS.map((s) => s.id), ...(await listCustomTemplates()).map((c) => c.id)];
    const ids = !body.stackId || body.stackId === "all" ? all : [body.stackId];
    const results: { id: string; ok: boolean; url?: string; files?: number; created?: boolean; error?: string }[] = [];
    for (const id of ids) {
      const stack = await resolveStack(id);
      if (!stack) {
        results.push({ id, ok: false, error: "unknown template" });
        continue;
      }
      try {
        const r = await provisionTemplateRepo(host, stack, { private: body.private === true });
        results.push({ id, ok: true, url: r.repo.url, files: r.files, created: r.created });
      } catch (e) {
        results.push({ id, ok: false, error: msg(e) });
      }
    }
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
