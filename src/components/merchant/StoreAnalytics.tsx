import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, ShoppingBag, TrendingUp, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

interface StoreAnalyticsProps {
  storeId: string;
}

export default function StoreAnalytics({ storeId }: StoreAnalyticsProps) {
  const [views, setViews] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [viewsRes, ordersRes] = await Promise.all([
        supabase
          .from("marketplace_product_views")
          .select("product_id, viewed_at")
          .eq("store_id", storeId)
          .gte("viewed_at", since.toISOString()),
        supabase
          .from("marketplace_orders")
          .select("id, total_amount, status, created_at, buyer_user_id")
          .eq("store_id", storeId)
          .gte("created_at", since.toISOString()),
      ]);

      setViews(viewsRes.data || []);
      const fetchedOrders = ordersRes.data || [];
      setOrders(fetchedOrders);

      if (fetchedOrders.length > 0) {
        const { data: items } = await supabase
          .from("marketplace_order_items")
          .select("product_name, product_id, quantity, subtotal, order_id")
          .in("order_id", fetchedOrders.map((o: any) => o.id));
        setOrderItems(items || []);
      }

      setLoading(false);
    };
    fetch();
  }, [storeId]);

  const totalViews = views.length;
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : "0";

  const dailyViews = useMemo(() => {
    const map: Record<string, number> = {};
    views.forEach((v) => {
      const day = new Date(v.viewed_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([day, count]) => ({ day, views: count }));
  }, [views]);

  const topViewed = useMemo(() => {
    const map: Record<string, number> = {};
    views.forEach((v) => { map[v.product_id] = (map[v.product_id] || 0) + 1; });

    // Cross-reference with order items for names
    const nameMap: Record<string, string> = {};
    orderItems.forEach((i) => { nameMap[i.product_id] = i.product_name; });

    return Object.entries(map)
      .map(([id, count]) => ({ id, name: nameMap[id] || id.slice(0, 8), views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [views, orderItems]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">Store Analytics (Last 30 Days)</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <Eye className="h-4 w-4 mx-auto text-blue-400 mb-1" />
            <p className="font-display text-lg font-bold text-foreground">{totalViews}</p>
            <p className="text-[10px] text-muted-foreground">Product Views</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <ShoppingBag className="h-4 w-4 mx-auto text-green-400 mb-1" />
            <p className="font-display text-lg font-bold text-foreground">{totalOrders}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-secondary mb-1" />
            <p className="font-display text-lg font-bold text-foreground">RM {totalRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 mx-auto text-purple-400 mb-1" />
            <p className="font-display text-lg font-bold text-foreground">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground">Conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Views Chart */}
      {dailyViews.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Daily Views</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={dailyViews}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="views" stroke="hsl(200, 80%, 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Viewed Products */}
      {topViewed.length > 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Top Viewed Products</p>
            <ResponsiveContainer width="100%" height={Math.max(100, topViewed.length * 32)}>
              <BarChart data={topViewed} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: "hsl(160, 30%, 10%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="views" fill="hsl(200, 80%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
