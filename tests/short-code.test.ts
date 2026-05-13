import { describe, expect, it } from "vitest";
import { generateShortCode, isValidShortCode, normalizeShortCode, SHORT_CODE_LENGTH } from "@/lib/short-code";

describe("generateShortCode", () => {
  it("returns the requested length", () => {
    expect(generateShortCode().length).toBe(SHORT_CODE_LENGTH);
    expect(generateShortCode(8).length).toBe(8);
  });

  it("does not include homoglyph characters", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it("produces only Crockford base32 characters", () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidShortCode(generateShortCode())).toBe(true);
    }
  });

  it("rejects invalid characters", () => {
    expect(isValidShortCode("ABC-123")).toBe(false);
    expect(isValidShortCode("hi")).toBe(false);
  });

  it("normalizes user input by stripping ambiguous characters", () => {
    expect(normalizeShortCode("ab-1l!ob u")).toMatch(/^[0-9A-Z]+$/);
  });

  it("is non-sequential under bulk generation", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) codes.add(generateShortCode());
    // No collisions on 1k samples — entropy sanity check.
    expect(codes.size).toBe(1000);
  });
});
