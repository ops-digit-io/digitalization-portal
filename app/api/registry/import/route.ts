import { NextResponse } from "next/server";
import { can } from "@/lib/rbac";
import { getSession } from "@/lib/auth/current";
import { saveEntry } from "@/lib/registry-store";
import { slugify } from "@/lib/poc/scaffold";
import { fetchReferenceSkill, ensureProvenance } from "@/lib/skill-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Import a reference skill from the open Agent Skills ecosystem.
 *   - action "preview": fetch + parse an allowlisted SKILL.md and return it for
 *     REVIEW. Saves nothing, reaches no model.
 *   - action "save": re-fetch (so the committed content is the source's, not a
 *     client-edited copy), stamp provenance, and commit to the registry.
 *
 * External skill content is third-party — a human reviews it here before it ever
 * governs an agent (constraint #5 / AI drafts, humans decide).
 */
export async function POST(req: Request) {
  const session = await getSession(); // real deployment resolves this from the OIDC session
  // Importing a third-party skill commits governance content that steers the agent —
  // gate it like other registry writes (reviewers/admins), not the universal `draft`.
  if (!can(session, "edit_registry")) {
    return NextResponse.json({ error: "missing capability: edit_registry" }, { status: 403 });
  }

  let body: { action?: string; url?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "a skill URL is required" }, { status: 400 });

  try {
    const fetched = await fetchReferenceSkill(url);

    if (body.action === "preview" || !body.action) {
      return NextResponse.json({
        name: fetched.name,
        description: fetched.description,
        body: fetched.body,
        raw: fetched.raw,
        sourceUrl: fetched.sourceUrl,
        files: fetched.files.map((f) => f.path),
        skipped: fetched.skipped,
      });
    }

    if (body.action === "save") {
      const name = slugify(body.name?.trim() || fetched.name);
      if (!name) return NextResponse.json({ error: "could not derive a skill name" }, { status: 400 });
      // Save the WHOLE bundle; stamp provenance into the SKILL.md.
      const files = fetched.files.map((f) =>
        /(^|\/)SKILL\.md$/i.test(f.path) ? { path: f.path, content: ensureProvenance(f.content, fetched.sourceUrl) } : f,
      );
      const result = await saveEntry({
        type: "skill",
        name,
        bundle: true,
        files,
        message: `Import reference skill ${name} (${files.length} files) from ${fetched.sourceUrl}`,
      });
      return NextResponse.json({ name, sourceUrl: fetched.sourceUrl, files: files.map((f) => f.path), skipped: fetched.skipped, result });
    }

    return NextResponse.json({ error: "action must be 'preview' or 'save'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "import failed" }, { status: 400 });
  }
}
