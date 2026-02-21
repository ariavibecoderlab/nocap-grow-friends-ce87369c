import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, RefreshCw } from "lucide-react";
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

  return (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/10 to-secondary/5 mb-4">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
            <span className="text-sm font-medium text-white/70">Platform Wallet</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-secondary tabular-nums">
              {isLoading ? "..." : `RM ${(wallet?.balance ?? 0).toFixed(2)}`}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">
              {wallet?.updated_at
                ? `Updated ${new Date(wallet.updated_at).toLocaleString("en-MY")}`
                : "No fees collected yet"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-secondary/80">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">Today</span>
            </div>
            <p className="text-sm font-semibold text-white tabular-nums">
              RM {(todayFees ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminWalletCard;
