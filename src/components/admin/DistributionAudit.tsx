import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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
  total_count: number;
};

type DistributionTx = {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  metadata: {
    branch_id?: string;
    member_id?: string;
    sale_amount?: number | string;
    source?: string;
  } | null;
};

const PAGE_SIZE = 25;
const fmt = (n: number) => `RM ${Number(n || 0).toFixed(2)}`;

const DistributionAudit = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadViaFallback = async (pageIndex: number) => {
    let countQuery = supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "distribution");

    let dataQuery = supabase
      .from("transactions")
      .select("id, created_at, amount, status, metadata")
      .eq("type", "distribution")
      .order("created_at", { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

    if (from) {
      const fromIso = new Date(from).toISOString();
      countQuery = countQuery.gte("created_at", fromIso);
      dataQuery = dataQuery.gte("created_at", fromIso);
    }

    if (to) {
      const toIso = new Date(`${to}T23:59:59`).toISOString();
      countQuery = countQuery.lte("created_at", toIso);
      dataQuery = dataQuery.lte("created_at", toIso);
    }

    if (search.trim()) {
      dataQuery = dataQuery.ilike("id", `%${search.trim()}%`);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError) throw countError;
    if (dataError) throw dataError;

    const txs = ((data ?? []) as DistributionTx[]).map((tx) => ({
      ...tx,
      metadata: (tx.metadata ?? {}) as DistributionTx["metadata"],
    }));

    const branchIds = Array.from(new Set(txs.map((tx) => tx.metadata?.branch_id).filter(Boolean))) as string[];
    const memberIds = Array.from(new Set(txs.map((tx) => tx.metadata?.member_id).filter(Boolean))) as string[];
    const distIds = txs.map((tx) => tx.id);

    const [branchesRes, profilesRes, childrenRes] = await Promise.all([
      branchIds.length
        ? supabase.from("merchant_branches").select("id, branch_name").in("id", branchIds)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase.from("profiles").select("user_id, full_name, referral_code").in("user_id", memberIds)
        : Promise.resolve({ data: [], error: null }),
      distIds.length
        ? supabase.from("transactions").select("reference_id, amount").in("reference_id", distIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (branchesRes.error) throw branchesRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (childrenRes.error) throw childrenRes.error;

    const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b.branch_name]));
    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
    const childTotals = new Map<string, { count: number; total: number }>();

    for (const child of childrenRes.data ?? []) {
      const refId = child.reference_id as string | null;
      if (!refId) continue;
      const current = childTotals.get(refId) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(child.amount ?? 0);
      childTotals.set(refId, current);
    }

    const list: Row[] = txs.map((tx) => {
      const member = tx.metadata?.member_id ? profileMap.get(tx.metadata.member_id) : null;
      const child = childTotals.get(tx.id) ?? { count: 0, total: 0 };
      return {
        id: tx.id,
        created_at: tx.created_at,
        amount: Number(tx.amount ?? 0),
        sale_amount: Number(tx.metadata?.sale_amount ?? 0),
        branch_name: tx.metadata?.branch_id ? branchMap.get(tx.metadata.branch_id) ?? null : null,
        member_name: member?.full_name ?? null,
        member_referral_code: member?.referral_code ?? null,
        source: tx.metadata?.source ?? "unknown",
        status: tx.status,
        child_count: child.count,
        child_total: child.total,
        reconciled: Math.abs(Number(tx.amount ?? 0) - child.total) < 0.001,
        total_count: Number(count ?? 0),
      };
    });

    setRows(list);
    setTotalCount(Number(count ?? 0));
  };

  const load = async (pageOverride?: number) => {
    setLoading(true);
    setLoadError(null);
    const p = pageOverride ?? page;

    try {
      const { data, error } = await supabase.rpc("list_distribution_audit", {
        p_limit: PAGE_SIZE,
        p_offset: p * PAGE_SIZE,
        p_search: search || null,
        p_from: from ? new Date(from).toISOString() : null,
        p_to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      } as never);

      if (error) throw error;

      const list = (data ?? []) as unknown as Row[];
      if (list.length > 0 || (!search.trim() && !from && !to && p === 0)) {
        setRows(list);
        setTotalCount(list[0]?.total_count ? Number(list[0].total_count) : 0);
        setLoading(false);
        return;
      }

      await loadViaFallback(p);
    } catch (error) {
      try {
        await loadViaFallback(p);
      } catch (fallbackError) {
        console.error("Failed to load distribution audit", error, fallbackError);
        setRows([]);
        setTotalCount(0);
        setLoadError("Unable to load distributions right now.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
  }, []);

  const handleSearch = () => {
    setPage(0);
    load(0);
  };

  const goPage = (next: number) => {
    setPage(next);
    load(next);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageDistributed = rows.reduce((s, r) => s + Number(r.amount), 0);
  const pageMismatched = rows.filter((r) => !r.reconciled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribution Audit</h1>
        <p className="text-sm text-muted-foreground">Trace every cashback + 6-tier commission split end to end.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total distributions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Mismatched (this page)</CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-bold ${pageMismatched ? "text-destructive" : "text-secondary"}`}>
            {pageMismatched}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Distributed (this page)</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-2xl font-bold">{fmt(pageDistributed)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label className="text-xs text-muted-foreground">Search (branch, member, code, ID)</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. ABC123 or branch name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {loadError ?? "No distributions found."}
            </div>
          ) : (
            <>
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
                  {rows.map((r) => (
                    <TableRow key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer">
                      <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{r.branch_name ?? <span className="italic text-muted-foreground">unknown</span>}</TableCell>
                      <TableCell className="text-sm">
                        {r.member_name ?? "—"} <span className="text-xs text-muted-foreground">({r.member_referral_code ?? "—"})</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(r.sale_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-center text-xs">{r.child_count}</TableCell>
                      <TableCell className="text-center">
                        {r.reconciled ? (
                          <Badge className="bg-secondary text-secondary-foreground">✓</Badge>
                        ) : (
                          <Badge variant="destructive">⚠</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-2 flex items-center justify-between border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages} · Showing {rows.length} of {totalCount}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => goPage(page - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => goPage(page + 1)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DistributionTraceView distributionId={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default DistributionAudit;
