import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TransactionDetail from "@/components/TransactionDetail";
import { Wallet, QrCode, ArrowUpDown, Users, Plus, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Gift, TrendingUp, Copy, ChevronRight, Store, AlertCircle, Banknote, Send, UserPlus, Share2, ShoppingBag } from "lucide-react";
import NocapLogo from "@/components/NocapLogo";
import NotificationBell from "@/components/NotificationBell";
import OnboardingChecklist from "@/components/OnboardingChecklist";
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
    case "top_up": return <ArrowDownLeft className="h-4 w-4 text-secondary" />;
    case "cashback":
    case "commission": return <Gift className="h-4 w-4 text-secondary" />;
    case "transfer_in": return <ArrowDownLeft className="h-4 w-4 text-secondary" />;
    case "transfer_out":
    case "payment":
    case "withdrawal": return <ArrowUpRight className="h-4 w-4 text-red-400" />;
    default: return <ArrowUpDown className="h-4 w-4 text-white/50" />;
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
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null; referral_code: string; avatar_url: string | null; address: string | null; has_pin: boolean } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);
  const [cashbackEarnings, setCashbackEarnings] = useState(0);
  const [commissionEarnings, setCommissionEarnings] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);
      const [walletRes, profileRes, directReferrals, allReferrals, earningsRes, txRes, merchantRoleRes] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).eq("wallet_type", "member").maybeSingle(),
        supabase.from("profiles").select("full_name, phone, referral_code, avatar_url, address, has_pin").eq("user_id", user.id).maybeSingle(),
        supabase.from("referral_tree").select("id").eq("ancestor_id", user.id).eq("tier", 1),
        supabase.from("referral_tree").select("id").eq("ancestor_id", user.id),
        supabase.from("transactions").select("amount, type").eq("user_id", user.id).in("type", ["cashback", "commission"]).eq("status", "completed"),
        supabase.from("transactions").select("id, type, amount, status, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("user_roles").select("id").eq("user_id", user.id).eq("role", "merchant").maybeSingle()
      ]);

      if (walletRes.data) setBalance(Number(walletRes.data.balance));
      if (profileRes.data) setProfile(profileRes.data);
      if (directReferrals.data) setReferralCount(directReferrals.data.length);
      if (allReferrals.data) setNetworkCount(allReferrals.data.length);
      if (earningsRes.data) {
        setCashbackEarnings(earningsRes.data.filter(t => t.type === 'cashback').reduce((sum, t) => sum + Number(t.amount), 0));
        setCommissionEarnings(earningsRes.data.filter(t => t.type === 'commission').reduce((sum, t) => sum + Number(t.amount), 0));
      }
      if (txRes.data) setTransactions(txRes.data as Transaction[]);
      setIsMerchant(!!merchantRoleRes.data);
      setLoadingData(false);
    };

    fetchData();

    // Realtime: auto-refresh wallet balance & transactions on changes
    const walletChannel = supabase
      .channel("dashboard-wallet")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { balance: number; wallet_type: string };
          if (updated.wallet_type === "member") {
            setBalance(Number(updated.balance));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => {
          // Refresh transactions list
          supabase
            .from("transactions")
            .select("id, type, amount, status, description, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data }) => {
              if (data) setTransactions(data as Transaction[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [user]);

  const shareReferralCode = async () => {
    if (!profile?.referral_code) return;
    const referralUrl = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    const shareText = `Join NOcap and earn cashback on every transaction! Use my referral code: ${profile.referral_code}\n\n${referralUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Join NOcap", text: shareText, url: referralUrl });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const quickActions = [
    { label: "Pay", icon: QrCode, path: "/qr-pay" },
    { label: "Top Up", icon: Banknote, path: "/top-up" },
    { label: "Transfer", icon: Send, path: "/transfer" },
    { label: "Shop", icon: ShoppingBag, path: "/marketplace" },
  ];

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/my-profile")} className="shrink-0">
                <Avatar className="h-10 w-10 border border-secondary/30">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
                  <AvatarFallback className="bg-white/10 text-white text-sm font-bold">
                    {profile?.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div>
                <p className="text-sm text-white/50">Welcome back,</p>
                <h1 className="font-display text-xl font-bold text-white">{profile?.full_name || "Member"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell className="text-white" />
              <NocapLogo size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Wallet Card */}
        <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Wallet className="h-4 w-4" />
                <span>Wallet Balance</span>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="text-white/50 hover:text-white transition-colors">
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-secondary">
              {showBalance ? `RM ${balance.toFixed(2)}` : "RM ••••••"}
            </p>
            <Button size="sm" className="mt-3 bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => navigate("/top-up")}>
              <Plus className="mr-1 h-4 w-4" /> Top Up
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <div className="mt-4">
          <OnboardingChecklist
            profile={profile}
            hasPin={profile?.has_pin ?? false}
            hasTransactions={transactions.length > 0}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {quickActions.map((action) =>
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 active:scale-95">
              <div className="rounded-full bg-secondary/20 p-3">
                <action.icon className="h-5 w-5 text-secondary" />
              </div>
              <span className="text-xs font-medium text-white">{action.label}</span>
            </button>
          )}
        </div>

        {/* Referral Stats */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <Users className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-lg font-bold text-white">{referralCount}</p>
              <p className="text-[10px] text-white/40">Direct</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <TrendingUp className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-lg font-bold text-white">{networkCount}</p>
              <p className="text-[10px] text-white/40">Network</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <Gift className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-lg font-bold text-white">RM {cashbackEarnings.toFixed(2)}</p>
              <p className="text-[10px] text-white/40">Cashback</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <Banknote className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-lg font-bold text-white">RM {commissionEarnings.toFixed(2)}</p>
              <p className="text-[10px] text-white/40">Commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Link */}
        <Card className="mt-4 border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate("/analytics")}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Spending Analytics</p>
                <p className="text-[10px] text-white/40">View charts & spending breakdown</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30" />
          </CardContent>
        </Card>

        <Card className="mt-4 border-secondary/20 bg-secondary/10">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-white/50">Your Referral Code</p>
              <p className="font-display text-lg font-bold tracking-wider text-secondary">{profile?.referral_code || "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={shareReferralCode} className="gap-1.5 border-secondary/30 text-secondary hover:bg-secondary hover:text-primary">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </CardContent>
        </Card>

        {/* Merchant CTA */}
        <Card className="mt-4 border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate(isMerchant ? "/merchant" : "/merchant/register")}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                <Store className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{isMerchant ? "Merchant Dashboard" : "Become a Merchant"}</p>
                <p className="text-[10px] text-white/40">{isMerchant ? "Manage your business and orders" : "Start accepting payments for your business"}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30" />
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Recent Activity</h2>
            {transactions.length > 0 &&
              <button onClick={() => navigate("/transactions")} className="flex items-center gap-0.5 text-xs text-secondary font-medium">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            }
          </div>

          {transactions.length === 0 ?
            <Card className="mt-3 border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
                <Wallet className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="mt-1 text-xs">Your activity will appear here</p>
              </CardContent>
            </Card> :
            <div className="mt-3 space-y-2">
              {transactions.map((tx) =>
                <Card key={tx.id} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSelectedTx(tx)}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                      {transactionIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.description || transactionLabel(tx.type)}</p>
                      <p className="text-[10px] text-white/40">
                        {new Date(tx.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        {new Date(tx.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${isCredit(tx.type) ? "text-secondary" : "text-white"}`}>
                      {isCredit(tx.type) ? "+" : "-"}RM {Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          }
        </div>
      </div>

      <TransactionDetail
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => { if (!open) setSelectedTx(null); }}
      />

      <BottomNav />
    </div>
  );
};

export default Dashboard;
