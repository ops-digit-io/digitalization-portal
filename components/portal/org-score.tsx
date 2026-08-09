/** A compact completeness bar — reused on the org map and the department detail. */
export function ScoreBar({ score, className = "" }: { score: number; className?: string }) {
  const tone = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
    </div>
  );
}

/** The score as a labelled percentage chip. */
export function ScorePill({ score }: { score: number }) {
  const tone = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return <span className={`font-mono text-sm font-semibold ${tone}`}>{score}%</span>;
}
