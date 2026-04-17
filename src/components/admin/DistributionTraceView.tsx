import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowDown, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Trace = {
  distribution: { id: string; amount: number; status: string; created_at: string; description: string; idempotency_key: string; recipient_user_id: string; metadata: any };
  sale: { sale_amount: number; commission_percent: number; commission_pool_expected: number; expected_share_per_slot: number };
  branch: { id: string; branch_name: string; commission_percent: number; merchant_user_id: string; owner_user_id: string | null; balance: number } | null;
  member: { user_id: string; full_name: string; referral_code: string; email: string } | null;
  referral_chain: Array<{ tier: number; ancestor_id: string; full_name: string; referral_code: string; email: string }>;
  children: Array<{ id: string; type: string; amount: number; tier: number | null; recipient_user_id: string; recipient_name: string; recipient_email: string; recipient_referral_code: string; description: string; created_at: string; status: string }>;
  totals: { cashback_credited: number; commission_credited: number; total_credited: number; distribution_amount: number; unallocated: number; reconciled: boolean };
};

interface Props {
  distributionId: string | null;
  onClose: () => void;
}

const fmt = (n: number) => `RM ${Number(n || 0).toFixed(2)}`;

const DistributionTraceView = ({ distributionId, onClose }: Props) => {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!distributionId) { setTrace(null); return; }
    const load = async () => {
      setLoading(true); setError(null);
      const { data, error } = await supabase.rpc("get_distribution_trace", { p_distribution_id: distributionId });
      if (error) setError(error.message);
      else setTrace(data as unknown as Trace);
      setLoading(false);
    };
    load();
  }, [distributionId]);

  // Build expected per-tier table
  const expectedRows = trace ? Array.from({ length: 6 }).map((_, i) => {
    const slot = i === 0 ? "Member cashback" : `Tier ${i} commission`;
    const isCashback = i === 0;
    const expected = trace.sale.expected_share_per_slot;
    let actualRow;
    if (isCashback) {
      actualRow = trace.children.find(c => c.type === "cashback");
    } else {
      actualRow = trace.children.find(c => c.type === "commission" && c.tier === i);
    }
    const recipient = isCashback ? trace.member : trace.referral_chain.find(r => r.tier === i);
    return { slot, expected, actual: actualRow?.amount ?? 0, recipient, paid: !!actualRow, tx: actualRow };
  }) : [];

  return (
    <Dialog open={!!distributionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribution Trace</DialogTitle>
          <DialogDescription>Full chain from sale → cashback → 5-tier commissions</DialogDescription>
        </DialogHeader>

        {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {error && <div className="text-destructive text-sm">{error}</div>}

        {trace && !loading && (
          <div className="space-y-4">
            {/* STEP 1: Sale */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">① Sale Payment</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Sale amount:</span> <span className="font-mono font-semibold">{fmt(trace.sale.sale_amount)}</span></div>
                  <div><span className="text-muted-foreground">Commission %:</span> <span className="font-mono">{trace.sale.commission_percent}%</span></div>
                  <div><span className="text-muted-foreground">Branch:</span> {trace.branch?.branch_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Member:</span> {trace.member?.full_name ?? "—"} <Badge variant="outline" className="ml-1 text-xs">{trace.member?.referral_code}</Badge></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Created:</span> {new Date(trace.distribution.created_at).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>

            {/* STEP 2: Commission pool */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">② Commission Pool</CardTitle></CardHeader>
              <CardContent className="text-sm font-mono">
                {fmt(trace.sale.sale_amount)} × {trace.sale.commission_percent}% = <span className="font-bold text-secondary">{fmt(trace.sale.commission_pool_expected)}</span>
                <div className="mt-1 text-xs text-muted-foreground">Per-slot share: {fmt(trace.sale.commission_pool_expected)} ÷ 6 = {fmt(trace.sale.expected_share_per_slot)} (min RM 0.01)</div>
              </CardContent>
            </Card>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>

            {/* STEP 3: 6-way split */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">③ 6-Way Split — Expected vs Actual</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slot</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expectedRows.map((row, idx) => {
                      const drift = Math.abs(row.expected - row.actual);
                      const ok = row.paid && drift < 0.01;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{row.slot}</TableCell>
                          <TableCell className="text-xs">
                            {row.recipient ? (
                              <div>
                                <div>{(row.recipient as any).full_name ?? "—"}</div>
                                <div className="text-muted-foreground">{(row.recipient as any).referral_code ?? (row.recipient as any).email ?? ""}</div>
                              </div>
                            ) : <span className="text-muted-foreground italic">no upline</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(row.expected)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{row.paid ? fmt(row.actual) : <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-center">
                            {ok ? <CheckCircle2 className="h-4 w-4 text-secondary inline" />
                             : !row.recipient ? <Info className="h-4 w-4 text-muted-foreground inline" />
                             : <AlertTriangle className="h-4 w-4 text-destructive inline" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-muted-foreground" /></div>

            {/* STEP 4: Reconciliation */}
            <Card className={trace.totals.reconciled ? "border-secondary" : "border-destructive"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  ④ Reconciliation
                  {trace.totals.reconciled
                    ? <Badge className="bg-secondary text-secondary-foreground">✓ Balanced</Badge>
                    : <Badge variant="destructive">⚠ Mismatch</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-mono space-y-1">
                <div>Branch debited (distribution.amount): <span className="font-bold">{fmt(trace.totals.distribution_amount)}</span></div>
                <div>Cashback credited: {fmt(trace.totals.cashback_credited)}</div>
                <div>Commissions credited: {fmt(trace.totals.commission_credited)}</div>
                <div>Total credited: <span className="font-bold">{fmt(trace.totals.total_credited)}</span></div>
                <div>Unallocated (returned to branch): {fmt(trace.totals.unallocated)}</div>
                <div className="pt-2 border-t border-border mt-2 text-xs text-muted-foreground">
                  Drift: {fmt(Math.abs(trace.totals.distribution_amount - trace.totals.total_credited))}
                </div>
              </CardContent>
            </Card>

            {/* Raw children */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Wallet Movements ({trace.children.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Tier</TableHead>
                      <TableHead className="text-xs">Recipient</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Tx ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trace.children.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs"><Badge variant="outline">{c.type}</Badge></TableCell>
                        <TableCell className="text-xs">{c.tier ?? "—"}</TableCell>
                        <TableCell className="text-xs">{c.recipient_name} <span className="text-muted-foreground">({c.recipient_referral_code})</span></TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(c.amount)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{c.id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DistributionTraceView;
