import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, BarChart3, ShoppingBag, Users, Repeat } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
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
  "hsl(47, 100%, 50%)",
  "hsl(157, 72%, 40%)",
  "hsl(200, 80%, 50%)",
  "hsl(340, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 90%, 55%)",
];

const MerchantAnalytics = ({ userId, branches }: MerchantAnalyticsProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6months");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const months = period === "3months" ? 3 : period === "12months" ? 12 : 6;
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      // Get merchant's store IDs
      const { data: stores } = await supabase
        .from("marketplace_stores")
        .select("id")
        .eq("merchant_user_id", userId);
      const storeIds = (stores || []).map((s) => s.id);

      const txPromise = supabase
        .from("transactions")
        .select("amount, created_at, metadata, fee_amount, commission_amount")
        .eq("user_id", userId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      const txResult = await txPromise;
      setTransactions(txResult.data || []);

      if (storeIds.length > 0) {
        const ordersResult = await supabase
          .from("marketplace_orders")
          .select("id, buyer_user_id, total_amount, status, created_at, store_id")
          .in("store_id", storeIds)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false });

        const fetchedOrders = ordersResult.data || [];
        setOrders(fetchedOrders);

        if (fetchedOrders.length > 0) {
          const orderIds = fetchedOrders.map((o: any) => o.id);
          const itemsResult = await supabase
            .from("marketplace_order_items")
            .select("product_name, product_id, quantity, subtotal, order_id")
            .in("order_id", orderIds);
          setOrderItems(itemsResult.data || []);
        } else {
          setOrderItems([]);
        }
      } else {
        setOrders([]);
        setOrderItems([]);
      }
      setLoading(false);
    };
    fetchAll();
  }, [userId, period]);

  // --- Payment Analytics ---
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

  // --- Marketplace Analytics ---
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    orderItems.forEach((item) => {
      const key = item.product_id;
      if (!map[key]) map[key] = { name: item.product_name, qty: 0, revenue: 0 };
      map[key].qty += item.quantity;
      map[key].revenue += Number(item.subtotal);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orderItems]);

  const customerStats = useMemo(() => {
    const buyerMap: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.buyer_user_id) buyerMap[o.buyer_user_id] = (buyerMap[o.buyer_user_id] || 0) + 1;
    });
    const uniqueCustomers = Object.keys(buyerMap).length;
    const repeatCustomers = Object.values(buyerMap).filter((c) => c > 1).length;
    const orderStatusMap: Record<string, number> = {};
    orders.forEach((o) => { orderStatusMap[o.status] = (orderStatusMap[o.status] || 0) + 1; });
    return { uniqueCustomers, repeatCustomers, totalOrders: orders.length, statusBreakdown: orderStatusMap };
  }, [orders]);

  const conversionData = useMemo(() => {
    const total = orders.length;
    if (total === 0) return [];
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const pending = total - delivered - cancelled;
    return [
      { name: "Delivered", value: delivered },
      { name: "In Progress", value: pending },
      { name: "Cancelled", value: cancelled },
    ].filter((d) => d.value > 0);
  }, [orders]);

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalTxns = transactions.length;
  const avgTxn = totalTxns > 0 ? totalRevenue / totalTxns : 0;

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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Sales Analytics</p>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px] h-8 text-xs border-border/50 bg-card text-foreground">
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
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-foreground">RM {totalRevenue.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <p className="font-display text-lg font-bold text-foreground">{totalTxns}</p>
            <p className="text-[10px] text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="font-display text-lg font-bold text-foreground">RM {avgTxn.toFixed(0)}</p>
              {growth !== null && (
                growth >= 0 ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Avg Transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer & Orders Stats */}
      {(customerStats.totalOrders > 0 || orders.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <p className="font-display text-lg font-bold text-foreground">{customerStats.uniqueCustomers}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Unique Customers</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Repeat className="h-3.5 w-3.5 text-secondary" />
                <p className="font-display text-lg font-bold text-foreground">{customerStats.repeatCustomers}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Repeat Buyers</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ShoppingBag className="h-3.5 w-3.5 text-green-400" />
                <p className="font-display text-lg font-bold text-foreground">{customerStats.totalOrders}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Monthly Revenue</p>
          {monthlyData.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground/50">
              <BarChart3 className="h-8 w-8 mb-2" />
              <p className="text-xs">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`RM ${v.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(47, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Top Products</p>
            <ResponsiveContainer width="100%" height={Math.max(120, topProducts.length * 36)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [name === "revenue" ? `RM ${v.toFixed(2)}` : `${v} units`, name === "revenue" ? "Revenue" : "Qty"]}
                />
                <Bar dataKey="revenue" fill="hsl(47, 100%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">{p.name}</span>
                  <span className="text-foreground/60 mx-2">{p.qty} sold</span>
                  <span className="font-medium text-foreground">RM {p.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Conversion Funnel */}
      {conversionData.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Order Status Breakdown</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie data={conversionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                    {conversionData.map((_, i) => (
                      <Cell key={i} fill={[CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3]][i] || CHART_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {conversionData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: [CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3]][i] || CHART_COLORS[0] }} />
                    <span className="text-muted-foreground truncate flex-1">{d.name}</span>
                    <span className="text-foreground font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 30-Day Trend */}
      {dailyTrend.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Last 30 Days Trend</p>
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
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Revenue by Branch</p>
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
                    <span className="text-muted-foreground truncate flex-1">{b.name}</span>
                    <span className="text-foreground font-medium">RM {b.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MoM Growth */}
      {growth !== null && (
        <Card className="border-border/50 bg-card">
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
              <p className="text-sm font-semibold text-foreground">
                {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% MoM
              </p>
              <p className="text-[10px] text-muted-foreground">Compared to previous month</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantAnalytics;
