import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sanitizeNumericFields,
  sanitizeNumericObject,
  getSanitizerLog,
  clearSanitizerLog,
} from "@/lib/sanitizeApiResponse";

beforeEach(() => {
  clearSanitizerLog();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("sanitizeNumericObject", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizeNumericObject(null, ["balance"])).toBeNull();
    expect(sanitizeNumericObject(undefined, ["balance"])).toBeNull();
  });

  it("coerces null/undefined fields to 0 silently", () => {
    const out = sanitizeNumericObject({ balance: null, fee: undefined }, ["balance", "fee"], {
      context: "wallets",
    });
    expect(out).toEqual({ balance: 0, fee: 0 });
    expect(getSanitizerLog()).toHaveLength(0);
  });

  it("coerces NaN/Infinity/strings to 0 and logs", () => {
    const out = sanitizeNumericObject(
      { balance: NaN, fee: Infinity, total: "abc" as unknown as number },
      ["balance", "fee", "total"],
      { context: "orders" },
    );
    expect(out).toEqual({ balance: 0, fee: 0, total: 0 });
    expect(getSanitizerLog()).toHaveLength(3);
    expect(getSanitizerLog()[0].context).toBe("orders");
  });

  it("preserves valid numbers and numeric strings", () => {
    const out = sanitizeNumericObject(
      { balance: 1234.5, fee: "12.30" as unknown as number },
      ["balance", "fee"],
    );
    expect(out).toEqual({ balance: 1234.5, fee: 12.3 });
  });

  it("does not mutate the original object", () => {
    const orig = { balance: NaN };
    sanitizeNumericObject(orig, ["balance"]);
    expect(Number.isNaN(orig.balance)).toBe(true);
  });
});

describe("sanitizeNumericFields (array)", () => {
  it("returns [] for null/undefined", () => {
    expect(sanitizeNumericFields(null, ["a"])).toEqual([]);
    expect(sanitizeNumericFields(undefined, ["a"])).toEqual([]);
  });

  it("sanitizes every row and tags log entries with row index", () => {
    const rows = [
      { amount: 10 },
      { amount: NaN },
      { amount: "bad" as unknown as number },
    ];
    const out = sanitizeNumericFields(rows, ["amount"], { context: "transactions" });
    expect(out).toEqual([{ amount: 10 }, { amount: 0 }, { amount: 0 }]);
    const log = getSanitizerLog();
    expect(log).toHaveLength(2);
    expect(log[0].rowIndex).toBe(1);
    expect(log[1].rowIndex).toBe(2);
  });

  it("respects custom fallback value", () => {
    const out = sanitizeNumericFields([{ x: NaN }], ["x"], { fallback: -1 });
    expect(out[0].x).toBe(-1);
  });
});

describe("sanitizer log buffer", () => {
  it("caps at 200 entries", () => {
    const rows = Array.from({ length: 250 }, () => ({ x: NaN }));
    sanitizeNumericFields(rows, ["x"], { context: "stress" });
    expect(getSanitizerLog().length).toBe(200);
  });

  it("clearSanitizerLog empties the buffer", () => {
    sanitizeNumericFields([{ x: NaN }], ["x"]);
    expect(getSanitizerLog().length).toBe(1);
    clearSanitizerLog();
    expect(getSanitizerLog().length).toBe(0);
  });
});
