import { NextResponse } from "next/server";
import { DIMENSIONS, criteriaOf, byId } from "@/lib/process/criteria";
import { byPhase } from "@/lib/process/phases";
import * as store from "@/lib/process/store";
import { profileOf } from "@/lib/process/profile";
import { STATUS_LABEL } from "@/lib/process/health-model";
import { deny } from "@/lib/process/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The one-page health profile as markdown (Recon- or Abschluss-Scoring blatt). */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const d = await deny();
  if (d) return d;
  const { slug } = params;
  const m = await store.meta(slug);
  if (!m || m.deleted) return NextResponse.json({ error: "no such engagement" }, { status: 404 });
  const [profile, ratings] = await Promise.all([profileOf(slug), store.ratings(slug)]);

  const L = (id: string) => ratings.criteria[id]?.level;
  const parts: string[] = [
    `# Prozess-Gesundheitsprofil — ${m.title}`,
    "",
    `**Spoke:** ${m.owner || "—"}${m.champion ? ` · Champion ${m.champion}` : ""}  ·  **Einheit:** ${m.unit || "—"}  ·  **Anflug:** ${m.anflug === "technology" ? "Technologie-Push" : "Prozess-Pull"}`,
    `**Status:** ${STATUS_LABEL[profile.status]} — ${profile.reason}`,
    `**Abdeckung:** ${Math.round(profile.coverage * 100)} %  ·  **Portfolio-Wert (nur Reihung):** ${profile.portfolioValue ?? "—"}`,
    "",
    "## Knock-outs",
    "",
    "| Kriterium | Stufe | Zustand |",
    "|---|---|---|",
    ...profile.knockOuts.map((k) => `| ${k.id} ${k.label} | ${k.level ? `S${k.level}` : "—"} | ${k.state} |`),
    "",
    "## Dimensionsprofil",
    "",
    "| Dim | Dimension | Gewicht | Wert |",
    "|---|---|---|---|",
    ...profile.dimensions.map((dm) => `| ${dm.id} | ${dm.label} | ${dm.weight}% | ${dm.score ?? "—"}${dm.worstComponent ? ` (${dm.worstComponent})` : ""} |`),
  ];
  if (profile.directions.length) {
    parts.push("", "## Richtungsvektor (Vorindikation)", "", ...profile.directions.map((x) => `- ${x}`));
  }
  parts.push("", "## Ratings je Kriterium", "");
  for (const dm of DIMENSIONS) {
    parts.push(`### ${dm.id} — ${dm.label}`, "");
    for (const c of criteriaOf(dm.id)) {
      const lvl = c.perComponent ? "(je Komponente)" : L(c.id) ? `S${L(c.id)}` : "—";
      const ev = byId[c.id] && ratings.criteria[c.id]?.evidence ? ` — ${ratings.criteria[c.id]!.evidence}` : "";
      parts.push(`- **${c.id}** ${c.label}: ${lvl}${ev}`);
    }
    parts.push("");
  }
  if (m.branch) parts.push(`## Diagnose`, "", `Gewählter Zweig: **${m.branch}**${m.riskClass ? ` · Risikoklasse **${m.riskClass}**` : ""}`, "");
  parts.push(`_Aktuelle Phase: ${byPhase[m.phase]?.label ?? m.phase}._`);

  const md = parts.join("\n");
  if (new URL(req.url).searchParams.get("format") === "md") {
    return new NextResponse(md, { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  return NextResponse.json({ markdown: md });
}
