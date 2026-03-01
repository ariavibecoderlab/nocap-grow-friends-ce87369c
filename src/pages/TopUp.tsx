import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Wallet, CheckCircle2, Loader2 } from "lucide-react";

const presetAmounts = [10, 20, 50, 100, 200, 500];

const TopUp = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // RaudhahPay redirect includes: status (4=Success), paid (true/false), ref1, ref2, etc.
    const status = searchParams.get("status");
    const paid = searchParams.get("paid");
    if (status === "success" || status === "4" || paid === "true") {
      setShowSuccess(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .eq("wallet_type", "member")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBalance(Number(data.balance));
      });

    // Realtime wallet balance updates (auto-refresh after payment completes)
    const channel = supabase
      .channel("topup-wallet")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { balance: number; wallet_type: string };
          if (updated.wallet_type === "member") setBalance(Number(updated.balance));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 10 || numAmount > 500) {
      toast({ title: "Invalid amount", description: "Please enter an amount between RM10 and RM500.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-topup-bill", {
        body: { amount: numAmount },
      });

      if (error) {
        console.error("Top-up error:", error);
        toast({ title: "Top-up failed", description: error.message || "Unable to create payment. Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast({ title: "Error", description: "No payment URL received. Please try again.", variant: "destructive" });
        setLoading(false);
      }
    } catch (err) {
      console.error("Top-up error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="mx-auto max-w-md px-4 pt-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/20 mb-4">
              <CheckCircle2 className="h-10 w-10 text-secondary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Payment Submitted!</h1>
            <p className="mt-2 text-sm text-white/50 max-w-xs">
              Your top-up is being processed. Your wallet balance will be updated once the payment is confirmed.
            </p>
            <Button className="mt-8 bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="font-display text-lg font-bold text-white">Top Up Wallet</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Current Balance */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
              <Wallet className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-white/50">Current Balance</p>
              <p className="font-display text-xl font-bold text-secondary">RM {balance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Amount Input */}
        <div className="mt-6">
          <label className="text-sm font-medium text-white/70">Enter Amount (RM)</label>
          <div className="mt-2 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-white/40">RM</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-14 text-2xl font-display font-bold h-14 text-right bg-white/5 border-white/10 text-white placeholder:text-white/30"
              min={10}
              max={500}
              step="0.01"
            />
          </div>
          <p className="mt-1 text-xs text-white/40">Min RM10.00 · Max RM500.00</p>
        </div>

        {/* Preset Amounts */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-95 ${
                amount === preset.toString()
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-white/10 bg-white/5 text-white hover:border-secondary/50"
              }`}
            >
              RM {preset}
            </button>
          ))}
        </div>

        {/* Pay Button */}
        <Button
          className="mt-8 w-full h-12 text-base font-semibold bg-secondary text-primary hover:bg-secondary/90"
          onClick={handleTopUp}
          disabled={loading || !amount || parseFloat(amount) < 10}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            `Top Up RM ${parseFloat(amount || "0").toFixed(2)}`
          )}
        </Button>

        {/* Info */}
        <p className="mt-4 text-center text-xs text-white/40">
          You will be redirected to our secure payment partner to complete the transaction.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default TopUp;
