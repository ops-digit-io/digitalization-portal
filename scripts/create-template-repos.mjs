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
`,
);
const outfile = join(tmp, "bundle.mjs");
await build({ entryPoints: [entryFile], bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent" });
const { getGitHost, hasGitHubCredentials, POC_STACKS } = await import(outfile);
await rm(tmp, { recursive: true, force: true });

if (!hasGitHubCredentials()) {
  console.error("No GitHub App credentials found (need GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_ORG).");
  console.error("Run this where the portal's App environment is set — its deployment, or locally with the secrets exported.");
  process.exit(1);
}

// Neutral seed — GitHub copies template files verbatim; the portal overlays the real
// id/title/plant when it generates a uc-* repo from the template.
const seed = {
  id: "UC-XXXX-XXXX",
  title: "Use-Case PoC",
  slug: "use-case-poc",
  plant: "PLANT",
  lane: "transform",
  domain: "process",
  createdOn: "2026-01-01",
};

const isPrivate = process.argv.includes("--private");
const host = getGitHost();
let ok = 0;

for (const stack of POC_STACKS) {
  const name = stack.templateRepo;
  try {
    const repo = await host.createRepo(name, {
      description: `PoC template · ${stack.label} — follows ${stack.upstream.name}`,
      private: isPrivate,
      template: true,
    });
    const readme = `# ${name}\n\nPoC template · **${stack.label}**.\n\n${stack.description}\n\nFollows [${stack.upstream.name}](${stack.upstream.url}). Used by the digitalization\nportal's PoC builder via GitHub "generate from template" — the portal creates a\nuse-case repo from this template, then overlays the case's own files.\n`;
    const files = [{ path: "README.md", content: readme }, ...stack.files(seed)];
    for (const f of files) await host.putFile(repo, f, `scaffold template: ${f.path}`, "main");
    console.log(`✓ ${name} — template repo, ${files.length} files · ${repo.url}`);
    ok += 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${name}: ${msg}`);
  }
}

console.log(`\n${ok}/${POC_STACKS.length} template repos ready.`);
console.log("Then set POC_USE_TEMPLATE_REPOS=1 (GITHUB_ORG already set) and the PoC builder generates from them.");
