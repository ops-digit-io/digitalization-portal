import { permanentRedirect } from "next/navigation";

/**
 * The tool landscape and the system landscape are ONE page now (`/landscape`).
 *
 * The old route stays as a permanent redirect rather than being deleted: the mesh,
 * any bookmark and any document that already points here keeps working. There is
 * nothing to render — a second surface over the same register is exactly the split
 * this consolidation removed.
 */
export default function ToolLandscapeRedirect(): never {
  permanentRedirect("/landscape");
}
