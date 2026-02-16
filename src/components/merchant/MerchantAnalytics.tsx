import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

interface Branch {
  id: string;
  branch_name: string;
}

interface MerchantAnalyticsProps {
  userId: string;
  branches: Branch[];
}

const CHART_COLORS = [
  "hsl(47, 100%, 50%)",  // secondary/gold
  "hsl(157, 72%, 40%)",  // green
  "hsl(200, 80%, 50%)",  // blue
  "hsl(340, 80%, 55%)",  // pink
  "hsl(280, 60%, 55%)",  // purple
  "hsl(30, 90%, 55%)",   // orange
];

const MerchantAnalytics = ({ userId, branches }: MerchantAnalyticsProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const months = period === "3months" ? 3 : period === "12months" ? 12 : 6;
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data } = await supabase
        .from("transactions")
        .select("amount, created_at, metadata, fee_amount, commission_amount")
        .eq("user_id", userId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId, period]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; revenue: number; fees: number; count: number }> = {};
    transactions.forEach((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: label, revenue: 0, fees: 0, count: 0 };
      map[key].revenue += Number(t.amount);
      map[key].fees += Number(t.fee_amount || 0) + Number(t.commission_amount || 0);
      map[key].count += 1;
    });
    return Object.values(map);
  }, [transactions]);

  const branchBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      const meta = t.metadata as Record<string, unknown> | null;
      const branchId = meta?.branch_id as string | undefined;
      const branch = branches.find((b) => b.id === branchId);
      const name = branch?.branch_name || "Unassigned";
      map[name] = (map[name] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [transactions, branches]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    transactions
      .filter((t) => new Date(t.created_at) >= last30)
      .forEach((t) => {
        const key = new Date(t.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
        map[key] = (map[key] || 0) + Number(t.amount);
      });
    return Object.entries(map).map(([day, revenue]) => ({ day, revenue }));
  }, [transactions]);

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalTxns = transactions.length;
  const avgTxn = totalTxns > 0 ? totalRevenue / totalTxns : 0;

  // Month-over-month growth
  const growth = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const curr = monthlyData[monthlyData.length - 1].revenue;
    const prev = monthlyData[monthlyData.length - 2].revenue;
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Sales Analytics</p>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px] h-8 text-xs border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">3 Months</SelectItem>
            <SelectItem value="6months">6 Months</SelectItem>
            <SelectItem value="12months">12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-white">RM {totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-white/40">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-white">{totalTxns}</p>
            <p className="text-[10px] text-white/40">Transactions</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="font-display text-lg font-bold text-white">RM {avgTxn.toFixed(0)}</p>
              {growth !== null && (
                growth >= 0 ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />
              )}
            </div>
            <p className="text-[10px] text-white/40">Avg Transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-white/70 mb-3">Monthly Revenue</p>
          {monthlyData.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-white/30">
              <BarChart3 className="h-8 w-8 mb-2" />
              <p className="text-xs">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  itemStyle={{ color: "hsl(47, 100%, 50%)" }}
                  formatter={(v: number) => [`RM ${v.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(47, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 30-Day Trend */}
      {dailyTrend.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-white/70 mb-3">Last 30 Days Trend</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`RM ${v.toFixed(2)}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(157, 72%, 40%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Branch Breakdown Pie */}
      {branchBreakdown.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-white/70 mb-3">Revenue by Branch</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie data={branchBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                    {branchBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`RM ${v.toFixed(2)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {branchBreakdown.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-white/60 truncate flex-1">{b.name}</span>
                    <span className="text-white font-medium">RM {b.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month-over-Month Growth */}
      {growth !== null && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            {growth >= 0 ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% MoM
              </p>
              <p className="text-[10px] text-white/40">Compared to previous month</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantAnalytics;
