/**
 * Build a PoC `UseCaseSeed` from a real demand README — so the agentic PoC builder
 * acts on the actual funnel case, not the frozen `SEED_ROWS` demo table.
 *
 * Pure: markdown in, seed out (parsers never throw), so it is unit-tested without
 * git. The route reads the README via `readDemand` (live du-demands or local
 * workspace) and hands it here; an id with no README is a 404 upstream, never
 * fabricated content.
 */

import type { Lane } from "../types.js";
import { parseUseCase, parsePeople } from "../parse.js";
import { slugify, type UseCaseSeed } from "./scaffold.js";

/** The problem statement from the `## Problem` section, minus the "> Original …" quote. */
function problemFrom(markdown: string): string {
  const parts = markdown.replace(/\r\n/g, "\n").split(/\n(?=## )/);
  for (const part of parts) {
    const m = /^##\s+(.+)/.exec(part.trim());
    if (!m || m[1]?.trim().toLowerCase() !== "problem") continue;
    const body = part
      .replace(/^##\s+.+\n?/, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith(">")) // drop the original-language blockquote
      .join("\n")
      .trim();
    if (body) return body;
  }
  return "Captured at intake — see the use case.";
}

/** Title without the leading `UC-… · ` id prefix. */
function cleanTitle(fullTitle: string | undefined, id: string): string {
  if (!fullTitle) return id;
  const rest = fullTitle.split(" · ").slice(1).join(" · ").trim();
  return rest || fullTitle;
}

/**
 * Derive a `UseCaseSeed` from a demand's README markdown. Returns undefined only
 * when the markdown is empty (the route treats that as a 404).
 */
export function seedFromDemandMarkdown(id: string, markdown: string): UseCaseSeed | undefined {
  if (!markdown.trim()) return undefined;
  const uc = parseUseCase(markdown);
  const people = parsePeople(markdown);
  const title = cleanTitle(uc.title, id);

  const seed: UseCaseSeed = {
    id,
    title,
    slug: slugify(title) || id.toLowerCase(),
    plant: uc.state.plant ?? "ALL",
    lane: (uc.state.lane as Lane | undefined) ?? "transform",
    createdOn: uc.state.created ?? uc.state.raw["since"] ?? "",
    problem: problemFrom(markdown),
    requester: people.requester ?? "requester@example.com",
  };
  if (uc.state.domain) seed.domain = uc.state.domain;
  return seed;
}
