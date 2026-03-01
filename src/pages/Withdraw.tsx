import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, ArrowDownToLine, ArrowLeft } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const Withdraw = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [minWithdrawal, setMinWithdrawal] = useState(50);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: wr }, { data: wallet }, { data: globalSettings }] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("wallet_type", "member")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("wallets").select("balance").eq("user_id", user.id).eq("wallet_type", "member").maybeSingle(),
      supabase.from("system_settings").select("value").eq("key", "min_withdrawal_amount").maybeSingle(),
    ]);
    if (wr) setRequests(wr as WithdrawalRequest[]);
    if (wallet) setWalletBalance(Number(wallet.balance));
    if (globalSettings?.value) setMinWithdrawal(Number(globalSettings.value));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase
      .channel("member-withdrawal-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const hasPending = requests.some((r) => r.status === "pending");

  const submit = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (amt < minWithdrawal) {
      toast({ title: `Minimum withdrawal is RM ${minWithdrawal.toFixed(2)}`, variant: "destructive" });
      return;
    }
    if (amt > walletBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (!bankName.trim() || !bankAccountNo.trim() || !bankAccountHolder.trim()) {
      toast({ title: "Fill in all bank details", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      amount: amt,
      bank_name: bankName.trim(),
      bank_account_no: bankAccountNo.trim(),
      bank_account_holder: bankAccountHolder.trim(),
      wallet_type: "member",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal requested", description: "Admin will review your request." });
      setAmount("");
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle2 className="h-4 w-4 text-secondary" />;
    if (s === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-white">Withdraw</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-3">
        {/* Balance & request button */}
        <Card className="border-secondary/20 bg-secondary/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">Wallet Balance</p>
              <p className="text-xl font-bold font-display text-white">RM {walletBalance.toFixed(2)}</p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} disabled={hasPending} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold">
              <ArrowDownToLine className="h-3.5 w-3.5" /> Request
            </Button>
          </CardContent>
        </Card>

        {hasPending && (
          <p className="text-xs text-amber-500 text-center">You have a pending withdrawal request. Please wait for it to be processed.</p>
        )}

        {/* History */}
        <h2 className="font-display text-sm font-semibold text-white/60 pt-2">Withdrawal History</h2>

        {requests.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
              <Wallet className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No withdrawal requests yet</p>
              <p className="mt-1 text-xs">Your requests will appear here</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((r) => (
            <Card key={r.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(r.status)}
                    <div>
                      <p className="text-sm font-semibold text-white">RM {Number(r.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-white/40">
                        {r.bank_name} • {r.bank_account_no}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium capitalize ${r.status === "approved" ? "text-secondary" : r.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>
                      {r.status}
                    </span>
                    <p className="text-[10px] text-white/40">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {r.rejection_reason && (
                  <p className="text-[10px] text-destructive mt-1.5 bg-destructive/10 rounded px-2 py-1">
                    {r.rejection_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Withdrawal Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5" /> Request Withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder={minWithdrawal.toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} min={minWithdrawal} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
              <p className="text-[10px] text-white/40">Min: RM {minWithdrawal.toFixed(2)} • Available: RM {walletBalance.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Bank Name *</Label>
              <Input placeholder="e.g. CIMB Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Account Number *</Label>
              <Input placeholder="e.g. 7778889990" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Account Holder Name *</Label>
              <Input placeholder="Full name" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Withdraw;
