/**
 * The context-mesh grammar.
 *
 * Tested the way `lib/parse.ts` is tested: the interesting cases are the broken
 * documents. A reference layer that throws on a typo would make every artifact
 * holding one unreadable, which is a far worse failure than a missing edge.
 */

import { describe, it, expect } from "vitest";
import {
  parseReferences,
  serializeReferences,
  setReferences,
  addReference,
  removeReference,
  parseTarget,
  targetFor,
  splitRelation,
  joinRelation,
  referenceHref,
  RELATIONS,
  RELATION_INVERSE,
  RELATION_LABEL,
  REFERENCE_KINDS,
  type Reference,
} from "./references";

const doc = (related: string) => `# UC-2026-0001 · Scrap attribution

## State

- **Stage:** S4

## Gates

| Gate | Status |
|---|---|
| G1 | passed |

## Related

${related}

## History

- 2026-03-12 — created
`;

describe("parseTarget", () => {
  it("reads the bare ids the data model already specifies", () => {
    // docs/03-data-model.md §3.5 writes "- UC-2026-0033 — related, shares …".
    expect(parseTarget("UC-2026-0033")).toEqual({ kind: "demand", id: "UC-2026-0033" });
    expect(parseTarget("P-03")).toEqual({ kind: "persona", id: "P-03" });
    expect(parseTarget("C-01")).toEqual({ kind: "champion", id: "C-01" });
  });

  it("reads prefixed targets, including kinds with no distinguishing id shape", () => {
    expect(parseTarget("process:downtime-reason-capture")).toEqual({ kind: "process", id: "downtime-reason-capture" });
    expect(parseTarget("skill:demand-classification")).toEqual({ kind: "skill", id: "demand-classification" });
    expect(parseTarget("playbook:s1-intake")).toEqual({ kind: "playbook", id: "s1-intake" });
    expect(parseTarget("uc:UC-2026-0033")).toEqual({ kind: "demand", id: "UC-2026-0033" });
  });

  it("normalises the case of ids that are upper-case by convention", () => {
    expect(parseTarget("uc-2026-0033")?.id).toBe("UC-2026-0033");
    expect(parseTarget("persona:p-03")?.id).toBe("P-03");
    // A process slug is lower-case by nature and is left exactly as written.
    expect(parseTarget("process:Downtime-Capture")?.id).toBe("Downtime-Capture");
  });

  it("refuses anything that names no kind, rather than inventing one", () => {
    for (const bad of ["", "   ", "see the board", "note: see the board", "http://example.com", ":", "x:"]) {
      expect(parseTarget(bad)).toBeUndefined();
    }
  });
});

describe("parseReferences", () => {
  it("reads the section the data model specifies, and types its relation", () => {
    // The spec's own example opens with a relation word — which is where the
    // typed-relation convention comes from, rather than being invented here.
    const refs = parseReferences(doc("- UC-2026-0033 — related, shares cause-code taxonomy"));
    expect(refs).toEqual([
      { kind: "demand", id: "UC-2026-0033", relation: "related", note: "shares cause-code taxonomy" },
    ]);
  });

  it("accepts em dash, en dash, double hyphen, and no note at all", () => {
    const refs = parseReferences(
      doc(["- UC-2026-0002 — em dash", "- UC-2026-0003 – en dash", "- UC-2026-0004 -- double hyphen", "- UC-2026-0005"].join("\n")),
    );
    expect(refs.map((r) => r.note)).toEqual(["em dash", "en dash", "double hyphen", ""]);
  });

  it("keeps a note that itself contains a dash", () => {
    const refs = parseReferences(doc("- UC-2026-0033 — shares the taxonomy — and the owner"));
    expect(refs[0]?.note).toBe("shares the taxonomy — and the owner");
  });

  it("returns nothing for a document with no Related section", () => {
    expect(parseReferences("# Title\n\n## State\n\n- **Stage:** S1\n")).toEqual([]);
    expect(parseReferences("")).toEqual([]);
  });

  it("drops only the lines it cannot read", () => {
    const refs = parseReferences(
      doc(["- UC-2026-0033 — good", "- nonsense that names nothing", "", "not a list item at all", "- persona:P-07 — also good"].join("\n")),
    );
    expect(refs.map((r) => r.id)).toEqual(["UC-2026-0033", "P-07"]);
  });

  it("collapses duplicate edges to the first, so two writers agree", () => {
    const refs = parseReferences(doc(["- UC-2026-0033 — first note", "- uc:uc-2026-0033 — second note"].join("\n")));
    expect(refs).toHaveLength(1);
    expect(refs[0]?.note).toBe("first note");
  });

  it("stops at the next heading and never bleeds into History", () => {
    const refs = parseReferences(doc("- UC-2026-0033 — good"));
    expect(refs).toHaveLength(1);
    expect(refs.map((r) => r.note).join()).not.toMatch(/created/);
  });

  it("never throws, whatever it is handed", () => {
    const hostile = [
      "## Related\n- ",
      "## Related",
      "## related\n\n- UC-2026-0001 — lower-case heading",
      "## Related\n\n- ".repeat(200),
      "#".repeat(500),
      null as unknown as string,
      undefined as unknown as string,
      42 as unknown as string,
    ];
    for (const h of hostile) expect(() => parseReferences(h)).not.toThrow();
    expect(parseReferences("## related\n\n- UC-2026-0001 — lower-case heading")).toHaveLength(1);
  });
});

