#!/usr/bin/env node
/**
 * Materialize the PoC template repositories from the single source of truth
 * (`lib/poc/templates.ts`) into a local directory — one folder per template repo,
 * ready to push to GitHub as a `du-template-*` repository.
 *
 * The portal reads these back through GitHub "generate from template": it creates a
 * uc-* repo FROM the template, then overlays the case's own seeded files. GitHub
 * copies template files verbatim, so the files here carry NEUTRAL placeholders
 * (UC-XXXX-XXXX, "Use-Case PoC") — the portal replaces them per case.
 *
 * Usage (from the repo root, with devDependencies installed):
 *   node scripts/materialize-templates.mjs [--out template-repos]
 *
 * Then, for each folder, create the repo in your org and push it (see
 * docs/SETUP-poc-templates.md), and flip on "Template repository" in its settings.
 */

import { build } from "esbuild";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outArgIdx = process.argv.indexOf("--out");
const OUT = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : "template-repos";

// Neutral seed: template files are copied verbatim by GitHub, so they must not name
// a real use case. The portal overlays the real id/title/plant when it generates.
const seed = {
  id: "UC-XXXX-XXXX",
  title: "Use-Case PoC",
  slug: "use-case-poc",
  plant: "PLANT",
  lane: "transform",
  domain: "process",
  createdOn: "2026-01-01",
};

// Bundle the TS registry to a temp ESM module (esbuild resolves the .js→.ts chain),
// then import it — so this script and the app share ONE definition of the stacks.
const tmp = await mkdtemp(join(tmpdir(), "materialize-templates-"));
const outfile = join(tmp, "templates.mjs");
await build({
  entryPoints: [join(here, "..", "lib", "poc", "templates.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "silent",
});
const { POC_STACKS } = await import(outfile);

for (const stack of POC_STACKS) {
  const dir = join(OUT, stack.templateRepo);
  const readme = `# ${stack.templateRepo}

PoC template · **${stack.label}**.

${stack.description}

Follows [${stack.upstream.name}](${stack.upstream.url}).

Used by the digitalization portal's PoC builder via GitHub "generate from template".
The portal creates a use-case repository **from** this template, then overlays the
case's own README, PoC spec, and seeded files. Placeholders here (\`UC-XXXX-XXXX\`,
"Use-Case PoC") are replaced per case.

Run locally: \`${stack.run}\` (from \`poc/\`).
`;
  const files = [{ path: "README.md", content: readme }, ...stack.files(seed)];
  for (const f of files) {
    const target = join(dir, f.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, f.content);
  }
  console.log(`✓ ${stack.templateRepo}  (${files.length} files)`);
}

await rm(tmp, { recursive: true, force: true });
console.log(`\nWrote ${POC_STACKS.length} template repos under ${OUT}/`);
console.log("Next: create each repo in your org, push it, and enable 'Template repository' in Settings.");
console.log("See docs/SETUP-poc-templates.md.");
