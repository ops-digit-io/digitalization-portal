"use client";

import { useEffect, useState } from "react";
import type { Neighbourhood } from "@/lib/mesh";
import type { ReferenceKind } from "@/lib/references";

export interface MeshResult extends Neighbourhood {
  truncated: boolean;
}

/**
 * An artifact's neighbourhood, for pages that run in the client tree and so cannot
 * call `loadNeighbourhood` themselves.
 *
 * Returns null until it has something, and stays null on failure: the mesh is an
 * aid to navigation, and a page must never show an error — or an empty "Related" —
 * because a secondary lookup did not come back.
 */
export function useMesh(kind: ReferenceKind, id: string): MeshResult | null {
  const [mesh, setMesh] = useState<MeshResult | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/mesh?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MeshResult | null) => {
        if (alive && d) setMesh(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [kind, id]);

  return mesh;
}
