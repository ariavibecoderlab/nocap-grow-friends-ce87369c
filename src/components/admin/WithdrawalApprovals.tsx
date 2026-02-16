import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Wallet } from "lucide-react";

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

  // Rejection dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (data) {
      // Fetch profile names
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Fetch branch names for branch withdrawals
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

  useEffect(() => {
    fetchRequests();
  }, []);

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "No session" };
    const res = await supabase.functions.invoke("admin-actions", { body });
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
      toast({ title: "Error", description: typeof error === "string" ? error : (error as any)?.message || "Unknown error", variant: "destructive" });
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
      toast({ title: "Error", description: typeof error === "string" ? error : (error as any)?.message || "Unknown error", variant: "destructive" });
    } else {
      toast({ title: "Withdrawal rejected" });
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    }
    setProcessing(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Wallet className="h-4 w-4" /> Pending Withdrawals ({requests.length})
      </h3>

      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No pending withdrawal requests.</p>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="border-border/50">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">RM {Number(r.amount).toFixed(2)}</p>
                   <p className="text-[10px] text-muted-foreground">
                    {r.profiles?.full_name || "Unknown"} • {r.profiles?.phone || ""}
                    {r.branch_name && <span className="ml-1 text-primary">• Branch: {r.branch_name}</span>}
                  </p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    r.wallet_type === 'member' ? 'bg-blue-100 text-blue-700' :
                    r.wallet_type === 'merchant' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {r.wallet_type === 'member' ? 'Member' : r.wallet_type === 'merchant' ? 'Merchant' : 'Branch'} Wallet
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-muted/50 rounded px-2 py-1.5 text-xs space-y-0.5">
                <p><span className="text-muted-foreground">Bank:</span> {r.bank_name}</p>
                <p><span className="text-muted-foreground">Account:</span> {r.bank_account_no}</p>
                <p><span className="text-muted-foreground">Holder:</span> {r.bank_account_holder}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => approve(r)}
                  disabled={processing === r.id}
                >
                  {processing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 gap-1"
                  onClick={() => setRejectTarget(r.id)}
                  disabled={processing === r.id}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Rejection Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Reject Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <Button variant="destructive" className="w-full" onClick={reject} disabled={processing !== null}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalApprovals;
