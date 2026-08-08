import Link from "next/link";
import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { getGitHost } from "@/lib/git";
import { POC_STACKS } from "@/lib/poc/templates";
import { listCustomTemplates, customToStack } from "@/lib/poc/custom-templates";
import { templateStatuses } from "@/lib/poc/template-status";
import { TemplatesManager } from "./manager";

export const dynamic = "force-dynamic";

/**
 * Admin — the PoC template repositories (`du-template-*`).
 *
 * One place to CHECK each template's health (does its repo exist, is it flagged a
 * GitHub template, is it populated), CREATE or re-sync them through the portal's own
 * App, and REGISTER new templates. Admin-only (`can(session,"all")`), because it
 * creates and writes org repositories.
 */
export default async function TemplatesAdminPage() {
  const session = await getSession();
  if (!can(session, "all")) {
    return (
      <main className="mx-auto max-w-[820px] px-6 py-10">
        <h1 className="text-lg font-semibold">Administration · PoC templates</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is for administrators only.</p>
        <Link href="/" className="mt-3 inline-block text-sm underline">← Home</Link>
      </main>
    );
  }

  const host = getGitHost();
  const org = process.env.GITHUB_ORG;
  const appConfigured = host.kind === "github";
  const templateModeOn = process.env.POC_USE_TEMPLATE_REPOS === "1" || process.env.POC_USE_TEMPLATE_REPOS === "true";

  const customs = await listCustomTemplates();
  const stacks = [
    ...POC_STACKS.map((stack) => ({ stack, custom: false })),
    ...customs.map((c) => ({ stack: customToStack(c), custom: true })),
  ];
  const statuses = await templateStatuses(host, stacks, org);

  return (
    <main className="mx-auto max-w-[980px] px-6 py-6">
      <nav className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1.5" aria-hidden>›</span>
        <span className="text-foreground">Administration · PoC templates</span>
      </nav>
      <h1 className="text-lg font-semibold">PoC template repositories</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Each PoC stack is backed by a <code className="font-mono text-xs">du-template-*</code> GitHub template
        repository. Check their health, create or re-sync them through the portal&apos;s own App, and register new
        templates. The content is generated from{" "}
        <code className="font-mono text-xs">lib/poc/templates.ts</code>, so the in-app scaffolding and the repos never
        drift.
      </p>

      <TemplatesManager
        statuses={statuses}
        org={org ?? null}
        appConfigured={appConfigured}
        templateModeOn={templateModeOn}
      />
    </main>
  );
}
