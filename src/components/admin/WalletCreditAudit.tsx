import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Search, WalletCards, X } from "lucide-react";
import { formatRM } from "@/lib/currency";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type WalletAudit = Database["public"]["Tables"]["wallet_balance_audit"]["Row"];

type CreditAuditRow = {
  transaction: Transaction;
  audit: WalletAudit | null;
  isAdminCredit: boolean;
};

const toObject = (value: Json | null): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const isSameAmount = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.005;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-MY", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

const formatVaText = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/Wallet Balance/g, "VA Balance")
    .replace(/Wallet balance/g, "VA balance")
    .replace(/wallet balance/g, "VA balance")
    .replace(/Wallet Credit/g, "VA Credit")
    .replace(/Wallet credit/g, "VA credit")
    .replace(/wallet credit/g, "VA credit");

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const WalletCreditAudit = () => {
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin_wallet_credit_audit"],
    queryFn: async () => {
      const [txRes, auditRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("type", "top_up")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("wallet_balance_audit")
          .select("*")
          .eq("wallet_type", "member")
          .gt("delta", 0)
          .order("changed_at", { ascending: false })
          .limit(600),
      ]);

      if (txRes.error) throw txRes.error;
      if (auditRes.error) throw auditRes.error;

      const usedAuditIds = new Set<string>();
      const audits = (auditRes.data ?? []).sort(
        (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
      );

      return (txRes.data ?? []).map((transaction) => {
        const metadata = toObject(transaction.metadata);
        const walletId = typeof metadata.wallet_id === "string" ? metadata.wallet_id : null;
        const txTime = new Date(transaction.created_at).getTime();

        const candidates = audits.filter((audit) => {
          if (usedAuditIds.has(audit.id)) return false;
          if (audit.user_id !== transaction.user_id) return false;
          if (!isSameAmount(audit.delta, transaction.amount)) return false;
          if (walletId && audit.wallet_id !== walletId) return false;
          return new Date(audit.changed_at).getTime() >= txTime - 10 * 60 * 1000;
        });

        const audit = candidates.sort(
          (a, b) =>
            Math.abs(new Date(a.changed_at).getTime() - txTime) -
            Math.abs(new Date(b.changed_at).getTime() - txTime)
        )[0] ?? null;

        if (audit) usedAuditIds.add(audit.id);

        return {
          transaction,
          audit,
          isAdminCredit: metadata.source === "manual_admin_credit" || transaction.description?.toLowerCase().includes("manual wallet credit") === true,
        } satisfies CreditAuditRow;
      });
    },
  });

  const filteredRows = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(({ transaction, audit, isAdminCredit }) =>
      transaction.id.toLowerCase().includes(q) ||
      transaction.user_id.toLowerCase().includes(q) ||
      transaction.description?.toLowerCase().includes(q) ||
      transaction.amount.toFixed(2).includes(q) ||
      audit?.wallet_id.toLowerCase().includes(q) ||
      (isAdminCredit ? "admin credit" : "top up").includes(q)
    );
  }, [data, search]);

  const totalCredited = filteredRows.reduce((sum, row) => sum + Number(row.transaction.amount), 0);
  const adminCreditCount = filteredRows.filter((row) => row.isAdminCredit).length;
  const matchedCount = filteredRows.filter((row) => row.audit).length;

  const exportCsv = () => {
    const header = ["Transaction ID", "Timestamp", "Type", "Amount", "VA Balance Before", "VA Balance After", "User ID", "VA Wallet ID", "Description"];
    const rows = filteredRows.map(({ transaction, audit, isAdminCredit }) => [
      transaction.id,
      formatDateTime(audit?.changed_at ?? transaction.created_at),
      isAdminCredit ? "Admin credit" : "Top-up",
      Number(transaction.amount).toFixed(2),
      audit ? Number(audit.old_balance).toFixed(2) : "",
      audit ? Number(audit.new_balance).toFixed(2) : "",
      transaction.user_id,
      audit?.wallet_id ?? "unmatched",
      formatVaText(transaction.description),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "va-credit-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">VA Credit Audit Trail</h2>
          <p className="text-sm text-muted-foreground">Completed top-ups and manual admin VA credits with transaction IDs and VA Balance movement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filteredRows.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border bg-card/70"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Displayed credits</p><p className="text-2xl font-bold text-foreground">{filteredRows.length}</p></CardContent></Card>
        <Card className="border-border bg-card/70"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Total credited</p><p className="text-2xl font-bold text-secondary">{formatRM(totalCredited)}</p></CardContent></Card>
        <Card className="border-border bg-card/70"><CardContent className="py-4"><p className="text-xs text-muted-foreground">Admin credits / matched audits</p><p className="text-2xl font-bold text-foreground">{adminCreditCount} / {matchedCount}</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transaction ID, user ID, VA wallet ID, amount..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading VA credit audit trail...</p>
      ) : !filteredRows.length ? (
        <Card className="border-border bg-card/70"><CardContent className="py-8 text-center"><WalletCards className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No VA credits found.</p></CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">VA Balance Before</TableHead>
                <TableHead className="text-right">VA Balance After</TableHead>
                <TableHead>User / VA Wallet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(({ transaction, audit, isAdminCredit }) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(audit?.changed_at ?? transaction.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={isAdminCredit ? "secondary" : "default"}>{isAdminCredit ? "Admin credit" : "Top-up"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatRM(transaction.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{audit ? formatRM(audit.old_balance) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{audit ? formatRM(audit.new_balance) : "—"}</TableCell>
                  <TableCell className="max-w-[220px] space-y-1 text-xs">
                    <p className="font-mono text-muted-foreground truncate">User: {transaction.user_id}</p>
                    <p className="font-mono text-muted-foreground truncate">Wallet: {audit?.wallet_id ?? "unmatched"}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default WalletCreditAudit;