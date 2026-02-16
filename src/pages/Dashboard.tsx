import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Wallet, QrCode, ArrowUpDown, Users, Plus, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Gift, TrendingUp, Copy, ChevronRight, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
}

const transactionIcon = (type: string) => {
  switch (type) {
    case "top_up":return <ArrowDownLeft className="h-4 w-4 text-primary" />;
    case "cashback":
    case "commission":return <Gift className="h-4 w-4 text-primary" />;
    case "transfer_in":return <ArrowDownLeft className="h-4 w-4 text-primary" />;
    case "transfer_out":
    case "payment":
    case "withdrawal":return <ArrowUpRight className="h-4 w-4 text-destructive" />;
    default:return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
  }
};

const transactionLabel = (type: string) => {
  const labels: Record<string, string> = {
    top_up: "Top Up",
    payment: "Payment",
    transfer_in: "Received",
    transfer_out: "Transferred",
    cashback: "Cashback",
    commission: "Commission",
    withdrawal: "Withdrawal",
    refund: "Refund"
  };
  return labels[type] || type;
};

const isCredit = (type: string) =>
["top_up", "transfer_in", "cashback", "commission", "refund"].includes(type);

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [showBalance, setShowBalance] = useState(true);
  const [profile, setProfile] = useState<{full_name: string;referral_code: string;} | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);
      const [walletRes, profileRes, directReferrals, allReferrals, earningsRes, txRes] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, referral_code").eq("user_id", user.id).maybeSingle(),
      supabase.from("referral_tree").select("id").eq("ancestor_id", user.id).eq("tier", 1),
      supabase.from("referral_tree").select("id").eq("ancestor_id", user.id),
      supabase.from("transactions").select("amount").eq("user_id", user.id).in("type", ["cashback", "commission"]).eq("status", "completed"),
      supabase.from("transactions").select("id, type, amount, status, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)]
      );

      if (walletRes.data) setBalance(Number(walletRes.data.balance));
      if (profileRes.data) setProfile(profileRes.data);
      if (directReferrals.data) setReferralCount(directReferrals.data.length);
      if (allReferrals.data) setNetworkCount(allReferrals.data.length);
      if (earningsRes.data) setTotalEarnings(earningsRes.data.reduce((sum, t) => sum + Number(t.amount), 0));
      if (txRes.data) setTransactions(txRes.data as Transaction[]);
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>);

  }

  const quickActions = [
  { label: "QR Pay", icon: QrCode, path: "/qr-pay", bgClass: "bg-primary/10", iconClass: "text-primary" },
  { label: "Top Up", icon: Plus, path: "/top-up", bgClass: "bg-[hsl(var(--success))]/10", iconClass: "text-[hsl(var(--success))]" },
  { label: "Transfer", icon: ArrowUpDown, path: "/transfer", bgClass: "bg-[hsl(var(--info))]/10", iconClass: "text-[hsl(var(--info))]" },
  { label: "Referral", icon: Users, path: "/referral", bgClass: "bg-destructive/10", iconClass: "text-destructive" }];


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-14 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Welcome back,</p>
              <h1 className="font-display text-xl font-bold">{profile?.full_name || "Member"}</h1>
            </div>
            <div className="font-display text-lg font-bold tracking-tight">
              NO<span className="opacity-80">cap</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Wallet Card */}
        <Card className="-mt-10 border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span>Wallet Balance</span>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground hover:text-foreground transition-colors">
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight">
              {showBalance ? `RM ${balance.toFixed(2)}` : "RM ••••••"}
            </p>
            <Button size="sm" className="mt-3" onClick={() => navigate("/top-up")}>
              <Plus className="mr-1 h-4 w-4" /> Top Up
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {quickActions.map((action) =>
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 rounded-xl p-3 transition-all hover:bg-muted active:scale-95">

              <div className={`rounded-full p-3 ${action.bgClass}`}>
                <action.icon className={`h-5 w-5 ${action.iconClass}`} />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          )}
        </div>

        {/* Referral Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Users className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-display text-2xl font-bold">{referralCount}</p>
              <p className="text-[10px] text-muted-foreground">Direct</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-display text-2xl font-bold">{networkCount}</p>
              <p className="text-[10px] text-muted-foreground">Network</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Gift className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-2 font-display text-2xl font-bold">RM {totalEarnings.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Banner */}
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Your Referral Code</p>
              <p className="font-display text-lg font-bold tracking-wider text-primary-foreground">{profile?.referral_code || "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyReferralCode} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </CardContent>
        </Card>

        {/* Become a Merchant */}
        <Card className="mt-4 border-border/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/merchant/register")}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Become a Merchant</p>
                <p className="text-[10px] text-muted-foreground">Start accepting payments for your business</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
            {transactions.length > 0 &&
            <button onClick={() => navigate("/transactions")} className="flex items-center gap-0.5 text-xs text-primary font-medium">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          </div>

          {transactions.length === 0 ?
          <Card className="mt-3 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Wallet className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="mt-1 text-xs">Your activity will appear here</p>
              </CardContent>
            </Card> :

          <div className="mt-3 space-y-2">
              {transactions.map((tx) =>
            <Card key={tx.id} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      {transactionIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || transactionLabel(tx.type)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${isCredit(tx.type) ? "text-primary" : "text-foreground"}`}>
                      {isCredit(tx.type) ? "+" : "-"}RM {Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </div>
      </div>

      <BottomNav />
    </div>);

};

export default Dashboard;