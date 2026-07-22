import { LAUNCHPAD } from "@/lib/launchpad";
import { LaunchTile } from "@/components/portal/tile";

export default function Launchpad() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Digital Unit Portal</h1>
        <p className="text-sm text-muted-foreground">
          Your front door to change demand — capture, analyse, decide, and build. Pick a tool.
        </p>
      </div>

      <div className="space-y-8">
        {LAUNCHPAD.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.category}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.tiles.map((tile) => (
                <LaunchTile key={tile.id} tile={tile} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
