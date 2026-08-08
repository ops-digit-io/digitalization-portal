#!/usr/bin/env node
/**
 * Create the seven `du-template-*` PoC template repositories in the org, mark each as
 * a GitHub template, and populate it from the single source of truth
 * (`lib/poc/templates.ts`) — all through the PORTAL'S OWN GitHub App (the one granted
 * Administration: write), not the Claude integration.
 *
 * Run it where the portal's App credentials are set (your deployment env, or locally
 * with the three secrets exported):
 *
 *   GITHUB_APP_ID=…  GITHUB_APP_PRIVATE_KEY="…"  GITHUB_ORG=ops-digit-io \
 *     node scripts/create-template-repos.mjs [--private]
 *
 * Idempotent-ish: a repo that already exists is reported and skipped, not clobbered.
 * Placeholders in the files (UC-XXXX-XXXX) are what GitHub copies verbatim; the portal
 * overlays the real case values when it generates a uc-* repo from the template.
 */

import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Bundle the portal's git host + the stack registry to one ESM module (esbuild
// resolves the .js→.ts chain), so this script uses the SAME code the app does.
const tmp = await mkdtemp(join(tmpdir(), "create-template-repos-"));
const entryFile = join(tmp, "entry.ts");
await writeFile(
  entryFile,
  `export { getGitHost } from ${JSON.stringify(join(root, "lib/git/index.ts"))};
export { hasGitHubCredentials } from ${JSON.stringify(join(root, "lib/git/host.ts"))};
export { POC_STACKS } from ${JSON.stringify(join(root, "lib/poc/templates.ts"))};
export { provisionTemplateRepo } from ${JSON.stringify(join(root, "lib/poc/template-provision.ts"))};
`,
);
const outfile = join(tmp, "bundle.mjs");
await build({ entryPoints: [entryFile], bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent" });
const { getGitHost, hasGitHubCredentials, POC_STACKS, provisionTemplateRepo } = await import(outfile);
await rm(tmp, { recursive: true, force: true });

if (!hasGitHubCredentials()) {
  console.error("No GitHub App credentials found (need GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_ORG).");
  console.error("Run this where the portal's App environment is set — its deployment, or locally with the secrets exported.");
  process.exit(1);
}

const isPrivate = process.argv.includes("--private");
const host = getGitHost();
let ok = 0;

// Same provisioning the in-app Templates tool uses, so CLI and app never diverge.
for (const stack of POC_STACKS) {
  try {
    const { repo, files } = await provisionTemplateRepo(host, stack, { private: isPrivate });
    console.log(`✓ ${stack.templateRepo} — template repo, ${files} files · ${repo.url}`);
    ok += 1;
  } catch (err) {
    console.error(`✗ ${stack.templateRepo}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${ok}/${POC_STACKS.length} template repos ready.`);
console.log("Then set POC_USE_TEMPLATE_REPOS=1 (GITHUB_ORG already set) and the PoC builder generates from them.");