describe("serializeReferences", () => {
  it("round-trips: parse → serialize → parse is stable", () => {
    const refs: Reference[] = [
      { kind: "demand", id: "UC-2026-0033", note: "shares the cause-code taxonomy" },
      { kind: "process", id: "downtime-reason-capture", note: "diagnosed here before intake" },
      { kind: "persona", id: "P-03", note: "" },
    ];
    const round = parseReferences(doc(serializeReferences(refs)));
    expect(round).toEqual(refs);
    expect(serializeReferences(round)).toBe(serializeReferences(refs));
  });

  it("writes a demand bare, the way the spec's own example does", () => {
    expect(serializeReferences([{ kind: "demand", id: "UC-2026-0033", note: "x" }])).toBe("- UC-2026-0033 — x");
    expect(serializeReferences([{ kind: "process", id: "abc", note: "" }])).toBe("- process:abc");
  });
});

describe("setReferences", () => {
  it("replaces the section without disturbing State, Gates or History", () => {
    const out = setReferences(doc("- UC-2026-0033 — old"), [{ kind: "persona", id: "P-03", note: "new" }]);
    expect(out).toContain("- **Stage:** S4");
    expect(out).toContain("| G1 | passed |");
    expect(out).toContain("2026-03-12 — created");
    expect(out).toContain("- persona:P-03 — new");
    expect(out).not.toContain("UC-2026-0033");
  });

  it("inserts the section before History when the document has none", () => {
    const bare = "# UC-2026-0002 · Title\n\n## State\n\n- **Stage:** S1\n\n## History\n\n- 2026-01-01 — created\n";
    const out = setReferences(bare, [{ kind: "demand", id: "UC-2026-0009", note: "duplicate" }]);
    expect(out.indexOf("## Related")).toBeGreaterThan(out.indexOf("## State"));
    expect(out.indexOf("## Related")).toBeLessThan(out.indexOf("## History"));
    expect(parseReferences(out)).toHaveLength(1);
  });

  it("appends when there is no History to sit in front of", () => {
    const out = setReferences("# Title\n\n## State\n\n- **Stage:** S1\n", [{ kind: "demand", id: "UC-2026-0009", note: "" }]);
    expect(parseReferences(out)).toHaveLength(1);
  });

  it("removes the heading entirely rather than leaving an empty one", () => {
    // An empty "## Related" reads as "checked, none found" — a claim we cannot make.
    const out = setReferences(doc("- UC-2026-0033 — old"), []);
    expect(out).not.toContain("## Related");
    expect(out).toContain("## History");
  });

  it("leaves a document with no references and nothing to add untouched", () => {
    const bare = "# Title\n\n## State\n\n- **Stage:** S1\n";
    expect(setReferences(bare, [])).toBe(bare);
  });
});

