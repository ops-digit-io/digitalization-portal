import Link from "next/link";
import { byKind, collapseReciprocal, type Neighbour, type Neighbourhood } from "@/lib/mesh";
import { referenceKind, referenceHref, type ReferenceKind } from "@/lib/references";

/**
 * The context mesh, rendered — what this artifact points at, and what points back.
 *
 * Two decisions the panel makes visible rather than smoothing over:
 *
 * - **Outbound and inbound are separate lists.** "This demand names that persona"
 *   and "these requirements cite this persona" are different facts, and merging
 *   them into one "Related" pile would let a reader assume an edge was declared
 *   here when it was declared somewhere else.
 * - **Derived edges are marked.** An authored reference has a person behind it; a
 *   derived one is exactly as reliable as the field it was read from. The panel
 *   says which is which for the same reason the digest says it is derived.
 *
 * Renders nothing at all when there is nothing to show: an empty "Related" heading
 * reads as "checked, nothing related", which is a claim the mesh cannot make.
 */

function Row({ n }: { n: Neighbour }) {
  const href = referenceHref({ kind: n.kind, id: n.id, note: n.note });
  return (
    <li className="border-t py-2 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-2">
        <Link href={href} className="text-sm font-medium hover:underline">
          {n.title || n.id}
        </Link>
        {n.title && <span className="font-mono text-[10px] text-muted-foreground">{n.id}</span>}
        {n.source === "derived" && (
          <span
            className="ml-auto shrink-0 rounded-full border border-dashed px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"
            title="Read from structured data, not written by a person"
          >
            derived
          </span>
        )}
      </div>
      {n.note && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{n.note}</p>}
    </li>
  );
}

function Side({ heading, items }: { heading: string; items: readonly Neighbour[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h3>
      <div className="space-y-3">
        {byKind(items).map(({ kind, items: group }) => (
          <div key={kind}>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{label(kind, group.length)}</p>
            <ul>
              {group.map((n) => (
                <Row key={`${n.kind}:${n.id}`} n={n} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function label(kind: ReferenceKind, count: number): string {
  const base = referenceKind(kind)?.label ?? kind;
  // "Requirements" is already plural; the rest take an s when there is more than one.
  return count > 1 && !base.endsWith("s") ? `${base}s` : base;
}

export function RelatedPanel({ mesh: full, truncated }: { mesh: Neighbourhood; truncated?: boolean }) {
  // One relationship, stated once: an artifact declared here is not also listed
  // under "Referenced by" just because the other end restates it.
  const mesh = collapseReciprocal(full);
  if (!mesh.outbound.length && !mesh.inbound.length) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">Related</h2>
      <div className="space-y-4">
        <Side heading="References" items={mesh.outbound} />
        <Side heading="Referenced by" items={mesh.inbound} />
        {truncated && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Authored backlinks were scanned across part of the funnel, not all of it — there may be more.
          </p>
        )}
      </div>
    </div>
  );
}
