import { authorityLadder, RUNG_TONE } from "@/lib/org/autonomy";
import { getT } from "@/lib/i18n-server";

/**
 * Plain-language explainer of the autonomy ladder — what the five rungs MEAN and where a
 * human stays in control. Shown wherever an authority level appears, so the concept is
 * never a bare slug on a badge. Server component (pure data), reusable.
 */
export function AutonomyLegend({ compact = false }: { compact?: boolean }) {
  const { t } = getT();
  const ladder = authorityLadder();
  return (
    <div className="rounded-lg border bg-secondary/20 p-4">
      <h3 className="text-sm font-semibold">{t("autonomy.legendTitle", "What “autonomy” means")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("autonomy.legendIntro", "How far a lane’s AI agent may act on its own. Five rungs, from just looking to acting by itself — earned one rung at a time, only after the lane’s agent brief is written down.")}</p>
      <ol className="mt-3 space-y-2">
        {ladder.map((p) => (
          <li key={p.level} className="flex items-start gap-2.5">
            <span className={`mt-1 inline-block size-2.5 shrink-0 rounded-full ${RUNG_TONE[p.tone].dot}`} aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-semibold text-foreground">
                  {p.rank}. {t(`autonomy.${p.level}.label`, p.label)}
                </span>
                {p.acts && (
                  <span className={`rounded px-1 text-[10px] ${RUNG_TONE[p.tone].badge}`}>
                    {p.requiresApproval ? t("autonomy.actsApproval", "acts, with your approval") : t("autonomy.actsOwn", "acts on its own")}
                  </span>
                )}
                {!compact && <span className="font-mono text-[10px] text-muted-foreground">{p.level}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{t(`autonomy.${p.level}.summary`, p.summary)}</p>
              <p className="text-xs text-foreground/70">
                <span className="font-medium">{t("autonomy.you", "You:")}</span> {t(`autonomy.${p.level}.human`, p.human)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