describe("addReference / removeReference", () => {
  it("is idempotent — recording the same edge twice changes nothing the second time", () => {
    const ref: Reference = { kind: "process", id: "downtime", note: "diagnosed here" };
    const once = addReference(doc("- UC-2026-0033 — keep"), ref);
    const twice = addReference(once, ref);
    expect(twice).toBe(once);
    expect(parseReferences(twice)).toHaveLength(2);
  });

  it("refreshes a note when given one, and never blanks a note when not", () => {
    const base = addReference("# T\n\n## State\n\n- **Stage:** S1\n", { kind: "persona", id: "P-03", note: "written by hand" });
    // An automated re-run with no note must not wipe what a human wrote.
    expect(parseReferences(addReference(base, { kind: "persona", id: "P-03", note: "" }))[0]?.note).toBe("written by hand");
    expect(parseReferences(addReference(base, { kind: "persona", id: "P-03", note: "better" }))[0]?.note).toBe("better");
  });

  it("keeps an existing edge in place rather than moving it to the end", () => {
    let md = doc(["- UC-2026-0001 — first", "- UC-2026-0002 — second"].join("\n"));
    md = addReference(md, { kind: "demand", id: "UC-2026-0001", note: "updated" });
    expect(parseReferences(md).map((r) => r.id)).toEqual(["UC-2026-0001", "UC-2026-0002"]);
  });

  it("removes an edge, and leaves the document alone when it was not there", () => {
    const md = doc(["- UC-2026-0001 — a", "- persona:P-03 — b"].join("\n"));
    expect(parseReferences(removeReference(md, "demand", "uc-2026-0001")).map((r) => r.id)).toEqual(["P-03"]);
    expect(removeReference(md, "demand", "UC-2026-9999")).toBe(md);
  });
});

