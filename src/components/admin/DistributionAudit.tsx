import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, RefreshCw } from "lucide-react";
import DistributionTraceView from "./DistributionTraceView";

type Row = {
  id: string;
  created_at: string;
  amount: number;
  sale_amount: number;
  branch_name: string | null;
  member_name: string | null;
  member_referral_code: string | null;
  source: string;
  status: string;
  child_count: number;
  child_total: number;
  reconciled: boolean;
};

const fmt = (n: number) => `RM ${Number(n || 0).toFixed(2)}`;

const DistributionAudit = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_distribution_audit", {
      p_limit: 100,
      p_search: search || null,
      p_from: from ? new Date(from).toISOString() : null,
      p_to: to ? new Date(to + "T23:59:59").toISOString() : null,
    });
    if (!error && data) setRows(data as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = {
    total: rows.length,
    mismatched: rows.filter(r => !r.reconciled).length,
    totalDistributed: rows.reduce((s, r) => s + Number(r.amount), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribution Audit</h1>
        <p className="text-sm text-muted-foreground">Trace every cashback + 6-tier commission split end to end.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Distributions shown</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mismatched</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${stats.mismatched ? "text-destructive" : "text-secondary"}`}>{stats.mismatched}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total distributed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold font-mono">{fmt(stats.totalDistributed)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Search (branch, member, code, ID)</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. ABC123 or branch name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No distributions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Sale</TableHead>
                  <TableHead className="text-right">Distributed</TableHead>
                  <TableHead className="text-center">Splits</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer">
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.branch_name ?? <span className="text-muted-foreground italic">unknown</span>}</TableCell>
                    <TableCell className="text-sm">{r.member_name ?? "—"} <span className="text-xs text-muted-foreground">({r.member_referral_code ?? "—"})</span></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.sale_amount)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.amount)}</TableCell>
                    <TableCell className="text-center text-xs">{r.child_count}</TableCell>
                    <TableCell className="text-center">
                      {r.reconciled
                        ? <Badge className="bg-secondary text-secondary-foreground">✓</Badge>
                        : <Badge variant="destructive">⚠</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DistributionTraceView distributionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default DistributionAudit;
