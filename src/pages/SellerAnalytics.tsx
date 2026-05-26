import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  TrendingUp,
  ShoppingCart,
  Package,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays, startOfWeek, subWeeks } from "date-fns";
import { formatRM } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Store {
  id: string;
  store_name: string;
}

type DateRange = "today" | "7d" | "30d" | "90d";

interface KpiData {
  revenue: number;
  orderCount: number;
  aov: number;
  unitsSold: number;
}

interface RevenuePoint {
  label: string;
  revenue: number;
}

interface TopProduct {
  product_name: string;
  units: number;
  revenue: number;
}

interface StatusCount {
  status: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFromDate(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
    case "90d":
      return subDays(now, 90);
  }
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Today",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  paid: "bg-blue-500/20 text-blue-400",
  processing: "bg-purple-500/20 text-purple-400",
  shipped: "bg-sky-500/20 text-sky-400",
  delivered: "bg-green-500/20 text-green-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-orange-500/20 text-orange-400",
};

// ─── Custom chart tooltip ──────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-primary/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="tabular-nums">
          Revenue: {formatRM(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SellerAnalytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [kpi, setKpi] = useState<KpiData>({
    revenue: 0,
    orderCount: 0,
    aov: 0,
    unitsSold: 0,
  });
  const [revenuePoints, setRevenuePoints] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // ── Load stores ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingStores(true);
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, store_name")
        .eq("merchant_user_id", user.id)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setStores(data as Store[]);
        setSelectedStoreId(data[0].id);
      } else if (data && data.length === 0) {
        // No stores — redirect to register
        navigate("/merchant/register");
      }
      setLoadingStores(false);
    };
    load();
  }, [user, navigate]);

  // ── Load analytics data ──
  const loadAnalytics = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoadingData(true);

    const fromDate = getFromDate(dateRange).toISOString();

    // KPI: orders + revenue
    const { data: ordersData } = await supabase
      .from("marketplace_orders")
      .select("id, total_amount, status, created_at")
      .eq("store_id", selectedStoreId)
      .neq("status", "cancelled")
      .gte("created_at", fromDate);

    const orders = (ordersData ?? []) as Array<{
      id: string;
      total_amount: number | string;
      status: string;
      created_at: string;
    }>;

    const orderCount = orders.length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    // KPI: units sold
    const { data: itemsData } = await supabase
      .from("marketplace_order_items")
      .select("quantity, order_id")
      .in(
        "order_id",
        orders.map((o) => o.id)
      );

    const unitsSold = (itemsData ?? []).reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    setKpi({ revenue, orderCount, aov, unitsSold });

    // ── Revenue over time ──
    const points = buildRevenuePoints(orders, dateRange);
    setRevenuePoints(points);

    // ── Status breakdown ──
    const statusMap: Record<string, number> = {};
    for (const o of orders) {
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }
    // Also include cancelled orders for status view
    const { data: cancelledData } = await supabase
      .from("marketplace_orders")
      .select("status")
      .eq("store_id", selectedStoreId)
      .eq("status", "cancelled")
      .gte("created_at", fromDate);
    for (const o of cancelledData ?? []) {
      statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }
    setStatusCounts(
      Object.entries(statusMap)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
    );

    // ── Top products ──
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: topData } = await supabase
        .from("marketplace_order_items")
        .select("product_name, quantity, subtotal")
        .in("order_id", orderIds);

      if (topData) {
        const agg: Record<string, { units: number; revenue: number }> = {};
        for (const item of topData as Array<{
          product_name: string;
          quantity: number;
          subtotal: number;
        }>) {
          if (!agg[item.product_name]) {
            agg[item.product_name] = { units: 0, revenue: 0 };
          }
          agg[item.product_name].units += Number(item.quantity);
          agg[item.product_name].revenue += Number(item.subtotal);
        }
        const sorted = Object.entries(agg)
          .map(([product_name, v]) => ({ product_name, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
        setTopProducts(sorted);
      }
    } else {
      setTopProducts([]);
    }

    setLoadingData(false);
  }, [selectedStoreId, dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ── Build chart data ──
  const chartData = useMemo(() => revenuePoints, [revenuePoints]);

  if (authLoading || loadingStores) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-primary border-b border-white/10 px-4 py-3">
        <div className="mx-auto max-w-5xl">
          {/* Row 1: back + title + store selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-1 hover:bg-white/10 transition-colors text-white shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-white flex-1">
              Analytics
            </h1>
            {stores.length > 1 && (
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger className="w-44 border-white/10 bg-white/5 text-white text-sm h-8">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10 text-white">
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {stores.length === 1 && (
              <span className="text-sm text-white/50 truncate max-w-[140px]">
                {selectedStore?.store_name}
              </span>
            )}
          </div>
          {/* Row 2: date range pills */}
          <div className="flex items-center gap-2 mt-2">
            {(["today", "7d", "30d", "90d"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  dateRange === r
                    ? "bg-secondary text-primary"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                }`}
              >
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-4 space-y-4">
        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                icon={<TrendingUp className="h-4 w-4 text-secondary" />}
                label="Total Revenue"
                value={formatRM(kpi.revenue)}
              />
              <KpiCard
                icon={<ShoppingCart className="h-4 w-4 text-secondary" />}
                label="Total Orders"
                value={kpi.orderCount.toString()}
              />
              <KpiCard
                icon={<BarChart3 className="h-4 w-4 text-secondary" />}
                label="Avg Order Value"
                value={formatRM(kpi.aov)}
              />
              <KpiCard
                icon={<Package className="h-4 w-4 text-secondary" />}
                label="Units Sold"
                value={kpi.unitsSold.toLocaleString()}
              />
            </div>

            {/* ── Revenue Chart ── */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-secondary" />
                  Revenue Over Time
                </h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                        tickFormatter={(v: number) =>
                          `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                        }
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="hsl(48, 100%, 50%)"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-white/30 text-sm py-10">
                    No orders in this period
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Top Products ── */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-secondary" />
                  Top Products
                </h3>
                {topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/40 text-[11px] border-b border-white/10">
                          <th className="text-left pb-2 pr-3 font-medium w-8">
                            #
                          </th>
                          <th className="text-left pb-2 pr-3 font-medium">
                            Product
                          </th>
                          <th className="text-right pb-2 pr-3 font-medium">
                            Units
                          </th>
                          <th className="text-right pb-2 font-medium">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr
                            key={p.product_name}
                            className="border-b border-white/5 last:border-0"
                          >
                            <td className="py-2 pr-3 text-white/30 tabular-nums">
                              {i + 1}
                            </td>
                            <td className="py-2 pr-3 text-white font-medium max-w-[160px] truncate">
                              {p.product_name}
                            </td>
                            <td className="py-2 pr-3 text-white/70 tabular-nums text-right">
                              {p.units.toLocaleString()}
                            </td>
                            <td className="py-2 text-secondary tabular-nums text-right font-semibold">
                              {formatRM(p.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-white/30 text-sm py-8">
                    No product data in this period
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Order Status Breakdown ── */}
            {statusCounts.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-secondary" />
                    Order Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {statusCounts.map(({ status, count }) => (
                      <span
                        key={status}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[status] ?? "bg-white/10 text-white/60"
                        }`}
                      >
                        <span className="capitalize">{status}</span>
                        <span className="opacity-80 tabular-nums">{count}</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

// ─── KPI Card sub-component ───────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-4 text-center">
        <div className="flex justify-center mb-1">{icon}</div>
        <p className="font-display text-lg font-bold text-white tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Revenue bucketing ────────────────────────────────────────────────────────

function buildRevenuePoints(
  orders: Array<{ created_at: string; total_amount: number | string }>,
  range: DateRange
): RevenuePoint[] {
  if (range === "today" || range === "7d") {
    // Group by day
    const days = range === "today" ? 1 : 7;
    const buckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      buckets[format(d, "dd MMM")] = 0;
    }
    for (const o of orders) {
      const label = format(new Date(o.created_at), "dd MMM");
      if (label in buckets) {
        buckets[label] += Number(o.total_amount);
      }
    }
    return Object.entries(buckets).map(([label, revenue]) => ({
      label,
      revenue,
    }));
  } else {
    // Group by ISO week (Mon–Sun), show as "Week of dd MMM"
    const weeks = range === "30d" ? 5 : 14;
    const buckets: Record<string, number> = {};
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), {
        weekStartsOn: 1,
      });
      buckets[format(weekStart, "dd MMM")] = 0;
    }
    for (const o of orders) {
      const weekStart = startOfWeek(new Date(o.created_at), {
        weekStartsOn: 1,
      });
      const label = format(weekStart, "dd MMM");
      if (label in buckets) {
        buckets[label] += Number(o.total_amount);
      }
    }
    return Object.entries(buckets).map(([label, revenue]) => ({
      label,
      revenue,
    }));
  }
}

export default SellerAnalytics;
