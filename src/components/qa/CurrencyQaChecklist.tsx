import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ExternalLink, Play, Trash2 } from "lucide-react";
import { formatRM, toRMNumber } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { getSanitizerLog, clearSanitizerLog, type SanitizerLogEntry } from "@/lib/sanitizeApiResponse";

/* -------------------------------------------------------------- */
/* Unit cases — every input below MUST render exactly "RM 0.00".  */
/* -------------------------------------------------------------- */
const UNIT_CASES: Array<{ label: string; input: any; expected: string }> = [
  { label: "null",          input: null,        expected: "RM 0.00" },
  { label: "undefined",     input: undefined,   expected: "RM 0.00" },
  { label: "NaN",           input: NaN,         expected: "RM 0.00" },
  { label: "Infinity",      input: Infinity,    expected: "RM 0.00" },
  { label: "-Infinity",     input: -Infinity,   expected: "RM 0.00" },
  { label: "empty string",  input: "",          expected: "RM 0.00" },
  { label: "'abc'",         input: "abc",       expected: "RM 0.00" },
  { label: "0",             input: 0,           expected: "RM 0.00" },
  { label: "1234.5",        input: 1234.5,      expected: "RM 1,234.50" },
  { label: "'12.3'",        input: "12.3",      expected: "RM 12.30" },
  { label: "-9.9",          input: -9.9,        expected: "-RM 9.90" },
];

/* -------------------------------------------------------------- */
/* Live-scan targets — tables + numeric columns that surface as   */
/* wallet / total / balance amounts in the UI.                    */
/* -------------------------------------------------------------- */
const LIVE_TARGETS: Array<{ table: string; columns: string[] }> = [
  { table: "wallets",            columns: ["balance"] },
  { table: "marketplace_orders", columns: ["subtotal", "shipping_fee", "platform_fee", "total_amount"] },
  { table: "transactions",       columns: ["amount"] },
  { table: "withdrawal_requests",columns: ["amount", "fee", "net_amount"] },
];

/* -------------------------------------------------------------- */
/* Deep-link targets for manual visual verification / screenshots.*/
/* -------------------------------------------------------------- */
const SCREEN_LINKS: Array<{ label: string; path: string }> = [
  { label: "Member Dashboard",      path: "/dashboard" },
  { label: "Merchant Dashboard",    path: "/merchant" },
  { label: "Branch Dashboard",      path: "/branch" },
  { label: "Member Withdraw",       path: "/withdraw" },
  { label: "Transactions",          path: "/transactions" },
  { label: "Top Up",                path: "/top-up" },
  { label: "Transfer",              path: "/transfer" },
  { label: "Admin Portal",          path: "/admin-portal" },
];

interface UnitResult { pass: boolean; actual: string }
interface LiveResult { table: string; column: string; total: number; offending: number; sample: any[] }

