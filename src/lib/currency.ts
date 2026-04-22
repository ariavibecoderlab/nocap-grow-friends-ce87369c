/**
 * Shared currency formatting utilities for the NOcap platform.
 *
 * All monetary values in the system are stored and passed as Malaysian
 * Ringgit (MYR) numeric amounts. These helpers ensure a single, consistent
 * presentation of those amounts across every dashboard, receipt, and report.
 */

/** Currency code used throughout the platform. */
export const RM_CURRENCY_CODE = "MYR" as const;

/** Symbol prefix shown to users (e.g. "RM 1,234.56"). */
export const RM_SYMBOL = "RM" as const;

/** Number of fractional digits shown for every RM amount. */
export const RM_DECIMALS = 2 as const;

/**
 * Accepted input types for {@link formatRM}.
 *
 * - `number`     — a plain numeric MYR amount (e.g. `1234.5`).
 * - `string`     — a numeric string that parses cleanly via `Number()`
 *                   (e.g. `"1234.5"`, `"0"`). Whitespace is allowed.
 * - `null`       — treated as `0`.
 * - `undefined`  — treated as `0`.
 *
 * Any value that fails to coerce to a finite number falls back to `0`
 * so the UI never renders `NaN` or `Infinity`.
 */
export type RMAmountInput = number | string | null | undefined;

interface FormatRMOptions {
  /** Include the "RM " symbol prefix. Defaults to `true`. */
  withSymbol?: boolean;
  /** Insert thousands separators (e.g. `1,234.56`). Defaults to `true`. */
  grouping?: boolean;
  /**
   * Render negatives with a leading "-" inside the symbol
   * (e.g. `-RM 12.00`). Defaults to `true`.
   */
  signed?: boolean;
}

const RM_FORMATTER = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: RM_DECIMALS,
  maximumFractionDigits: RM_DECIMALS,
  useGrouping: true,
});

const RM_FORMATTER_NO_GROUP = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: RM_DECIMALS,
  maximumFractionDigits: RM_DECIMALS,
  useGrouping: false,
});

/**
 * Coerce any {@link RMAmountInput} into a finite number. Falls back to `0`
 * when the value is null, undefined, NaN, or otherwise non-finite.
 */
export function toRMNumber(value: RMAmountInput): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format an MYR amount for display.
 *
 * Output format: `"RM 1,234.56"` (symbol + space + grouped, 2-decimal value).
 *
 * @example
 * formatRM(1234.5)        // "RM 1,234.50"
 * formatRM("12")          // "RM 12.00"
 * formatRM(null)          // "RM 0.00"
 * formatRM(-9.9)          // "-RM 9.90"
 * formatRM(1234.5, { withSymbol: false })  // "1,234.50"
 * formatRM(1234.5, { grouping: false })    // "RM 1234.50"
 */
export function formatRM(value: RMAmountInput, options: FormatRMOptions = {}): string {
  const { withSymbol = true, grouping = true, signed = true } = options;
  const n = toRMNumber(value);
  const isNegative = signed && n < 0;
  const abs = Math.abs(n);
  const formatter = grouping ? RM_FORMATTER : RM_FORMATTER_NO_GROUP;
  const body = formatter.format(abs);
  const sign = isNegative ? "-" : "";
  return withSymbol ? `${sign}${RM_SYMBOL} ${body}` : `${sign}${body}`;
}

/**
 * Format an amount as a signed delta (e.g. credits/debits in transaction
 * lists). Positive values are prefixed with `+`, negatives with `-`.
 *
 * @example
 * formatRMDelta(12.5)   // "+RM 12.50"
 * formatRMDelta(-3)     // "-RM 3.00"
 * formatRMDelta(0)      // "RM 0.00"
 */
export function formatRMDelta(value: RMAmountInput): string {
  const n = toRMNumber(value);
  if (n === 0) return formatRM(0);
  const prefix = n > 0 ? "+" : "-";
  return `${prefix}${formatRM(Math.abs(n))}`;
}
