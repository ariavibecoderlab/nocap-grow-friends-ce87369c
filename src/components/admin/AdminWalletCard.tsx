import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminWalletCard = () => {
  const { user } = useAuth();

  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ["admin_wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, updated_at")
        .eq("user_id", user!.id)
        .eq("wallet_type", "admin")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: todayFees } = useQuery({
    queryKey: ["admin_today_fees", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("type", "commission")
        .eq("status", "completed")
        .gte("created_at", today.toISOString());
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    },
    enabled: !!user,
  });

  const balance = wallet?.balance ?? 0;

  return (
    <Card className="relative overflow-hidden border-secondary/30 bg-primary mb-4">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
      
      <CardContent className="relative py-5 px-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30">
              <Wallet className="h-4.5 w-4.5 text-secondary" />
            </div>
            <div>
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Platform Wallet</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-white/30 hover:text-secondary hover:bg-secondary/10 transition-colors"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Balance */}
        <div className="mb-4">
          <p className="text-3xl font-bold text-secondary tabular-nums tracking-tight">
            {isLoading ? (
              <span className="inline-block w-32 h-8 bg-secondary/10 rounded animate-pulse" />
            ) : (
              <>RM {balance.toFixed(2)}</>
            )}
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            {wallet?.updated_at
              ? `Last updated ${new Date(wallet.updated_at).toLocaleString("en-MY")}`
              : "No fees collected yet"}
          </p>
        </div>

        {/* Today's earnings pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1 text-secondary">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Today</span>
            </div>
            <span className="text-sm font-bold text-white tabular-nums">
              RM {(todayFees ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminWalletCard;
