import { describe, it, expect } from "vitest";
import { getNotifier, isEmail } from "./index.js";

describe("notifier config", () => {
  it("is null (inert) when email isn't configured", () => {
    expect(getNotifier({})).toBeNull();
    expect(getNotifier({ EMAIL_API_KEY: "k" })).toBeNull(); // needs FROM too
  });

  it("is an email notifier when configured", () => {
    const n = getNotifier({ EMAIL_API_KEY: "k", EMAIL_FROM: "DU <du@x.com>" });
    expect(n?.channel).toBe("email");
  });
});

describe("isEmail", () => {
  it("accepts real emails and rejects free-text names", () => {
    expect(isEmail("a@x.com")).toBe(true);
    expect(isEmail("Jane Doe")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail(undefined)).toBe(false);
    expect(isEmail("<!-- required before G3 -->")).toBe(false);
  });
});
