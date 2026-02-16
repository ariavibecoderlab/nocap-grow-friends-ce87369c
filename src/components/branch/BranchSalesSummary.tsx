import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface BranchSalesSummaryProps {
  branchId: string;
  merchantUserId: string;
}

const BranchSalesSummary = ({ branchId, merchantUserId }: BranchSalesSummaryProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .eq("user_id", merchantUserId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      // Filter by branch
      const filtered = (data || []).filter((t) => {
        const meta = (t as any).metadata;
        return meta?.branch_id === branchId;
      });
      setTransactions(filtered);
      setLoading(false);
    };
    // We need metadata for filtering
    const fetchWithMeta = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at, metadata")
        .eq("user_id", merchantUserId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      const filtered = (data || []).filter((t) => {
        const meta = t.metadata as Record<string, unknown> | null;
        return meta?.branch_id === branchId;
      });
      setTransactions(filtered);
      setLoading(false);
    };
    fetchWithMeta();
  }, [branchId, merchantUserId]);

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const todaySales = transactions
    .filter((t) => t.created_at.startsWith(today))
    .reduce((s, t) => s + Number(t.amount), 0);
  const todayCount = transactions.filter((t) => t.created_at.startsWith(today)).length;

  const yesterdaySales = transactions
    .filter((t) => t.created_at.startsWith(yesterday))
    .reduce((s, t) => s + Number(t.amount), 0);

  const growthPercent = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : null;

  const weeklyData = useMemo(() => {
    const map: Record<string, number> = {};
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    transactions
      .filter((t) => new Date(t.created_at) >= last7)
      .forEach((t) => {
        const key = new Date(t.created_at).toLocaleDateString("en-MY", { weekday: "short" });
        map[key] = (map[key] || 0) + Number(t.amount);
      });
    return Object.entries(map).map(([day, sales]) => ({ day, sales }));
  }, [transactions]);

  const totalMonth = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalCount = transactions.length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-white">Daily Summary</p>

      {/* Today's Stats */}
      <Card className="border-secondary/20 bg-secondary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40">Today's Sales</p>
              <p className="font-display text-2xl font-bold text-white">RM {todaySales.toFixed(2)}</p>
              <p className="text-[10px] text-white/40">{todayCount} transaction{todayCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              {growthPercent !== null ? (
                <div className="flex items-center gap-1">
                  {growthPercent > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : growthPercent < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Minus className="h-4 w-4 text-white/40" />
                  )}
                  <span className={`text-sm font-semibold ${growthPercent > 0 ? "text-green-400" : growthPercent < 0 ? "text-red-400" : "text-white/40"}`}>
                    {growthPercent > 0 ? "+" : ""}{growthPercent.toFixed(0)}%
                  </span>
                </div>
              ) : (
                <span className="text-xs text-white/30">No data yesterday</span>
              )}
              <p className="text-[10px] text-white/40 mt-0.5">vs yesterday</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-white">RM {totalMonth.toFixed(0)}</p>
            <p className="text-[10px] text-white/40">Last 30 Days</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-white">{totalCount}</p>
            <p className="text-[10px] text-white/40">Total Transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Chart */}
      {weeklyData.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-white/70 mb-3">This Week</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`RM ${v.toFixed(2)}`, "Sales"]}
                />
                <Bar dataKey="sales" fill="hsl(47, 100%, 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BranchSalesSummary;
