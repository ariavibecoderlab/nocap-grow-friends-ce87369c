import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, TrendingUp, TrendingDown, ShoppingCart, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import RevenueForecast from "./RevenueForecast";

interface Props { storeId: string; }

const MerchantSalesReports = ({ storeId }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => { loadData(); }, [storeId, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_orders")
      .select("id, total_amount, subtotal, shipping_fee, platform_fee, status, created_at, buyer_user_id, buyer_name")
      .eq("store_id", storeId)
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`)
      .order("created_at", { ascending: true });
    setOrders(data || []);
    setLoading(false);
  };

  const completed = orders.filter(o => ["delivered", "completed"].includes(o.status));
  const totalRevenue = completed.reduce((s, o) => s + Number(o.subtotal), 0);
  const totalOrders = completed.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(completed.map(o => o.buyer_user_id || o.buyer_name)).size;

  // Daily revenue chart
  const dailyMap = new Map<string, number>();
  completed.forEach(o => {
    const day = o.created_at.split("T")[0];
    dailyMap.set(day, (dailyMap.get(day) || 0) + Number(o.subtotal));
  });
  const dailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date: date.slice(5), revenue: Math.round(revenue * 100) / 100 }));

  // Order count by status
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // Top customers
  const customerMap = new Map<string, { name: string; total: number; count: number }>();
  completed.forEach(o => {
    const key = o.buyer_user_id || o.buyer_name;
    const existing = customerMap.get(key) || { name: o.buyer_name, total: 0, count: 0 };
    existing.total += Number(o.subtotal);
    existing.count += 1;
    customerMap.set(key, existing);
  });
  const topCustomers = Array.from(customerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const exportCsv = () => {
    const header = "Date,Order ID,Status,Buyer,Subtotal,Shipping,Platform Fee,Total\n";
    const rows = orders.map(o =>
      `${o.created_at.split("T")[0]},${o.id},${o.status},${o.buyer_name},${o.subtotal},${o.shipping_fee},${o.platform_fee},${o.total_amount}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <p className="text-[10px] text-white/40 mb-1">From</p>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs border-white/10 bg-white/5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-white/40 mb-1">To</p>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs border-white/10 bg-white/5 text-white" />
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} className="h-8 border-white/10 text-white/60 hover:bg-white/10">
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Revenue", value: `RM ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
          { label: "Orders", value: totalOrders, icon: ShoppingCart, color: "text-blue-400" },
          { label: "Avg Order", value: `RM ${avgOrderValue.toFixed(2)}`, icon: TrendingUp, color: "text-secondary" },
          { label: "Customers", value: uniqueCustomers, icon: Users, color: "text-purple-400" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <kpi.icon className={`mx-auto h-4 w-4 ${kpi.color}`} />
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-white/40">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      {dailyData.length > 1 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-white mb-2">Daily Revenue</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} width={50} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }} />
                <Line type="monotone" dataKey="revenue" stroke="#FFC800" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue Forecast */}
      <RevenueForecast dailyData={dailyData} />

      {/* Order status breakdown */}
      {statusData.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-white mb-2">Order Status Breakdown</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusData}>
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} width={30} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }} />
                <Bar dataKey="count" fill="#FFC800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top customers */}
      {topCustomers.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-white mb-2">Top Customers</p>
            <div className="space-y-1.5">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white/30 w-4">{i + 1}.</span>
                    <span className="text-white truncate">{c.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/10 text-white/40">{c.count} orders</Badge>
                  </div>
                  <span className="text-secondary font-semibold shrink-0">RM {c.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchantSalesReports;
