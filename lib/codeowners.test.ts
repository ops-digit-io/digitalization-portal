import { describe, expect, it } from "vitest";
import { generateCodeowners } from "./codeowners.js";

describe("generateCodeowners (no gatekeeper)", () => {
  const out = generateCodeowners({ id: "UC-2026-0041", plant: "DE-ALD", lane: "transform" });

  it("has the generated header naming the use case, plant, and lane", () => {
    expect(out).toMatch(/# UC-2026-0041 · plant DE-ALD · lane transform/);
    expect(out).toMatch(/do not edit/);
  });

  it("never emits a gatekeeper team (the role is removed)", () => {
    expect(out).not.toMatch(/gatekeeper/i);
  });

  it("routes README to triage and the portfolio forum", () => {
    expect(out).toMatch(/README\.md\s+@org\/du-triage @org\/portfolio-forum/);
  });

  it("routes value-tracking to du-value and handover to it-liaison", () => {
    expect(out).toMatch(/ops\/value-tracking\.md\s+@org\/du-value/);
    expect(out).toMatch(/ops\/handover\.md\s+@org\/it-liaison @org\/portfolio-forum/);
  });

  it("does not depend on plant — same lane yields identical body across plants", () => {
    const a = generateCodeowners({ id: "UC-1", plant: "DE-ALD", lane: "transform" });
    const b = generateCodeowners({ id: "UC-1", plant: "SK-PUC", lane: "transform" });
    const bodyA = a.split("\n").filter((l) => !l.startsWith("#")).join("\n");
    const bodyB = b.split("\n").filter((l) => !l.startsWith("#")).join("\n");
    expect(bodyA).toBe(bodyB);
  });

  it("honours a custom org namespace", () => {
    const acme = generateCodeowners({ id: "UC-1", plant: "DE-ALD", lane: "transform", org: "acme" });
    expect(acme).toMatch(/@acme\/du-triage/);
  });
});
