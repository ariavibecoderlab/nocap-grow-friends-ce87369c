import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";

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

interface Props {
  userId: string;
}

const MerchantWithdrawals = ({ userId }: Props) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: wr }, { data: wallet }, { data: app }] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("wallets").select("balance").eq("user_id", userId).single(),
      supabase
        .from("merchant_applications")
        .select("bank_name, bank_account_no, bank_account_holder")
        .eq("user_id", userId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle(),
    ]);
    if (wr) setRequests(wr as WithdrawalRequest[]);
    if (wallet) setWalletBalance(Number(wallet.balance));
    if (app) {
      setBankName(app.bank_name || "");
      setBankAccountNo(app.bank_account_no || "");
      setBankAccountHolder(app.bank_account_holder || "");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("withdrawal-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${userId}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const hasPending = requests.some((r) => r.status === "pending");

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
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
      user_id: userId,
      amount: amt,
      bank_name: bankName.trim(),
      bank_account_no: bankAccountNo.trim(),
      bank_account_holder: bankAccountHolder.trim(),
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

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Balance & request button */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-xl font-bold font-display">RM {walletBalance.toFixed(2)}</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} disabled={hasPending} className="gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Withdraw
          </Button>
        </CardContent>
      </Card>

      {hasPending && (
        <p className="text-xs text-amber-600 text-center">You have a pending withdrawal request. Please wait for it to be processed.</p>
      )}

      {/* History */}
      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No withdrawal requests yet.</p>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(r.status)}
                  <div>
                    <p className="text-sm font-semibold">RM {Number(r.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.bank_name} • {r.bank_account_no}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-medium capitalize ${r.status === "approved" ? "text-secondary" : r.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>
                    {r.status}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
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

      {/* Withdrawal Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Request Withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Available: RM {walletBalance.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label>Bank Name *</Label>
              <Input placeholder="e.g. CIMB Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Account Number *</Label>
              <Input placeholder="e.g. 7778889990" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Account Holder Name *</Label>
              <Input placeholder="Full name" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} />
            </div>
            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantWithdrawals;
