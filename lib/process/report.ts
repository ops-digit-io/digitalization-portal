/**
 * The engagement as one markdown document.
 *
 * It follows the cockpit, deliberately and in the same order: the light and the
 * numbers it rests on, then the anamnesis, then the derived layers, then the
 * D1–D8 catalogue as a clearly-labelled second reading. A report whose headline
 * verdict disagrees with the screen the reader just left is worse than no report,
 * because both look authoritative and only one of them is what the tool decided.
 *
 * The anamnesis is rendered VERBATIM. Those fourteen documents are the engagement
 * — a summary of them belongs in the digest, which is marked as derived, not here.
 * Sections that are empty are named at the end rather than skipped silently: a
 * reader has to be able to tell "we looked and found nothing" from "we never asked".
 */

import { DIMENSIONS, criteriaOf } from "./criteria";
import { SECTIONS, groupById } from "./sections";
import { scoreProfile, trafficLight } from "./score-model";
import { profileOf } from "./profile";
import * as store from "./store";
import * as C from "./content";
import type { Locale } from "../i18n";

const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Markdown table cells must not carry a raw pipe. */
const cell = (s: string) => s.replace(/\|/g, "\\|");

/**
 * Push an embedded document's headings down so it nests under the report's own.
 *
 * A section artefact is a standalone document and opens with `#`. Dropped into the
 * report unchanged, that `#` outranks the report's title and every table of
 * contents built from the file comes out wrong. Fences are skipped — a `#` inside
 * a code block is a comment, not a heading.
 */
export function demote(md: string, by: number): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s{0,3}(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/^(#{1,6})(\s)/, (_m, hashes: string, sp: string) =>
        "#".repeat(Math.min(6, hashes.length + by)) + sp,
      );
    })
    .join("\n");
}

interface Score { value?: number; basis?: string }
interface Digest {
  processStatement?: string; processScore?: Score;
  technologyStatement?: string; technologyScore?: Score;
  friction?: Record<string, unknown[]>;
  confidence?: string; gaps?: string[]; generatedAt?: string;
}

