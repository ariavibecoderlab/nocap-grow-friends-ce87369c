import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, RefreshCw } from "lucide-react";
import DistributionTraceView from "./DistributionTraceView";

type DistributionTx = {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  metadata: {
    branch_id?: string;
    branch_name?: string;
    member_id?: string;
    sale_amount?: number;
    source?: string;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  referral_code: string | null;
};

type BranchRow = {
  id: string;
  branch_name: string | null;
};

type ChildTx = {
  reference_id: string | null;
  amount: number;
};

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);

    let query = supabase
      .from("transactions")
      .select("id, created_at, amount, status, metadata, type")
      .in("type", ["commission", "cashback"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (from) {
      query = query.gte("created_at", new Date(from).toISOString());
    }

    if (to) {
      query = query.lte("created_at", new Date(`${to}T23:59:59`).toISOString());
    }

    const { data: distributions, error: distributionsError } = await query;

    if (distributionsError) {
      setErrorMsg(distributionsError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const distRows = (distributions ?? []) as DistributionTx[];

    if (distRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const distributionIds = distRows.map((row) => row.id);
    const memberIds = Array.from(
      new Set(
        distRows
          .map((row) => row.metadata?.member_id)
          .filter((id): id is string => Boolean(id))
      )
    );
    const branchIds = Array.from(
      new Set(
        distRows
          .map((row) => row.metadata?.branch_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const [profilesRes, branchesRes, childrenRes] = await Promise.all([
      memberIds.length
        ? supabase
            .from("profiles")
            .select("user_id, full_name, referral_code")
            .in("user_id", memberIds)
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      branchIds.length
        ? supabase
            .from("merchant_branches")
            .select("id, branch_name")
            .in("id", branchIds)
        : Promise.resolve({ data: [] as BranchRow[], error: null }),
      distributionIds.length
        ? supabase
            .from("transactions")
            .select("reference_id, amount")
            .in("reference_id", distributionIds)
        : Promise.resolve({ data: [] as ChildTx[], error: null }),
    ]);

    if (profilesRes.error || branchesRes.error || childrenRes.error) {
      setErrorMsg(
        profilesRes.error?.message ||
          branchesRes.error?.message ||
          childrenRes.error?.message ||
          "Failed to load distribution audit data"
      );
      setRows([]);
      setLoading(false);
      return;
    }

    const profilesMap = new Map(
      (profilesRes.data ?? []).map((profile) => [profile.user_id, profile])
    );
    const branchesMap = new Map(
      (branchesRes.data ?? []).map((branch) => [branch.id, branch.branch_name])
    );
    const childSummaryMap = new Map<
      string,
      { child_count: number; child_total: number }
    >();

    for (const child of (childrenRes.data ?? []) as ChildTx[]) {
      if (!child.reference_id) continue;
      const current = childSummaryMap.get(child.reference_id) ?? {
        child_count: 0,
        child_total: 0,
      };
      current.child_count += 1;
      current.child_total += Number(child.amount || 0);
      childSummaryMap.set(child.reference_id, current);
    }

    const nextRows: Row[] = distRows.map((row) => {
      const memberId = row.metadata?.member_id ?? null;
      const branchId = row.metadata?.branch_id ?? null;
      const member = memberId ? profilesMap.get(memberId) : null;
      const childSummary = childSummaryMap.get(row.id) ?? {
        child_count: 0,
        child_total: 0,
      };

      return {
        id: row.id,
        created_at: row.created_at,
        amount: Number(row.amount || 0),
        sale_amount: Number(row.metadata?.sale_amount || 0),
        branch_name:
          row.metadata?.branch_name ??
          (branchId ? branchesMap.get(branchId) ?? null : null),
        member_name: member?.full_name ?? null,
        member_referral_code: member?.referral_code ?? null,
        source: row.metadata?.source ?? "unknown",
        status: row.status,
        child_count: childSummary.child_count,
        child_total: childSummary.child_total,
        reconciled:
          Math.abs(Number(row.amount || 0) - childSummary.child_total) < 0.001,
      };
    });

    setRows(nextRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [
        row.id,
        row.branch_name,
        row.member_name,
        row.member_referral_code,
        row.source,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const stats = {
    total: filteredRows.length,
    mismatched: filteredRows.filter((r) => !r.reconciled).length,
    totalDistributed: filteredRows.reduce((s, r) => s + Number(r.amount), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribution Audit</h1>
        <p className="text-sm text-muted-foreground">
          Trace every cashback + 6-tier commission split end to end.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Distributions shown
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {stats.total}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Mismatched
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${
              stats.mismatched ? "text-destructive" : "text-secondary"
            }`}
          >
            {stats.mismatched}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total distributed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold font-mono">
            {fmt(stats.totalDistributed)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">
                Search (branch, member, code, ID)
              </label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. ABC123 or branch name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {errorMsg ? (
            <div className="text-center py-12 text-destructive text-sm">
              Error: {errorMsg}
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No distributions found.
            </div>
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
                {filteredRows.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.branch_name ?? (
                        <span className="text-muted-foreground italic">
                          unknown
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.member_name ?? "—"}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({r.member_referral_code ?? "—"})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(r.sale_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(r.amount)}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.child_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.reconciled ? (
                        <Badge className="bg-secondary text-secondary-foreground">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="destructive">⚠</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DistributionTraceView
        distributionId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default DistributionAudit;
