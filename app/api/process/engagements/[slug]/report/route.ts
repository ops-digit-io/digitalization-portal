import { NextResponse } from "next/server";
import { DIMENSIONS, criteriaOf } from "@/lib/process/criteria";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import * as C from "@/lib/process/content";
import { deny } from "@/lib/process/guard";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The one-page health profile as markdown, in the requested language (default English). */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  const url = new URL(req.url);
  const locale: Locale = url.searchParams.get("lang") === "de" ? "de" : "en";
  const en = locale !== "de";
  const t = (k: string) => C.pc(locale, k);

  const m = await store.meta(slug);
  if (!m || m.deleted) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const [profile, ratings] = await Promise.all([profileOf(slug), store.ratings(slug)]);
  const L = (id: string) => ratings.criteria[id]?.level;

  const parts: string[] = [
    `# ${en ? "Process health profile" : "Prozess-Gesundheitsprofil"} — ${m.title}`,
    "",
    `**${en ? "Spoke" : "Spoke"}:** ${m.owner || "—"}${m.champion ? ` · ${t("field.champion")} ${m.champion}` : ""}  ·  **${t("field.unit")}:** ${m.unit || "—"}  ·  **${t("field.anflug")}:** ${C.anflugLabel(locale, m.anflug)}`,
    `**${en ? "Status" : "Status"}:** ${C.statusFull(locale, profile.status)} — ${C.explainStatus(locale, profile)}`,
    `**${t("coverage")}:** ${Math.round(profile.coverage * 100)} %  ·  **${en ? "Portfolio value (ranking only)" : "Portfolio-Wert (nur Reihung)"}:** ${profile.portfolioValue}`,
    "",
    "## Knock-outs",
    "",
    `| ${en ? "Criterion" : "Kriterium"} | ${en ? "Level" : "Stufe"} | ${en ? "State" : "Zustand"} |`,
    "|---|---|---|",
    ...profile.knockOuts.map((k) => `| ${k.id} ${C.critText(locale, k.id).label} | ${k.level}/5${k.rated ? "" : "*"} | ${C.koStateLabel(locale, k.state)} |`),
    "",
    `## ${en ? "Dimension profile" : "Dimensionsprofil"}`,
    "",
    `| ${en ? "Dim" : "Dim"} | ${en ? "Dimension" : "Dimension"} | ${en ? "Weight" : "Gewicht"} | ${en ? "Value" : "Wert"} |`,
    "|---|---|---|---|",
    ...profile.dimensions.map((dm) => `| ${dm.id} | ${C.dimText(locale, dm.id).label} | ${dm.weight}% | ${dm.score}${dm.worstComponent ? ` (${dm.worstComponent})` : ""} |`),
  ];
  if (profile.directions.length) {
    parts.push("", `## ${en ? "Direction vector (pre-indication)" : "Richtungsvektor (Vorindikation)"}`, "", ...profile.directions.map((code) => `- ${C.directionText(locale, code)}`));
  }
  parts.push("", `## ${en ? "Ratings per criterion" : "Ratings je Kriterium"}`, "");
  for (const dm of DIMENSIONS) {
    parts.push(`### ${dm.id} — ${C.dimText(locale, dm.id).label}`, "");
    for (const c of criteriaOf(dm.id)) {
      const lvl = c.perComponent ? (en ? "(per component)" : "(je Komponente)") : L(c.id) ? `${L(c.id)}/5` : "—";
      const ev = ratings.criteria[c.id]?.evidence ? ` — ${ratings.criteria[c.id]!.evidence}` : "";
      parts.push(`- **${c.id}** ${C.critText(locale, c.id).label}: ${lvl}${ev}`);
    }
    parts.push("");
  }
  if (m.branch) parts.push(`## ${en ? "Diagnosis" : "Diagnose"}`, "", `${en ? "Chosen branch" : "Gewählter Zweig"}: **${m.branch}**${m.riskClass ? ` · ${en ? "risk class" : "Risikoklasse"} **${m.riskClass}**` : ""}`, "");
  parts.push(`_${en ? "Current phase" : "Aktuelle Phase"}: ${C.phaseText(locale, m.phase).label ?? m.phase}._`);

  const md = parts.join("\n");
  if (url.searchParams.get("format") === "md") {
    return new NextResponse(md, { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  return NextResponse.json({ markdown: md });
}