export async function renderReport(slug: string, locale: Locale): Promise<string> {
  const en = locale !== "de";
  const t = (k: string) => C.pc(locale, k);

  const m = await store.meta(slug);
  if (!m || m.deleted) throw Object.assign(new Error("no such engagement"), { status: 404 });

  // The score model's view — the same call the cockpit and the tiles make.
  const gateResults: Record<string, boolean> = {};
  for (const [key, v] of Object.entries(m.gates ?? {})) if (v) gateResults[key] = v.passed;
  const score = scoreProfile(m.sectionScores ?? {}, gateResults);
  const light = trafficLight(score);

  const [catalogue, ratings, digest, decisions] = await Promise.all([
    profileOf(slug),
    store.ratings(slug),
    store.readDigest(slug) as Promise<Digest | null>,
    store.readDecisions(slug),
  ]);

  const ordered = [...SECTIONS].sort((a, b) => a.order - b.order);
  const contents = new Map<string, string>();
  for (const s of ordered) contents.set(s.key, (await store.readSection(slug, s.key)).trim());

  const stage = groupById[m.phase];
  const out: string[] = [];
  const p = (...lines: string[]) => out.push(...lines);

  // ------------------------------------------------------------------ head
  p(
    `# ${t("report.title")} — ${m.title}`,
    "",
    `**Spoke:** ${m.owner || "—"}${m.champion ? ` · ${t("field.champion")} ${m.champion}` : ""}` +
      `  ·  **${t("field.unit")}:** ${m.unit || "—"}` +
      `  ·  **${t("field.anflug")}:** ${C.anflugLabel(locale, m.anflug)}`,
    `**${t("report.light")}:** ${C.lightLabel(locale, light.light)} — ${C.explainLight(locale, light)}`,
    `**${t("stat.coverage")}:** ${pct(score.coverage)} · ${score.sectionsAssessed}/${score.sectionsTotal}` +
      `  ·  **${t("score.overall")}:** ${score.overall ?? "—"}` +
      `  ·  **${t("stat.phase")}:** ${stage ? `${stage.order} · ${C.stageLabel(locale, stage.id, stage.label)}` : m.phase}`,
    "",
  );

  const drivers = C.lightDrivers(locale, light);
  if (drivers.length) {
    p(`## ${t("report.drivers")}`, "", ...drivers.map((d) => `- ${d}`), "");
  }

  // -------------------------------------------------------- score profile
  const dims = Object.values(score.dimensions).sort((a, b) => b.weight - a.weight);
  const anyPartial = dims.some((d) => d.score !== null && !d.assessed);
  p(
    `## ${t("score.heading")}`,
    "",
    `| ${en ? "Dimension" : "Dimension"} | ${en ? "Weight" : "Gewicht"} | ${t("report.score")} | ${t("report.coverage")} |`,
    "|---|---:|---:|---:|",
    ...dims.map((d) => {
      const v = d.score === null ? "—" : `${d.score}${d.assessed ? "" : "*"}`;
      return `| ${cell(C.scoreDimLabel(locale, d.key, d.label))} | ${d.weight} % | ${v} | ${pct(d.coverage)} |`;
    }),
    "",
    // The footnote only earns its place when a star is actually on the page.
    ...(anyPartial
      ? [
          `_*${en ? "partial evidence — the score can turn the light red, never green" : "Teilbeleg — die Bewertung kann die Ampel rot schalten, nie grün"}._`,
          "",
        ]
      : []),
    `### ${t("score.knockOuts")}`,
    "",
    `| ${en ? "Knock-out" : "Knock-out"} | ${en ? "State" : "Zustand"} | ${en ? "Basis" : "Grundlage"} |`,
    "|---|---|---|",
    ...score.knockOuts.map(
      (k) =>
        `| ${cell(C.koLabel(locale, k.key, k.label))} | ${C.koStateLabel(locale, k.state === "unknown" ? "open" : k.state)} | ${cell(C.koNote(locale, k))} |`,
    ),
    "",
  );

  // ------------------------------------------------------------ anamnesis
  p(`## ${t("report.anamnesis")}`, "");
  const empty: string[] = [];
  for (const s of ordered) {
    const body = contents.get(s.key) ?? "";
    const label = C.sectionText(locale, s).label;
    if (!body) {
      empty.push(`${s.order}. ${label}`);
      continue;
    }
    const marks: string[] = [];
    const v = m.gates?.[s.key];
    if (v) {
      marks.push(
        `${t("section.gate")}: ${C.pc(locale, v.passed ? "gate.pass" : "gate.fail")}${v.reason ? ` — ${v.reason}` : ""}`,
      );
    }
    const sc = m.sectionScores?.[s.key];
    if (typeof sc === "number") marks.push(`${t("report.score")} ${sc}/100`);
    p("---", "", `### ${s.order}. ${label}`, "");
    if (marks.length) p(`_${marks.join(" · ")}_`, "");
    p(demote(body, 3), "");
  }
  if (empty.length === ordered.length) p(t("report.nothing"), "");
  else if (empty.length) p(`_${t("report.notFilled")}: ${empty.join(" · ")}._`, "");

  // --------------------------------------------------------------- digest
  if (digest) {
    p(`## ${t("digest.heading")}`, "", `_${t("report.digestNote")}_`, "");
    if (digest.processStatement) {
      p(`**${t("digest.process")}** ${digest.processStatement}`, "");
      p(`${t("digest.processScore")}: **${digest.processScore?.value ?? "—"}**${digest.processScore?.basis ? ` — ${digest.processScore.basis}` : ""}`, "");
    }
    if (digest.technologyStatement) {
      p(`**${t("digest.technology")}** ${digest.technologyStatement}`, "");
      p(`${t("digest.technologyScore")}: **${digest.technologyScore?.value ?? "—"}**${digest.technologyScore?.basis ? ` — ${digest.technologyScore.basis}` : ""}`, "");
    }
    const f = digest.friction ?? {};
    const counts = (["actual", "potential", "prunable"] as const)
      .map((k) => `${C.pc(locale, `digest.${k}`)} ${Array.isArray(f[k]) ? f[k].length : 0}`)
      .join(" · ");
    p(`${t("digest.friction")}: ${counts}`, "");
    if (digest.gaps?.length) p(`${t("digest.gaps")}:`, "", ...digest.gaps.map((g) => `- ${g}`), "");
  }

  // ------------------------------------------------------------- verdicts
  if (decisions.length) {
    p(
      `## ${t("tab.advisory")} — ${t("advisory.verdicts")}`,
      "",
      `| ${en ? "Pass" : "Durchlauf"} | ${t("advisory.proposalId")} | ${en ? "Verdict" : "Verdikt"} | ${t("advisory.reason")} |`,
      "|---|---|---|---|",
      ...decisions.map(
        (x) =>
          `| ${cell(x.advisoryKey)} | ${cell(x.proposalId)} | ${C.pc(locale, `advisory.${x.verdict}`)} | ${cell(x.reason || "—")} |`,
      ),
      "",
    );
  }

  // ------------------------------------------------------------ catalogue
  // Only when something was actually rated. Unrated, every criterion stands at
  // level 1 by convention (§1.3) and a table of ones reads as a verdict.
  if (catalogue.ratedCount > 0) {
    p(
      `## ${t("tab.catalogue")}`,
      "",
      `_${t("report.catalogueNote")}_`,
      "",
      `**Status:** ${C.statusFull(locale, catalogue.status)} — ${C.explainStatus(locale, catalogue)}`,
      `**${t("report.catalogueAssessed")}:** ${pct(catalogue.coverage)} · ${catalogue.ratedCount}/${catalogue.totalCount}` +
        `  ·  **${en ? "Portfolio value (ranking only)" : "Portfolio-Wert (nur Reihung)"}:** ${catalogue.portfolioValue}`,
      "",
      `| ${en ? "Dim" : "Dim"} | ${en ? "Dimension" : "Dimension"} | ${en ? "Weight" : "Gewicht"} | ${en ? "Value" : "Wert"} |`,
      "|---|---|---:|---:|",
      ...catalogue.dimensions.map(
        (dm) => `| ${dm.id} | ${cell(C.dimText(locale, dm.id).label)} | ${dm.weight} % | ${dm.score.toFixed(1)} |`,
      ),
      "",
    );
    if (catalogue.directions.length) {
      p(
        `### ${en ? "Direction vector (pre-indication)" : "Richtungsvektor (Vorindikation)"}`,
        "",
        ...catalogue.directions.map((code) => `- ${C.directionText(locale, code)}`),
        "",
      );
    }
    p(`### ${en ? "Ratings per criterion" : "Bewertungen je Kriterium"}`, "");
    for (const dm of DIMENSIONS) {
      p("", `**${dm.id} — ${C.dimText(locale, dm.id).label}**`, "");
      for (const c of criteriaOf(dm.id)) {
        const r = ratings.criteria[c.id];
        const lvl = c.perComponent
          ? en ? "(per component)" : "(je Komponente)"
          : r?.level ? `${r.level}/5` : "—";
        p(`- **${c.id}** ${C.critText(locale, c.id).label}: ${lvl}${r?.evidence ? ` — ${r.evidence}` : ""}`);
      }
    }
    p("");
  }

  if (m.branch) {
    p(
      `## ${en ? "Diagnosis" : "Diagnose"}`,
      "",
      `${en ? "Chosen branch" : "Gewählter Zweig"}: **${m.branch}**${m.riskClass ? ` · ${en ? "risk class" : "Risikoklasse"} **${m.riskClass}**` : ""}`,
      "",
    );
  }

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}
