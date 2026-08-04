/**
 * The mesh graph. The cases that matter are the ones where the same relation
 * arrives from two directions at once — that is the normal state of a graph half
 * of which is derived from structured data and half authored by hand.
 */

import { describe, it, expect } from "vitest";
import {
  edgesFrom,
  dedupeEdges,
  neighbourhood,
  byKind,
  collapseReciprocal,
  danglingEdges,
  sameRef,
  type MeshEdge,
} from "./mesh";
import { parseReferences } from "./references";

const uc = (id: string) => ({ kind: "demand" as const, id });
const proc = (id: string) => ({ kind: "process" as const, id });
const persona = (id: string) => ({ kind: "persona" as const, id });

describe("edgesFrom", () => {
  it("turns a document's Related section into edges from that document", () => {
    const md = "## Related\n\n- UC-2026-0002 — duplicate\n- process:downtime — diagnosed here\n";
    const edges = edgesFrom(uc("UC-2026-0001"), parseReferences(md));
    expect(edges).toHaveLength(2);
    expect(edges[0]).toEqual({ from: uc("UC-2026-0001"), to: uc("UC-2026-0002"), note: "duplicate", source: "authored" });
    expect(edges[1]?.to).toEqual(proc("downtime"));
  });

  it("drops a self-edge — an artifact citing itself is always a mistake", () => {
    const md = "## Related\n\n- UC-2026-0001 — itself\n- uc:uc-2026-0001 — itself again, other case\n";
    expect(edgesFrom(uc("UC-2026-0001"), parseReferences(md))).toEqual([]);
  });

  it("marks derived edges as derived", () => {
    const edges = edgesFrom(proc("downtime"), [{ kind: "demand", id: "UC-2026-0007", note: "created here" }], "derived");
    expect(edges[0]?.source).toBe("derived");
  });
});

describe("dedupeEdges", () => {
  it("prefers the authored edge over the derived one — it carries the reason", () => {
    const derived: MeshEdge = { from: proc("p"), to: uc("UC-2026-0001"), note: "", source: "derived" };
    const authored: MeshEdge = { from: proc("p"), to: uc("UC-2026-0001"), note: "the pilot case", source: "authored" };
    for (const order of [[derived, authored], [authored, derived]]) {
      const out = dedupeEdges(order);
      expect(out).toHaveLength(1);
      expect(out[0]?.source).toBe("authored");
      expect(out[0]?.note).toBe("the pilot case");
    }
  });

  it("prefers the edge that has a note when both are the same source", () => {
    const bare: MeshEdge = { from: proc("p"), to: uc("U"), note: "", source: "derived" };
    const noted: MeshEdge = { from: proc("p"), to: uc("U"), note: "why", source: "derived" };
    expect(dedupeEdges([bare, noted])[0]?.note).toBe("why");
    expect(dedupeEdges([noted, bare])[0]?.note).toBe("why");
  });

  it("treats direction as significant — A→B and B→A are different edges", () => {
    const out = dedupeEdges([
      { from: uc("A"), to: uc("B"), note: "", source: "authored" },
      { from: uc("B"), to: uc("A"), note: "", source: "authored" },
    ]);
    expect(out).toHaveLength(2);
  });

  it("ignores id case when deciding what is a duplicate", () => {
    const out = dedupeEdges([
      { from: uc("UC-2026-0001"), to: persona("P-03"), note: "a", source: "authored" },
      { from: uc("uc-2026-0001"), to: persona("p-03"), note: "b", source: "authored" },
    ]);
    expect(out).toHaveLength(1);
  });
});

