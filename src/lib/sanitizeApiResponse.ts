/**
 * API response sanitizer for monetary / numeric fields.
 *
 * Why: every wallet, total, balance, fee, and amount in the UI must render
 * as `RM 0.00` (never `NaN`, `Infinity`, `null`, or `undefined`). The
 * `formatRM` helper already coerces bad inputs at render time, but coercing
 * at the API boundary catches issues earlier (e.g., before arithmetic) and
 * gives us a single place to log anomalies for debugging.
 *
 * Usage:
 * ```ts
 * import { sanitizeNumericFields } from "@/lib/sanitizeApiResponse";
 *
 * const { data } = await supabase.from("wallets").select("*");
 * const safe = sanitizeNumericFields(data, ["balance"], { context: "wallets" });
 * ```
 *
 * Anomalies are reported via `console.warn` (group label `[api-sanitizer]`)
 * and pushed to an in-memory ring buffer accessible via `getSanitizerLog()`
 * for the QA dashboard.
 */
export interface SanitizerLogEntry {
  context: string;
  field: string;
  rawValue: unknown;
  rowIndex: number | null;
  timestamp: number;
}

const MAX_LOG_ENTRIES = 200;
const sanitizerLog: SanitizerLogEntry[] = [];

/** Push an anomaly to the ring buffer + console. */
function recordAnomaly(entry: SanitizerLogEntry): void {
  sanitizerLog.push(entry);
  if (sanitizerLog.length > MAX_LOG_ENTRIES) sanitizerLog.shift();
  // eslint-disable-next-line no-console
  console.warn(
    `[api-sanitizer] non-finite numeric in ${entry.context}.${entry.field}`,
    { rawValue: entry.rawValue, rowIndex: entry.rowIndex },
  );
}

/** Read (and optionally clear) the in-memory anomaly log. */
export function getSanitizerLog(): readonly SanitizerLogEntry[] {
  return sanitizerLog.slice();
}
export function clearSanitizerLog(): void {
  sanitizerLog.length = 0;
}

interface SanitizeOptions {
  /** Identifier for logs (e.g. `"wallets"`, `"marketplace_orders"`). */
  context?: string;
  /** Fallback value for invalid numerics. Defaults to `0`. */
  fallback?: number;
}

/**
 * Coerce a single value to a finite number, recording anomalies.
 * `null` / `undefined` are NOT logged — they're a normal "no data" signal.
 */
function coerceNumber(
  raw: unknown,
  field: string,
  context: string,
  rowIndex: number | null,
  fallback: number,
): number {
  if (raw === null || raw === undefined) return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) return n;
  recordAnomaly({ context, field, rawValue: raw, rowIndex, timestamp: Date.now() });
  return fallback;
}

/**
 * Sanitize a single object: replace listed numeric fields with finite numbers.
 * Returns a shallow copy; the original object is not mutated.
 */
export function sanitizeNumericObject<T extends object>(
  obj: T | null | undefined,
  fields: ReadonlyArray<keyof T & string>,
  options: SanitizeOptions = {},
): T | null {
  if (!obj) return null;
  const { context = "unknown", fallback = 0 } = options;
  const out: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const field of fields) {
    out[field] = coerceNumber((obj as Record<string, unknown>)[field], field, context, null, fallback);
  }
  return out as T;
}

/**
 * Sanitize an array of rows. Each row gets the listed numeric fields coerced.
 * Returns a new array; the input is not mutated.
 */
export function sanitizeNumericFields<T extends object>(
  rows: T[] | null | undefined,
  fields: ReadonlyArray<keyof T & string>,
  options: SanitizeOptions = {},
): T[] {
  if (!rows || !Array.isArray(rows)) return [];
  const { context = "unknown", fallback = 0 } = options;
  return rows.map((row, idx) => {
    const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const field of fields) {
      out[field] = coerceNumber((row as Record<string, unknown>)[field], field, context, idx, fallback);
    }
    return out as T;
  });
}
