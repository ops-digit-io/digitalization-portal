/**
 * Grader tests. The most important guarantee, ported from PDT's boot check: every
 * one of the 14 ported section schemas is structurally valid — required weights sum
 * to 100 and every regex compiles. This is the test that catches the `(?i)` inline
 * flag class of silent failure that made sections score zero forever in PDT.
 */

import { describe, it, expect } from "vitest";
import { grade, validateSchema, compile } from "./grader";
import { allSchemas } from "./assets";
import { SECTIONS } from "./sections";

describe("grader", () => {
  const schemas = allSchemas();

  it("all 14 section schemas are present and structurally valid", () => {
    for (const s of SECTIONS) {
      const schema = schemas[s.key];
      expect(schema, `schema missing for ${s.key}`).toBeTruthy();
      const errs = validateSchema(schema, s.key);
      expect(errs, `schema problems for ${s.key}: ${errs.join("; ")}`).toEqual([]);
    }
  });

  it("normalises both inline case-insensitivity spellings without throwing", () => {
    expect(compile("(?i)hello").test("HELLO")).toBe(true);
    expect(compile("(?i:hello)").test("HELLO")).toBe(true);
    expect(compile("plain").test("plain")).toBe(true);
  });

  it("an empty artefact scores 0 and a placeholder-only field does not count as filled", () => {
    const schema = { required: [{ type: "field" as const, weight: 100, pattern: "Owner" }] };
    expect(grade("", schema).score).toBe(0);
    expect(grade("**Owner:** [name]", schema).score).toBe(0);
    expect(grade("**Owner:** Jane Doe", schema).score).toBe(100);
  });

  it("a markdown link in a field value is not read as an unfilled placeholder", () => {
    const schema = { required: [{ type: "field" as const, weight: 100, pattern: "Source" }] };
    expect(grade("**Source:** [SAP export](https://x/y)", schema).score).toBe(100);
  });
});