describe("neighbourhood", () => {
  const edges: MeshEdge[] = [
    { from: uc("UC-1"), to: uc("UC-2"), note: "duplicate of", source: "authored" },
    { from: proc("downtime"), to: uc("UC-1"), note: "created here", source: "derived" },
    { from: uc("UC-3"), to: uc("UC-1"), note: "shares the taxonomy", source: "authored" },
    { from: uc("UC-1"), to: persona("P-03"), note: "primary persona", source: "derived" },
  ];

  it("separates what a node points at from what points at it", () => {
    const n = neighbourhood(edges, uc("UC-1"));
    expect(n.outbound.map((o) => o.id)).toEqual(["UC-2", "P-03"]);
    expect(n.inbound.map((i) => i.id)).toEqual(["UC-3", "downtime"]);
  });

  it("surfaces the inbound half nobody writes down", () => {
    // The process diagnosis records the demand it created; the demand does not
    // record the diagnosis. Inbound is the whole point of the mesh.
    const n = neighbourhood(edges, uc("UC-1"));
    expect(n.inbound.find((i) => i.kind === "process")).toMatchObject({ id: "downtime", note: "created here", source: "derived" });
  });

  it("matches the subject regardless of id case", () => {
    expect(neighbourhood(edges, uc("uc-1")).outbound).toHaveLength(2);
  });

  it("returns empty sides for a node nothing touches", () => {
    expect(neighbourhood(edges, uc("UC-999"))).toEqual({ outbound: [], inbound: [] });
  });

  it("resolves titles when the portal knows them, and omits them when it does not", () => {
    const n = neighbourhood(edges, uc("UC-1"), (r) => (r.id === "UC-2" ? "Tender copilot" : undefined));
    expect(n.outbound.find((o) => o.id === "UC-2")?.title).toBe("Tender copilot");
    expect(n.outbound.find((o) => o.id === "P-03")).not.toHaveProperty("title");
  });

  it("sorts by kind then id, not by source", () => {
    // A reader wants all the demands together, not authored above derived.
    const n = neighbourhood(
      [
        { from: uc("X"), to: persona("P-09"), note: "", source: "authored" },
        { from: uc("X"), to: uc("UC-9"), note: "", source: "derived" },
        { from: uc("X"), to: uc("UC-2"), note: "", source: "authored" },
      ],
      uc("X"),
    );
    expect(n.outbound.map((o) => `${o.kind}:${o.id}`)).toEqual(["demand:UC-2", "demand:UC-9", "persona:P-09"]);
  });
});

describe("byKind", () => {
  it("groups in display order and omits kinds with nothing in them", () => {
    const n = neighbourhood(
      [
        { from: uc("X"), to: persona("P-01"), note: "", source: "derived" },
        { from: uc("X"), to: uc("UC-2"), note: "", source: "authored" },
        { from: uc("X"), to: persona("P-02"), note: "", source: "derived" },
      ],
      uc("X"),
    );
    expect(byKind(n.outbound).map((g) => g.kind)).toEqual(["demand", "persona"]);
    expect(byKind(n.outbound)[1]?.items).toHaveLength(2);
    expect(byKind([])).toEqual([]);
  });
});

describe("danglingEdges", () => {
  it("finds edges pointing at artifacts that are not there", () => {
    // A mesh that points at deleted artifacts reads as coverage and delivers a 404.
    const edges: MeshEdge[] = [
      { from: uc("UC-1"), to: uc("UC-2"), note: "", source: "authored" },
      { from: uc("UC-1"), to: uc("UC-GONE"), note: "", source: "authored" },
    ];
    const dangling = danglingEdges(edges, (r) => r.id !== "UC-GONE");
    expect(dangling).toHaveLength(1);
    expect(dangling[0]?.to.id).toBe("UC-GONE");
  });
});

describe("sameRef", () => {
  it("compares kind and id, case-insensitively on the id only", () => {
    expect(sameRef(uc("UC-1"), uc("uc-1"))).toBe(true);
    expect(sameRef(uc("UC-1"), persona("UC-1"))).toBe(false);
  });
});

describe("collapseReciprocal", () => {
  it("keeps the declared side when both ends state the same relationship", () => {
    // The demand declares its origin; the diagnosis lists the demand it created.
    // On the demand's page that is one relationship, not two.
    const edges: MeshEdge[] = [
      { from: uc("UC-1"), to: proc("downtime"), note: "cut out of this diagnosis", source: "authored" },
      { from: proc("downtime"), to: uc("UC-1"), note: "created here", source: "derived" },
    ];
    const collapsed = collapseReciprocal(neighbourhood(edges, uc("UC-1")));
    expect(collapsed.outbound.map((o) => o.id)).toEqual(["downtime"]);
    expect(collapsed.inbound).toEqual([]);
    expect(collapsed.outbound[0]?.note).toBe("cut out of this diagnosis");
  });

  it("leaves a one-directional backlink alone", () => {
    const edges: MeshEdge[] = [{ from: uc("UC-2"), to: uc("UC-1"), note: "duplicate", source: "authored" }];
    const collapsed = collapseReciprocal(neighbourhood(edges, uc("UC-1")));
    expect(collapsed.inbound.map((i) => i.id)).toEqual(["UC-2"]);
  });

  it("does not collapse across kinds that merely share an id", () => {
    const edges: MeshEdge[] = [
      { from: uc("X"), to: { kind: "requirement", id: "X" }, note: "", source: "derived" },
      { from: persona("X"), to: uc("X"), note: "", source: "authored" },
    ];
    const collapsed = collapseReciprocal(neighbourhood(edges, uc("X")));
    expect(collapsed.inbound.map((i) => i.kind)).toEqual(["persona"]);
  });
});