describe("referenceHref", () => {
  it("points every kind somewhere real", () => {
    expect(referenceHref({ kind: "demand", id: "UC-2026-0001", note: "" })).toBe("/uc/UC-2026-0001");
    expect(referenceHref({ kind: "process", id: "a-slug", note: "" })).toBe("/process/a-slug");
    expect(referenceHref({ kind: "requirement", id: "UC-2026-0001", note: "" })).toBe("/requirements/UC-2026-0001");
    expect(referenceHref({ kind: "skill", id: "s", note: "" })).toBe("/catalog/skill/s");
  });

  it("encodes ids so a stray slash cannot escape the route", () => {
    expect(referenceHref({ kind: "process", id: "a/../b", note: "" })).toBe("/process/a%2F..%2Fb");
  });

  it("every kind in the table is reachable and its bare-id shapes do not overlap", () => {
    for (const def of REFERENCE_KINDS) {
      expect(def.href("x")).toMatch(/^\//);
      if (!def.bareId) continue;
      const others = REFERENCE_KINDS.filter((o) => o !== def && o.bareId);
      for (const sample of ["UC-2026-0001", "P-03", "C-01"]) {
        if (!def.bareId.test(sample)) continue;
        // Exactly one kind may claim a given bare id, or inference is a coin flip.
        expect(others.filter((o) => o.bareId!.test(sample))).toHaveLength(0);
      }
    }
  });
});

describe("relations", () => {
  it("types the vocabulary the UI writes, and keeps the rest as prose", () => {
    expect(splitRelation("duplicate of, same reason list")).toEqual({ relation: "duplicate", rest: "same reason list" });
    expect(splitRelation("depends on — the ERP export lands first")).toEqual({
      relation: "depends-on",
      rest: "the ERP export lands first",
    });
    expect(splitRelation("part of")).toEqual({ relation: "part-of", rest: "" });
  });

  it("never eats the first word of a note that merely starts with a relation word", () => {
    // "related work stopped in March" is prose, not a typed relation.
    expect(splitRelation("related work stopped in March")).toEqual({ rest: "related work stopped in March" });
    expect(splitRelation("blocks are cast on Tuesdays")).toEqual({ rest: "blocks are cast on Tuesdays" });
    expect(splitRelation("shares the taxonomy")).toEqual({ rest: "shares the taxonomy" });
  });

  it("reads the longest label first, so 'superseded by' is not 'supersedes'", () => {
    expect(splitRelation("superseded by, UC-2026-0044 replaced it").relation).toBe("superseded-by");
    expect(splitRelation("supersedes, the old manual check").relation).toBe("supersedes");
  });

  it("round-trips every relation in the vocabulary, with and without a note", () => {
    for (const relation of RELATIONS) {
      for (const note of ["", "because of the taxonomy"]) {
        const line = joinRelation(relation, note);
        expect(splitRelation(line)).toEqual({ relation, rest: note });
        const round = parseReferences(doc(`- UC-2026-0033 — ${line}`));
        expect(round[0]).toMatchObject({ relation, note });
      }
    }
  });

  it("survives the full markdown round-trip", () => {
    const refs: Reference[] = [
      { kind: "demand", id: "UC-2026-0033", relation: "duplicate", note: "same reason list" },
      { kind: "demand", id: "UC-2026-0044", relation: "blocks", note: "" },
      { kind: "persona", id: "P-03", note: "no relation, just a note" },
    ];
    expect(parseReferences(doc(serializeReferences(refs)))).toEqual(refs);
  });

  it("treats a changed relation as a change worth writing", () => {
    const base = addReference("# T\n\n## State\n", { kind: "demand", id: "UC-2026-0033", relation: "related", note: "x" });
    const promoted = addReference(base, { kind: "demand", id: "UC-2026-0033", relation: "duplicate", note: "x" });
    expect(parseReferences(promoted)[0]?.relation).toBe("duplicate");
    // Re-running with the same relation is still a no-op.
    expect(addReference(promoted, { kind: "demand", id: "UC-2026-0033", relation: "duplicate", note: "" })).toBe(promoted);
  });

  it("every relation has an inverse, and inverting twice is identity", () => {
    for (const r of RELATIONS) {
      expect(RELATIONS).toContain(RELATION_INVERSE[r]);
      expect(RELATION_INVERSE[RELATION_INVERSE[r]]).toBe(r);
      expect(RELATION_LABEL[r]).toBeTruthy();
    }
  });
});

describe("targetFor", () => {
  it("accepts a kind NAME even when the markdown prefix differs", () => {
    // The demand kind's prefix is "uc". Assembling "demand:UC-…" and handing it to
    // parseTarget names no kind and is dropped — the bug this function exists to
    // make unwritable. Every reference flagged at intake was lost to it.
    expect(targetFor("demand", "UC-2026-0001")).toEqual({ kind: "demand", id: "UC-2026-0001" });
    expect(parseTarget("demand:UC-2026-0001")).toBeUndefined();
  });

  it("accepts the markdown prefix too", () => {
    expect(targetFor("uc", "UC-2026-0001")).toEqual({ kind: "demand", id: "UC-2026-0001" });
    expect(targetFor("process", "a-slug")).toEqual({ kind: "process", id: "a-slug" });
  });

  it("normalises the id the same way the parser does", () => {
    expect(targetFor("demand", "uc-2026-0001")?.id).toBe("UC-2026-0001");
    expect(targetFor("persona", "p-03")?.id).toBe("P-03");
    expect(targetFor("process", "Mixed-Case")?.id).toBe("Mixed-Case");
  });

  it("falls back to reading the id alone when the kind is missing or unknown", () => {
    expect(targetFor(undefined, "UC-2026-0001")).toEqual({ kind: "demand", id: "UC-2026-0001" });
    expect(targetFor("nonsense", "process:a-slug")).toEqual({ kind: "process", id: "a-slug" });
    expect(targetFor(42, "P-03")).toEqual({ kind: "persona", id: "P-03" });
  });

  it("refuses an empty or non-string id", () => {
    for (const bad of ["", "   ", undefined, null, 7]) {
      expect(targetFor("demand", bad)).toBeUndefined();
    }
  });

  it("every kind round-trips through its own name", () => {
    for (const def of REFERENCE_KINDS) {
      expect(targetFor(def.kind, "sample-id")?.kind).toBe(def.kind);
    }
  });
});
