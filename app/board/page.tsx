import { assembleBoard } from "@/lib/board";
import { STAGES } from "@/lib/types";
import { SEED_ROWS, DEMO_SESSION, DEMO_NOW } from "@/lib/seed";
import { StageColumn } from "@/components/portal/stage-column";

const FILTERS = ["Lane", "Plant", "Domain", "Heat"];

export default function BoardPage() {
  const board = assembleBoard(SEED_ROWS, DEMO_SESSION, DEMO_NOW);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Portfolio</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {f}
              <span aria-hidden>▾</span>
            </button>
          ))}
          <div className="inline-flex h-8 items-center rounded-md border px-3 text-xs text-muted-foreground">
            ⌕ Search
          </div>
        </div>
      </div>

      {board.needsAttention.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm">
          <span className="text-warn" aria-hidden>⚠</span>
          <span>
            {board.needsAttention.length} use case
            {board.needsAttention.length > 1 ? "s" : ""}{" "}
            {board.needsAttention.length > 1 ? "need" : "needs"} attention — state could not be read.
          </span>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <StageColumn key={stage} stage={stage} cards={board.columns[stage]} />
        ))}
      </div>
    </main>
  );
}
