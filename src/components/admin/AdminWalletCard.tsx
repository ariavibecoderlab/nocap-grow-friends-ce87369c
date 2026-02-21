import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

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

  const { data: weeklyData } = useQuery({
    queryKey: ["admin_weekly_fees", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .eq("user_id", user!.id)
        .eq("type", "commission")
        .eq("status", "completed")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Group by day
      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = 0;
      }
      data?.forEach((t) => {
        const key = new Date(t.created_at).toISOString().slice(0, 10);
        if (dayMap[key] !== undefined) dayMap[key] += Number(t.amount);
      });

      return Object.entries(dayMap).map(([date, total]) => ({
        day: new Date(date).toLocaleDateString("en-MY", { weekday: "short" }),
        total: Number(total.toFixed(2)),
      }));
    },
    enabled: !!user,
  });

  const balance = wallet?.balance ?? 0;
  const weekTotal = weeklyData?.reduce((s, d) => s + d.total, 0) ?? 0;

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
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1 text-secondary">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Today</span>
            </div>
            <span className="text-sm font-bold text-white tabular-nums">
              RM {(todayFees ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40">
            <span className="text-[10px]">7d total:</span>
            <span className="text-xs font-semibold text-white/70 tabular-nums">RM {weekTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Weekly sparkline */}
        {weeklyData && (
          <div className="h-14 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="adminFeeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(48, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
                  dy={2}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 10%)",
                    border: "1px solid hsl(48, 100%, 50%, 0.3)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "white",
                  }}
                  formatter={(value: number) => [`RM ${value.toFixed(2)}`, "Fees"]}
                  labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(48, 100%, 50%)"
                  strokeWidth={2}
                  fill="url(#adminFeeGradient)"
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(48, 100%, 50%)", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminWalletCard;
