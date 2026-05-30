import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Wallet,
  CheckSquare,
  Search,
  Download,
  Landmark,
  Users,
  Store,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  status: string;
  created_at: string;
  branch_id: string | null;
  wallet_type: string;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  settled_at?: string | null;
  settlement_ref?: string | null;
  disbursement_provider?: string | null;
  disbursement_ref?: string | null;
  disbursement_status?: string | null;
  disbursement_error?: string | null;
  disbursement_attempts?: number | null;
  profiles?: { full_name: string | null; phone: string | null } | null;
  branch_name?: string | null;
}

const callAdmin = async (body: Record<string, unknown>) => {
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }
  if (!session?.access_token) {
    return {
      data: null,
      error: { message: "Session expired. Please log in again." },
    };
  }
  const res = await supabase.functions.invoke("admin-actions", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.error) {
    const fnError = res.error as { message?: string; context?: Response };
    if (fnError.context) {
      try {
        const payload = (await fnError.context.clone().json()) as {
          error?: string;
        };
        if (payload?.error)
          return { data: null, error: { message: payload.error } };
      } catch {
        /* fall through */
      }
    }
    return {
      data: null,
      error: { message: fnError.message || "Unable to complete admin action." },
    };
  }
  if (res.data?.error)
    return { data: null, error: { message: res.data.error } };
  return res;
};

/* ─── Disbursement Badge ─── */
const DisbursementBadge = ({ r }: { r: WithdrawalRow }) => {
  if (r.status === "processing" || r.disbursement_status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/15 text-blue-400 rounded px-1.5 py-0.5">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Transferring…
      </span>
    );
  }
  if (r.status === "failed" || r.disbursement_status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] bg-red-500/15 text-red-400 rounded px-1.5 py-0.5"
        title={r.disbursement_error ?? ""}
      >
        <AlertTriangle className="h-2.5 w-2.5" /> Disbursement failed
      </span>
    );
  }
  if (r.disbursement_status === "manual_required") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 rounded px-1.5 py-0.5">
        <Clock className="h-2.5 w-2.5" /> Manual transfer needed
      </span>
    );
  }
  if (r.disbursement_ref && r.status !== "settled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/15 text-purple-400 rounded px-1.5 py-0.5">
        Ref: {r.disbursement_ref.slice(0, 20)}
      </span>
    );
  }
  return null;
};

