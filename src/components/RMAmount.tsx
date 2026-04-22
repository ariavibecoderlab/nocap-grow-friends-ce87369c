import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatRM, formatRMDelta, type RMAmountInput } from "@/lib/currency";

/**
 * Single source of truth for rendering an RM monetary value in the UI.
 *
 * Every wallet, balance, total, fee, and amount across member, merchant,
 * branch, admin, and marketplace dashboards MUST render through this
 * component. It is a thin wrapper around `formatRM` that:
 *
 * - Coerces `null`, `undefined`, `NaN`, and `Infinity` to `RM 0.00`.
 * - Always shows exactly 2 decimal places with thousands grouping.
 * - Carries an optional sign mode (`"none" | "delta" | "negative"`).
 * - Renders semantic markup (`<data value="…">`) so DOM tests + screen
 *   readers see both the numeric value and the formatted string.
 *
 * NEVER hand-roll `RM ${x.toFixed(2)}` in a component again — use this.
 */
export interface RMAmountProps {
  /** The numeric amount (MYR). Accepts number, string, null, undefined. */
  value: RMAmountInput;
  /**
   * Sign rendering mode:
   * - `"none"`     (default) — `formatRM` behaviour: `RM 1.00` / `-RM 1.00`.
   * - `"delta"`    — credit/debit: `+RM 1.00` / `-RM 1.00` / `RM 0.00`.
   * - `"negative"` — force a leading `-` for outflows even on positives
   *                   (e.g., a fee row where the raw value is positive).
   */
  sign?: "none" | "delta" | "negative";
  /** Hide the `RM ` symbol prefix (e.g., for compact tables). */
  hideSymbol?: boolean;
  /** Disable thousands grouping. */
  noGrouping?: boolean;
  /** Extra class names. */
  className?: string;
  /** Render as a `<span>` instead of `<data>` (rare; use only for legacy). */
  as?: "data" | "span";
}

function RMAmountInner({
  value,
  sign = "none",
  hideSymbol = false,
  noGrouping = false,
  className,
  as = "data",
}: RMAmountProps) {
  let text: string;
  let numericForAttr: string;

  if (sign === "delta") {
    text = formatRMDelta(value);
    numericForAttr = formatRM(value, { withSymbol: false, signed: true });
  } else if (sign === "negative") {
    // Force a leading minus regardless of input sign (idempotent on negatives).
    const body = formatRM(value, { withSymbol: !hideSymbol, grouping: !noGrouping, signed: false });
    text = body === "RM 0.00" || body === "0.00" ? body : `-${body}`;
    numericForAttr = formatRM(value, { withSymbol: false, signed: false });
  } else {
    text = formatRM(value, { withSymbol: !hideSymbol, grouping: !noGrouping, signed: true });
    numericForAttr = formatRM(value, { withSymbol: false, signed: true });
  }

  if (as === "span") {
    return <span className={cn("tabular-nums", className)}>{text}</span>;
  }
  return (
    <data value={numericForAttr} className={cn("tabular-nums", className)}>
      {text}
    </data>
  );
}

/**
 * Memoised so list rows / dashboards re-using the same value don't re-render.
 */
export const RMAmount = memo(RMAmountInner);

export default RMAmount;
