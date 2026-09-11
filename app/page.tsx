import { getSession } from "@/lib/auth/current";
import { can } from "@/lib/rbac";
import { launchpadFor } from "@/lib/launchpad";
import { LaunchpadGrid } from "@/components/portal/launchpad-grid";

export const dynamic = "force-dynamic";

/**
 * The launchpad — every tool, shaped by what this session may actually do (N8).
 *
 * A server component so `can()` runs server-side: the browser receives resolved
 * tiles, never the session's roles or capability list. Tools the session cannot
 * use are muted rather than removed (see `lib/launchpad.ts`), so the portal reads
 * the same to everybody and the difference is legible.
 */
export default async function Launchpad() {
  const session = await getSession();
  const groups = launchpadFor((capability) => can(session, capability));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <LaunchpadGrid groups={groups} />
    </main>
  );
}