/* ─── Summary Cards ─── */
const SummaryCards = ({ requests }: { requests: WithdrawalRow[] }) => {
  const pending = requests.filter((r) => r.status === "pending");
  const processing = requests.filter((r) =>
    ["processing", "approved"].includes(r.status),
  );
  const failed = requests.filter((r) => r.status === "failed");
  const todaySettled = requests.filter(
    (r) =>
      r.status === "settled" &&
      r.settled_at &&
      new Date(r.settled_at).toDateString() === new Date().toDateString(),
  );

  const cards = [
    {
      label: "Pending",
      amount: pending.reduce((s, r) => s + r.amount, 0),
      count: pending.length,
      color: "text-amber-400",
    },
    {
      label: "Processing",
      amount: processing.reduce((s, r) => s + r.amount, 0),
      count: processing.length,
      color: "text-blue-400",
    },
    {
      label: "Failed",
      amount: failed.reduce((s, r) => s + r.amount, 0),
      count: failed.length,
      color: "text-red-400",
    },
    {
      label: "Settled Today",
      amount: todaySettled.reduce((s, r) => s + r.amount, 0),
      count: todaySettled.length,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className={`text-sm font-bold ${c.color}`}>
              RM {c.amount.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {c.count} request{c.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/* ─── Withdrawal Card ─── */
const WithdrawalCard = ({
  r,
  selectable,
  selected,
  onToggle,
  actions,
}: {
  r: WithdrawalRow;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
}) => (
  <Card className="border-border/50 bg-card">
    <CardContent className="p-3 space-y-2">
      <div className="flex items-start gap-3">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mt-1 border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                RM {Number(r.amount).toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {r.profiles?.full_name || "Unknown"} • {r.profiles?.phone || ""}
                {r.branch_name && (
                  <span className="ml-1 text-secondary">
                    • Branch: {r.branch_name}
                  </span>
                )}
              </p>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  r.wallet_type === "member"
                    ? "bg-blue-500/20 text-blue-400"
                    : r.wallet_type === "merchant"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {r.wallet_type === "member"
                  ? "Member"
                  : r.wallet_type === "merchant"
                    ? "Merchant"
                    : "Branch"}{" "}
                Wallet
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
              {r.settlement_ref && (
                <p className="text-[10px] text-emerald-400">
                  Ref: {r.settlement_ref}
                </p>
              )}
            </div>
          </div>
          <div className="mt-1.5">
            <DisbursementBadge r={r} />
          </div>
          {r.disbursement_error &&
            (r.status === "failed" || r.disbursement_status === "error") && (
              <p
                className="text-[10px] text-red-400/80 mt-1 truncate"
                title={r.disbursement_error}
              >
                ↳ {r.disbursement_error.slice(0, 80)}
              </p>
            )}
          <div className="bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs space-y-0.5 mt-2">
            <p className="text-foreground/70">
              <span className="text-muted-foreground">Bank:</span> {r.bank_name}
            </p>
            <p className="text-foreground/70">
              <span className="text-muted-foreground">Account:</span>{" "}
              {r.bank_account_no}
            </p>
            <p className="text-foreground/70">
              <span className="text-muted-foreground">Holder:</span>{" "}
              {r.bank_account_holder}
            </p>
          </div>
          {actions && <div className="flex gap-2 mt-2">{actions}</div>}
        </div>
      </div>
    </CardContent>
  </Card>
);

/* ─── Sub-Tab Panel ─── */
const StatusPanel = ({
  requests,
  status,
  walletFilter,
  onRefresh,
}: {
  requests: WithdrawalRow[];
  status: string;
  walletFilter: "member" | "merchant";
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [settleTarget, setSettleTarget] = useState<string | null>(null);
  const [settleRef, setSettleRef] = useState("");

  const filtered = useMemo(() => {
    const list = requests.filter((r) => {
      if (r.status !== status) return false;
      if (walletFilter === "member" && r.wallet_type !== "member") return false;
      if (walletFilter === "merchant" && r.wallet_type === "member")
        return false;
      return true;
    });
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.profiles?.full_name?.toLowerCase().includes(q) ||
        r.bank_name.toLowerCase().includes(q) ||
        r.bank_account_holder.toLowerCase().includes(q) ||
        r.bank_account_no.includes(q) ||
        r.amount.toString().includes(q),
    );
  }, [requests, status, walletFilter, search]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalSelected = filtered
    .filter((r) => selected.has(r.id))
    .reduce((s, r) => s + r.amount, 0);

  const approve = async (req: WithdrawalRow) => {
    setProcessing(req.id);
    const action = req.branch_id
      ? "approve_branch_withdrawal"
      : "approve_withdrawal";
    const { error } = await callAdmin({
      action,
      withdrawalId: req.id,
      withdrawalUserId: req.user_id,
      amount: req.amount,
      walletType: req.wallet_type,
      ...(req.branch_id ? { branchId: req.branch_id } : {}),
    });
    if (error)
      toast({
        title: "Error",
        description: (error as any)?.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Withdrawal approved" });
      onRefresh();
    }
    setProcessing(null);
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget);
    const { error } = await callAdmin({
      action: "reject_withdrawal",
      withdrawalId: rejectTarget,
      reason: rejectReason.trim(),
    });
    if (error)
      toast({
        title: "Error",
        description: (error as any)?.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Withdrawal rejected" });
      setRejectTarget(null);
      setRejectReason("");
      onRefresh();
    }
    setProcessing(null);
  };

  const retryDisbursement = async (req: WithdrawalRow) => {
    setProcessing(req.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke(
        "process-withdrawal-disbursement",
        {
          body: { withdrawal_id: req.id },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );
      if (res.error || res.data?.error) {
        toast({
          title: "Retry failed",
          description:
            res.data?.error ?? "Could not reach disbursement service",
          variant: "destructive",
        });
      } else {
        toast({
          title: res.data?.manual
            ? "Manual transfer required"
            : "Disbursement queued",
          description: res.data?.manual
            ? "Credentials not configured — process manually"
            : `Ref: ${res.data?.ref}`,
        });
        onRefresh();
      }
    } catch (e) {
      toast({
        title: "Retry failed",
        description: String(e),
        variant: "destructive",
      });
    }
    setProcessing(null);
  };

  const settle = async () => {
    if (!settleTarget) return;
    setProcessing(settleTarget);
    const { error } = await callAdmin({
      action: "settle_withdrawal",
      withdrawalId: settleTarget,
      settlementRef: settleRef.trim(),
    });
    if (error)
      toast({
        title: "Error",
        description: (error as any)?.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Marked as settled" });
      setSettleTarget(null);
      setSettleRef("");
      onRefresh();
    }
    setProcessing(null);
  };

  const bulkApprove = async () => {
    setBulkProcessing(true);
    let success = 0,
      failed = 0;
    for (const req of filtered.filter((r) => selected.has(r.id))) {
      const action = req.branch_id
        ? "approve_branch_withdrawal"
        : "approve_withdrawal";
      const { error } = await callAdmin({
        action,
        withdrawalId: req.id,
        withdrawalUserId: req.user_id,
        amount: req.amount,
        walletType: req.wallet_type,
        ...(req.branch_id ? { branchId: req.branch_id } : {}),
      });
      error ? failed++ : success++;
    }
    toast({ title: `Bulk approve: ${success} approved, ${failed} failed` });
    setSelected(new Set());
    setBulkProcessing(false);
    onRefresh();
  };

  const bulkReject = async () => {
    setBulkProcessing(true);
    let success = 0,
      failed = 0;
    for (const id of selected) {
      const { error } = await callAdmin({
        action: "reject_withdrawal",
        withdrawalId: id,
        reason: bulkRejectReason.trim(),
      });
      error ? failed++ : success++;
    }
    toast({ title: `Bulk reject: ${success} rejected, ${failed} failed` });
    setSelected(new Set());
    setBulkRejectOpen(false);
    setBulkRejectReason("");
    setBulkProcessing(false);
    onRefresh();
  };

  const bulkSettle = async () => {
    setBulkProcessing(true);
    let success = 0,
      failed = 0;
    for (const id of selected) {
      const { error } = await callAdmin({
        action: "settle_withdrawal",
        withdrawalId: id,
        settlementRef: "",
      });
      error ? failed++ : success++;
    }
    toast({ title: `Bulk settle: ${success} settled, ${failed} failed` });
    setSelected(new Set());
    setBulkProcessing(false);
    onRefresh();
  };

  const exportCsv = () => {
    const header =
      "Date,Name,Phone,Amount,Bank,Account,Holder,Wallet,Status,Ref\n";
    const rows = filtered
      .map(
        (r) =>
          `${new Date(r.created_at).toLocaleDateString()},${r.profiles?.full_name || ""},${r.profiles?.phone || ""},${r.amount},${r.bank_name},${r.bank_account_no},${r.bank_account_holder},${r.wallet_type},${r.status},${r.settlement_ref || ""}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `withdrawals-${walletFilter}-${status}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isProcessing = status === "processing";
  const isFailed = status === "failed";

  return (
    <div className="space-y-3">
      {/* Search + Export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, bank, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs border-border/50 bg-muted/30"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          className="gap-1 text-xs border-border/50"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        {(isPending || isApproved) && filtered.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              selected.size === filtered.length
                ? setSelected(new Set())
                : setSelected(new Set(filtered.map((r) => r.id)));
            }}
            className="gap-1 text-xs border-border/50"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selected.size === filtered.length ? "Deselect" : "Select All"}
          </Button>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30 flex-wrap">
          <span className="text-sm font-medium text-secondary">
            {selected.size} selected · RM {totalSelected.toFixed(2)}
          </span>
          <div className="ml-auto flex gap-2">
            {isPending && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-1"
                      disabled={bulkProcessing}
                    >
                      {bulkProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}{" "}
                      Approve All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bulk Approve</AlertDialogTitle>
                      <AlertDialogDescription>
                        Approve {selected.size} withdrawal(s) totaling RM{" "}
                        {totalSelected.toFixed(2)}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-secondary text-primary"
                        onClick={bulkApprove}
                      >
                        Approve {selected.size}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkRejectOpen(true)}
                  disabled={bulkProcessing}
                  className="gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject All
                </Button>
              </>
            )}
            {isApproved && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold gap-1"
                    disabled={bulkProcessing}
                  >
                    {bulkProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Landmark className="h-3.5 w-3.5" />
                    )}{" "}
                    Settle All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bulk Settle</AlertDialogTitle>
                    <AlertDialogDescription>
                      Mark {selected.size} withdrawal(s) as settled?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-emerald-600 text-white"
                      onClick={bulkSettle}
                    >
                      Settle {selected.size}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No {status} withdrawals.
        </p>
      ) : (
        filtered.map((r) => (
          <WithdrawalCard
            key={r.id}
            r={r}
            selectable={isPending || isApproved}
            selected={selected.has(r.id)}
            onToggle={() => toggleSelect(r.id)}
            actions={
              isPending ? (
                <>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                    onClick={() => approve(r)}
                    disabled={processing === r.id || bulkProcessing}
                  >
                    {processing === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}{" "}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => setRejectTarget(r.id)}
                    disabled={processing === r.id || bulkProcessing}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              ) : isApproved ? (
                <Button
                  size="sm"
                  className="flex-1 gap-1 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                  onClick={() => setSettleTarget(r.id)}
                  disabled={processing === r.id || bulkProcessing}
                >
                  {processing === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5" />
                  )}{" "}
                  Mark Settled
                </Button>
              ) : isProcessing ? (
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Disbursement in
                  progress…
                </p>
              ) : isFailed ? (
                <>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                    onClick={() => retryDisbursement(r)}
                    disabled={processing === r.id}
                  >
                    {processing === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}{" "}
                    Retry Disbursement
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10"
                    onClick={() => setSettleTarget(r.id)}
                    disabled={processing === r.id}
                  >
                    <Landmark className="h-3.5 w-3.5" /> Manual Settle
                  </Button>
                </>
              ) : undefined
            }
          />
        ))
      )}

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="border-border/50 bg-muted/30"
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={reject}
              disabled={processing !== null}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{" "}
              Confirm Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog */}
      <Dialog
        open={bulkRejectOpen}
        onOpenChange={(o) => {
          if (!o) {
            setBulkRejectOpen(false);
            setBulkRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Bulk Reject ({selected.size})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Rejection reason…"
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              className="border-border/50 bg-muted/30"
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={bulkReject}
              disabled={bulkProcessing}
            >
              {bulkProcessing && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}{" "}
              Reject {selected.size}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle dialog */}
      <Dialog
        open={!!settleTarget}
        onOpenChange={(o) => {
          if (!o) {
            setSettleTarget(null);
            setSettleRef("");
          }
        }}
      >
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Mark as Settled</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Bank reference / batch number (optional)"
              value={settleRef}
              onChange={(e) => setSettleRef(e.target.value)}
              className="border-border/50 bg-muted/30"
            />
            <Button
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={settle}
              disabled={processing !== null}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{" "}
              Confirm Settled
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Main Component ─── */
const WithdrawalApprovals = () => {
  const [requests, setRequests] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .in("status", [
        "pending",
        "approved",
        "processing",
        "failed",
        "settled",
        "rejected",
      ])
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p]),
      );

      const branchIds = data
        .filter((d: any) => d.branch_id)
        .map((d: any) => d.branch_id);
      let branchMap = new Map<string, string>();
      if (branchIds.length > 0) {
        const { data: branchData } = await supabase
          .from("merchant_branches")
          .select("id, branch_name")
          .in("id", branchIds);
        branchMap = new Map(
          (branchData || []).map((b: any) => [b.id, b.branch_name]),
        );
      }

      setRequests(
        (data as any[]).map((r) => ({
          ...r,
          profiles: profileMap.get(r.user_id) || null,
          branch_name: r.branch_id ? branchMap.get(r.branch_id) || null : null,
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const countByFilter = (wallet: "member" | "merchant", status: string) =>
    requests.filter((r) => {
      if (r.status !== status) return false;
      if (wallet === "member") return r.wallet_type === "member";
      return r.wallet_type !== "member";
    }).length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-secondary" />
        <h3 className="text-sm font-semibold text-foreground">
          Withdrawal Management
        </h3>
      </div>

      <SummaryCards requests={requests} />

      <Tabs defaultValue="member" className="w-full">
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger value="member" className="flex-1 gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Members
          </TabsTrigger>
          <TabsTrigger value="merchant" className="flex-1 gap-1.5 text-xs">
            <Store className="h-3.5 w-3.5" /> Merchants
          </TabsTrigger>
        </TabsList>

        {(["member", "merchant"] as const).map((walletFilter) => (
          <TabsContent key={walletFilter} value={walletFilter}>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="w-full bg-muted/30">
                <TabsTrigger value="pending" className="flex-1 text-xs gap-1">
                  Pending
                  {countByFilter(walletFilter, "pending") > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 px-1 text-[10px]"
                    >
                      {countByFilter(walletFilter, "pending")}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex-1 text-xs gap-1">
                  Approved
                  {countByFilter(walletFilter, "approved") > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 px-1 text-[10px] border-blue-500/50 text-blue-400"
                    >
                      {countByFilter(walletFilter, "approved")}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="processing"
                  className="flex-1 text-xs gap-1"
                >
                  Sending
                  {countByFilter(walletFilter, "processing") > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 px-1 text-[10px] border-blue-500/50 text-blue-400"
                    >
                      {countByFilter(walletFilter, "processing")}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex-1 text-xs gap-1">
                  Failed
                  {countByFilter(walletFilter, "failed") > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 px-1 text-[10px] border-red-500/50 text-red-400"
                    >
                      {countByFilter(walletFilter, "failed")}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="settled" className="flex-1 text-xs gap-1">
                  Settled
                  {countByFilter(walletFilter, "settled") > 0 && (
                    <Badge
                      variant="outline"
                      className="ml-1 h-4 px-1 text-[10px] border-emerald-500/50 text-emerald-400"
                    >
                      {countByFilter(walletFilter, "settled")}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              {(
                [
                  "pending",
                  "approved",
                  "processing",
                  "failed",
                  "settled",
                ] as const
              ).map((status) => (
                <TabsContent key={status} value={status}>
                  <StatusPanel
                    requests={requests}
                    status={status}
                    walletFilter={walletFilter}
                    onRefresh={fetchRequests}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default WithdrawalApprovals;
