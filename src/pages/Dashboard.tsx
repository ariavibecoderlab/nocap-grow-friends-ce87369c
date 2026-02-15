import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Wallet, QrCode, ArrowUpDown, Users, Plus, Eye, EyeOff } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [showBalance, setShowBalance] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; referral_code: string } | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [walletRes, profileRes, referralRes] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name, referral_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("referral_tree").select("id").eq("ancestor_id", user.id).eq("tier", 1),
      ]);

      if (walletRes.data) setBalance(Number(walletRes.data.balance));
      if (profileRes.data) setProfile(profileRes.data);
      if (referralRes.data) setReferralCount(referralRes.data.length);
    };

    fetchData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const quickActions = [
    { label: "QR Pay", icon: QrCode, path: "/qr-pay", color: "bg-primary/10 text-primary" },
    { label: "Top Up", icon: Plus, path: "/top-up", color: "bg-accent/10 text-accent" },
    { label: "Transfer", icon: ArrowUpDown, path: "/transfer", color: "bg-info/10 text-info" },
    { label: "Referral", icon: Users, path: "/referral", color: "bg-success/10 text-success" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-12 pt-8 text-primary-foreground">
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
        <Card className="-mt-8 border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span>Wallet Balance</span>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground">
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 font-display text-3xl font-bold">
              {showBalance ? `RM ${balance.toFixed(2)}` : "RM ••••••"}
            </p>
            <Button size="sm" className="mt-3" onClick={() => navigate("/top-up")}>
              <Plus className="mr-1 h-4 w-4" /> Top Up
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-muted"
            >
              <div className={`rounded-full p-3 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Direct Referrals</p>
              <p className="mt-1 font-display text-2xl font-bold">{referralCount}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Your Code</p>
              <p className="mt-1 font-display text-lg font-bold text-primary">{profile?.referral_code || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions placeholder */}
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
          <Card className="mt-3 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No transactions yet</p>
              <p className="mt-1 text-xs">Your activity will appear here</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
