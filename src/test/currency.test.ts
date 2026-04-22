import { describe, it, expect } from "vitest";
import { formatRM, toRMNumber, formatRMDelta } from "@/lib/currency";

describe("toRMNumber", () => {
  it("coerces null/undefined to 0", () => {
    expect(toRMNumber(null)).toBe(0);
    expect(toRMNumber(undefined)).toBe(0);
  });

  it("coerces non-finite values to 0", () => {
    expect(toRMNumber(NaN)).toBe(0);
    expect(toRMNumber(Infinity)).toBe(0);
    expect(toRMNumber(-Infinity)).toBe(0);
  });

  it("coerces unparseable strings to 0", () => {
    expect(toRMNumber("abc")).toBe(0);
    expect(toRMNumber("")).toBe(0);
  });

  it("preserves finite numbers", () => {
    expect(toRMNumber(0)).toBe(0);
    expect(toRMNumber(1234.5)).toBe(1234.5);
    expect(toRMNumber(-9.9)).toBe(-9.9);
  });

  it("parses numeric strings", () => {
    expect(toRMNumber("12.3")).toBe(12.3);
    expect(toRMNumber("0")).toBe(0);
    expect(toRMNumber(" 42 ")).toBe(42);
  });
});

describe("formatRM — fallback to RM 0.00", () => {
  const ZERO = "RM 0.00";
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["empty string", ""],
    ["'abc'", "abc"],
    ["literal 0", 0],
  ])("renders %s as RM 0.00", (_label, input) => {
    expect(formatRM(input as any)).toBe(ZERO);
  });
});

describe("formatRM — canonical 2-decimal output", () => {
  it("formats positive numbers with grouping and 2 decimals", () => {
    expect(formatRM(1234.5)).toBe("RM 1,234.50");
    expect(formatRM(1000000)).toBe("RM 1,000,000.00");
    expect(formatRM(12)).toBe("RM 12.00");
    expect(formatRM(0.1)).toBe("RM 0.10");
  });

  it("formats numeric strings", () => {
    expect(formatRM("12.3")).toBe("RM 12.30");
    expect(formatRM("1234.5")).toBe("RM 1,234.50");
  });

  it("formats negatives with leading minus inside symbol", () => {
    expect(formatRM(-9.9)).toBe("-RM 9.90");
    expect(formatRM(-1234.5)).toBe("-RM 1,234.50");
  });

  it("rounds to exactly 2 decimal places", () => {
    expect(formatRM(1.005)).toMatch(/^RM \d+\.\d{2}$/);
    expect(formatRM(1.999)).toBe("RM 2.00");
    expect(formatRM(0.001)).toBe("RM 0.00");
  });

  it("respects withSymbol option", () => {
    expect(formatRM(1234.5, { withSymbol: false })).toBe("1,234.50");
    expect(formatRM(null, { withSymbol: false })).toBe("0.00");
  });

  it("respects grouping option", () => {
    expect(formatRM(1234.5, { grouping: false })).toBe("RM 1234.50");
  });

  it("respects signed option", () => {
    expect(formatRM(-9.9, { signed: false })).toBe("RM 9.90");
  });
});

describe("formatRMDelta", () => {
  it("returns RM 0.00 for zero / null / NaN", () => {
    expect(formatRMDelta(0)).toBe("RM 0.00");
    expect(formatRMDelta(null)).toBe("RM 0.00");
    expect(formatRMDelta(NaN)).toBe("RM 0.00");
  });

  it("prefixes positive values with +", () => {
    expect(formatRMDelta(12.5)).toBe("+RM 12.50");
    expect(formatRMDelta("100")).toBe("+RM 100.00");
  });

  it("prefixes negative values with -", () => {
    expect(formatRMDelta(-3)).toBe("-RM 3.00");
    expect(formatRMDelta(-1234.5)).toBe("-RM 1,234.50");
  });
});