export default function CurrencyQaChecklist() {
  const [unitResults, setUnitResults] = useState<Record<number, UnitResult>>({});
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [sanitizerEntries, setSanitizerEntries] = useState<readonly SanitizerLogEntry[]>([]);

  const refreshSanitizerLog = () => setSanitizerEntries(getSanitizerLog());

  const runUnit = () => {
    const out: Record<number, UnitResult> = {};
    UNIT_CASES.forEach((tc, i) => {
      const actual = formatRM(tc.input);
      out[i] = { pass: actual === tc.expected, actual };
    });
    setUnitResults(out);
  };

  const runLive = async () => {
    setLiveLoading(true);
    const out: LiveResult[] = [];
    for (const target of LIVE_TARGETS) {
      const { data, error } = await supabase
        .from(target.table as any)
        .select(target.columns.join(","))
        .limit(500);
      if (error) {
        target.columns.forEach((col) =>
          out.push({ table: target.table, column: col, total: 0, offending: -1, sample: [] }),
        );
        continue;
      }
      const rows = (data || []) as unknown as Array<Record<string, unknown>>;
      target.columns.forEach((col) => {
        const offending = rows.filter((r) => {
          const raw = r[col];
          if (raw === null || raw === undefined) return false; // null is OK — formatter coerces
          const n = Number(raw);
          return !Number.isFinite(n);
        });
        out.push({
          table: target.table,
          column: col,
          total: rows.length,
          offending: offending.length,
          sample: offending.slice(0, 3),
        });
      });
    }
    setLiveResults(out);
    setLiveLoading(false);
  };

  const unitPassCount = Object.values(unitResults).filter((r) => r.pass).length;
  const unitTotal = UNIT_CASES.length;

  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-white">RM Currency QA Checklist</h3>
          <p className="text-xs text-white/50 mt-1">
            Verifies every wallet, total, balance, and withdrawal amount renders <code className="text-secondary">RM&nbsp;0.00</code> for null/non-finite
            values and the canonical <code className="text-secondary">RM&nbsp;1,234.50</code> format otherwise.
          </p>
        </CardContent>
      </Card>

      {/* Unit tests */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div>
            <CardTitle className="text-sm font-semibold text-white">1. Automated formatter test</CardTitle>
            <p className="text-xs text-white/40 mt-0.5">
              Runs <code>formatRM()</code> against null, undefined, NaN, Infinity, and string inputs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unitTotal > 0 && Object.keys(unitResults).length > 0 && (
              <Badge variant="outline" className={unitPassCount === unitTotal ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}>
                {unitPassCount}/{unitTotal} pass
              </Badge>
            )}
            <Button size="sm" onClick={runUnit} className="bg-secondary text-primary hover:bg-secondary/90 text-xs h-8">
              <Play className="mr-1 h-3 w-3" /> Run tests
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="text-left py-1.5 px-2 font-medium">Input</th>
                  <th className="text-left py-1.5 px-2 font-medium">Expected</th>
                  <th className="text-left py-1.5 px-2 font-medium">Actual</th>
                  <th className="text-left py-1.5 px-2 font-medium">toRMNumber</th>
                  <th className="text-right py-1.5 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_CASES.map((tc, i) => {
                  const r = unitResults[i];
                  return (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1.5 px-2 font-mono text-white/70">{tc.label}</td>
                      <td className="py-1.5 px-2 font-mono text-white/50">{tc.expected}</td>
                      <td className="py-1.5 px-2 font-mono text-white/70">{r ? r.actual : "—"}</td>
                      <td className="py-1.5 px-2 font-mono text-white/40">{String(toRMNumber(tc.input))}</td>
                      <td className="py-1.5 px-2 text-right">
                        {!r ? <span className="text-white/20">—</span> : r.pass ? <CheckCircle className="inline h-3.5 w-3.5 text-green-400" /> : <XCircle className="inline h-3.5 w-3.5 text-red-400" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Live scan */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div>
            <CardTitle className="text-sm font-semibold text-white">2. Live data scan</CardTitle>
            <p className="text-xs text-white/40 mt-0.5">
              Reads up to 500 rows from wallet / order / transaction / withdrawal tables and flags any numeric value that is non-finite (NaN, ±Infinity).
              Nulls are considered safe — the formatter coerces them to <code>RM&nbsp;0.00</code>.
            </p>
          </div>
          <Button size="sm" onClick={runLive} disabled={liveLoading} className="bg-secondary text-primary hover:bg-secondary/90 text-xs h-8">
            {liveLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
            {liveLoading ? "Scanning…" : "Scan now"}
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {liveResults.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No scan run yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="text-left py-1.5 px-2 font-medium">Table</th>
                    <th className="text-left py-1.5 px-2 font-medium">Column</th>
                    <th className="text-right py-1.5 px-2 font-medium">Rows scanned</th>
                    <th className="text-right py-1.5 px-2 font-medium">Non-finite</th>
                    <th className="text-right py-1.5 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveResults.map((r, i) => {
                    const errored = r.offending < 0;
                    const ok = !errored && r.offending === 0;
                    return (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-1.5 px-2 font-mono text-white/70">{r.table}</td>
                        <td className="py-1.5 px-2 font-mono text-white/70">{r.column}</td>
                        <td className="py-1.5 px-2 text-right text-white/50">{r.total}</td>
                        <td className="py-1.5 px-2 text-right text-white/70">{errored ? "—" : r.offending}</td>
                        <td className="py-1.5 px-2 text-right">
                          {errored ? (
                            <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-[10px]">no access</Badge>
                          ) : ok ? (
                            <CheckCircle className="inline h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <XCircle className="inline h-3.5 w-3.5 text-red-400" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual verification deep links */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-semibold text-white">3. Visual verification (screenshot links)</CardTitle>
          <p className="text-xs text-white/40 mt-0.5">
            Open each screen in a new tab and capture a screenshot. Confirm every visible RM amount uses 2 decimal places and the <code>RM&nbsp;</code> prefix.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {SCREEN_LINKS.map((s) => (
              <Button
                key={s.path}
                asChild
                variant="outline"
                size="sm"
                className="justify-between border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-xs h-9"
              >
                <a href={s.path} target="_blank" rel="noreferrer">
                  <span className="truncate">{s.label}</span>
                  <ExternalLink className="h-3 w-3 ml-2 shrink-0 opacity-60" />
                </a>
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-3">
            Tip: After capturing, attach the PNGs to the QA ticket. Look for any value missing the <code>RM</code> prefix, showing fewer than 2 decimals, or rendering <code>NaN</code>.
          </p>
        </CardContent>
      </Card>
      {/* Sanitizer log */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div>
            <CardTitle className="text-sm font-semibold text-white">4. API sanitizer log</CardTitle>
            <p className="text-xs text-white/40 mt-0.5">
              Live anomalies caught by the API response sanitizer (NaN/Infinity/non-numeric values coerced to <code>0</code> before they reached the UI). Buffer holds the last 200 entries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { clearSanitizerLog(); refreshSanitizerLog(); }} className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 text-xs h-8">
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
            <Button size="sm" onClick={refreshSanitizerLog} className="bg-secondary text-primary hover:bg-secondary/90 text-xs h-8">
              <Play className="mr-1 h-3 w-3" /> Refresh ({sanitizerEntries.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {sanitizerEntries.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-4">No anomalies recorded. Browse the app, then click Refresh.</p>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-primary">
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="text-left py-1.5 px-2 font-medium">Time</th>
                    <th className="text-left py-1.5 px-2 font-medium">Context</th>
                    <th className="text-left py-1.5 px-2 font-medium">Field</th>
                    <th className="text-left py-1.5 px-2 font-medium">Row</th>
                    <th className="text-left py-1.5 px-2 font-medium">Raw value</th>
                  </tr>
                </thead>
                <tbody>
                  {sanitizerEntries.slice().reverse().map((e, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-1.5 px-2 font-mono text-white/50">{new Date(e.timestamp).toLocaleTimeString()}</td>
                      <td className="py-1.5 px-2 font-mono text-white/70">{e.context}</td>
                      <td className="py-1.5 px-2 font-mono text-white/70">{e.field}</td>
                      <td className="py-1.5 px-2 font-mono text-white/50">{e.rowIndex ?? "—"}</td>
                      <td className="py-1.5 px-2 font-mono text-red-400">{String(e.rawValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
