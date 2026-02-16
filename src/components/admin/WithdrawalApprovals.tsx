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

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "No session" };
    return await supabase.functions.invoke("admin-actions", { body });
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
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  }

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
        <Wallet className="h-4 w-4" /> Pending Withdrawals ({requests.length})
      </h3>

      {requests.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-6">No pending withdrawal requests.</p>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">RM {Number(r.amount).toFixed(2)}</p>
                  <p className="text-[10px] text-white/40">
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
                <p className="text-[10px] text-white/40">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs space-y-0.5">
                <p className="text-white/70"><span className="text-white/40">Bank:</span> {r.bank_name}</p>
                <p className="text-white/70"><span className="text-white/40">Account:</span> {r.bank_account_no}</p>
                <p className="text-white/70"><span className="text-white/40">Holder:</span> {r.bank_account_holder}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
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

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Reject Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
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
