import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Wallet, CheckSquare } from "lucide-react";

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
  profiles?: { full_name: string | null; phone: string | null } | null;
  branch_name?: string | null;
}

const WithdrawalApprovals = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const branchIds = data.filter((d: any) => d.branch_id).map((d: any) => d.branch_id);
      let branchMap = new Map<string, string>();
      if (branchIds.length > 0) {
        const { data: branchData } = await supabase
          .from("merchant_branches")
          .select("id, branch_name")
          .in("id", branchIds);
        branchMap = new Map((branchData || []).map((b: any) => [b.id, b.branch_name]));
      }

      setRequests(
        (data as any[]).map((r) => ({
          ...r,
          profiles: profileMap.get(r.user_id) || null,
          branch_name: r.branch_id ? branchMap.get(r.branch_id) || null : null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === requests.length) setSelected(new Set());
    else setSelected(new Set(requests.map((r) => r.id)));
  };

  const callAdmin = async (body: Record<string, unknown>) => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (!session?.access_token) {
      return { data: null, error: { message: "Session expired. Please log in again." } };
    }
    const res = await supabase.functions.invoke("admin-actions", {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.error) {
      const fnError = res.error as { message?: string; context?: Response };
      if (fnError.context) {
        try {
          const payload = await fnError.context.clone().json() as { error?: string };
          if (payload?.error) {
            return { data: null, error: { message: payload.error === "Unauthorized" ? "Session expired or unauthorized." : payload.error } };
          }
        } catch { /* fall through */ }
      }
      return { data: null, error: { message: fnError.message || "Unable to complete admin action." } };
    }
    if (res.data?.error) return { data: null, error: { message: res.data.error } };
    return res;
  };

  const approve = async (req: WithdrawalRow) => {
    setProcessing(req.id);
    const action = req.branch_id ? "approve_branch_withdrawal" : "approve_withdrawal";
    const { error } = await callAdmin({
      action,
      withdrawalId: req.id,
      withdrawalUserId: req.user_id,
      amount: req.amount,
      walletType: req.wallet_type,
      ...(req.branch_id ? { branchId: req.branch_id } : {}),
    });
    if (error) {
      toast({ title: "Error", description: (error as any)?.message || "Unknown error", variant: "destructive" });
    } else {
      toast({ title: "Withdrawal approved" });
      fetchRequests();
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
    if (error) {
      toast({ title: "Error", description: (error as any)?.message || "Unknown error", variant: "destructive" });
    } else {
      toast({ title: "Withdrawal rejected" });
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    }
    setProcessing(null);
  };

  const bulkApprove = async () => {
    setBulkProcessing(true);
    const selectedReqs = requests.filter((r) => selected.has(r.id));
    let success = 0;
    let failed = 0;
    for (const req of selectedReqs) {
      const action = req.branch_id ? "approve_branch_withdrawal" : "approve_withdrawal";
      const { error } = await callAdmin({
        action,
        withdrawalId: req.id,
        withdrawalUserId: req.user_id,
        amount: req.amount,
        walletType: req.wallet_type,
        ...(req.branch_id ? { branchId: req.branch_id } : {}),
      });
      if (error) failed++; else success++;
    }
    toast({ title: `Bulk approve: ${success} approved, ${failed} failed` });
    setSelected(new Set());
    setBulkProcessing(false);
    fetchRequests();
  };

  const bulkReject = async () => {
    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    for (const id of selected) {
      const { error } = await callAdmin({
        action: "reject_withdrawal",
        withdrawalId: id,
        reason: bulkRejectReason.trim(),
      });
      if (error) failed++; else success++;
    }
    toast({ title: `Bulk reject: ${success} rejected, ${failed} failed` });
    setSelected(new Set());
    setBulkRejectOpen(false);
    setBulkRejectReason("");
    setBulkProcessing(false);
    fetchRequests();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalSelected = requests.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
          <Wallet className="h-4 w-4" /> Pending Withdrawals ({requests.length})
        </h3>
        {requests.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-1.5 border-border/50 text-xs">
            <CheckSquare className="h-3.5 w-3.5" />
            {selected.size === requests.length ? "Deselect All" : `Select All (${requests.length})`}
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30 flex-wrap">
          <span className="text-sm font-medium text-secondary">
            {selected.size} selected · RM {totalSelected.toFixed(2)}
          </span>
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-1" disabled={bulkProcessing}>
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Bulk Approve Withdrawals</AlertDialogTitle>
                  <AlertDialogDescription>
                    Approve {selected.size} withdrawal{selected.size > 1 ? "s" : ""} totaling RM {totalSelected.toFixed(2)}? Funds will be deducted from each user's wallet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={bulkApprove}>
                    Approve {selected.size}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="destructive" onClick={() => setBulkRejectOpen(true)} disabled={bulkProcessing} className="gap-1">
              <XCircle className="h-3.5 w-3.5" /> Reject All
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No pending withdrawal requests.</p>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="border-border/50 bg-card">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggleSelect(r.id)}
                  className="mt-1 border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">RM {Number(r.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.profiles?.full_name || "Unknown"} • {r.profiles?.phone || ""}
                        {r.branch_name && <span className="ml-1 text-secondary">• Branch: {r.branch_name}</span>}
                      </p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        r.wallet_type === 'member' ? 'bg-blue-500/20 text-blue-400' :
                        r.wallet_type === 'merchant' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {r.wallet_type === 'member' ? 'Member' : r.wallet_type === 'merchant' ? 'Merchant' : 'Branch'} Wallet
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-muted/30 border border-border/50 rounded px-2 py-1.5 text-xs space-y-0.5 mt-2">
                    <p className="text-foreground/70"><span className="text-muted-foreground">Bank:</span> {r.bank_name}</p>
                    <p className="text-foreground/70"><span className="text-muted-foreground">Account:</span> {r.bank_account_no}</p>
                    <p className="text-foreground/70"><span className="text-muted-foreground">Holder:</span> {r.bank_account_holder}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                      onClick={() => approve(r)}
                      disabled={processing === r.id || bulkProcessing}
                    >
                      {processing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Single reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="border-border/50 bg-muted/30"
            />
            <Button variant="destructive" className="w-full" onClick={reject} disabled={processing !== null}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={(o) => { if (!o) { setBulkRejectOpen(false); setBulkRejectReason(""); } }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Bulk Reject ({selected.size} withdrawals)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Rejection reason for all selected..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              className="border-border/50 bg-muted/30"
            />
            <Button variant="destructive" className="w-full" onClick={bulkReject} disabled={bulkProcessing}>
              {bulkProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject {selected.size}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalApprovals;
