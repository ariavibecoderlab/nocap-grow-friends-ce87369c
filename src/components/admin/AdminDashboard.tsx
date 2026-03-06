import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Store, Banknote, ArrowLeftRight, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AdminWalletCard from "@/components/admin/AdminWalletCard";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalUsers: number;
  totalMerchants: number;
  pendingMerchants: number;
  pendingWithdrawals: number;
  recentTransactions: number;
}

interface ActivityItem {
  id: string;
  type: "transaction" | "merchant" | "withdrawal" | "user";
  message: string;
  timestamp: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [usersRes, merchantsRes, withdrawalsRes, txRes, totalMerchantsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("merchant_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("transactions").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "merchant"),
    ]);

    setStats({
      totalUsers: usersRes.count ?? 0,
      totalMerchants: totalMerchantsRes.count ?? 0,
      pendingMerchants: merchantsRes.count ?? 0,
      pendingWithdrawals: withdrawalsRes.count ?? 0,
      recentTransactions: txRes.count ?? 0,
    });
    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);

    const [txRes, merchantRes, withdrawalRes, profileRes] = await Promise.all([
      supabase.from("transactions").select("id, type, amount, status, created_at, description").order("created_at", { ascending: false }).limit(5),
      supabase.from("merchant_applications").select("id, business_name, status, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("withdrawal_requests").select("id, amount, status, bank_name, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(3),
    ]);

    const items: ActivityItem[] = [];

    txRes.data?.forEach((tx) => {
      items.push({
        id: `tx-${tx.id}`,
        type: "transaction",
        message: `${tx.type.replace("_", " ")} of RM ${Number(tx.amount).toFixed(2)} — ${tx.status}`,
        timestamp: tx.created_at,
      });
    });

    merchantRes.data?.forEach((m) => {
      items.push({
        id: `merch-${m.id}`,
        type: "merchant",
        message: `Merchant "${m.business_name}" — ${m.status}`,
        timestamp: m.created_at,
      });
    });

    withdrawalRes.data?.forEach((w) => {
      items.push({
        id: `wd-${w.id}`,
        type: "withdrawal",
        message: `Withdrawal RM ${Number(w.amount).toFixed(2)} to ${w.bank_name} — ${w.status}`,
        timestamp: w.created_at,
      });
    });

    profileRes.data?.forEach((p) => {
      items.push({
        id: `user-${p.id}`,
        type: "user",
        message: `New user joined${p.full_name ? `: ${p.full_name}` : ""}`,
        timestamp: p.created_at,
      });
    });

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivity(items.slice(0, 10));
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    loadActivity();
  }, [loadStats, loadActivity]);

  const handleRefresh = () => {
    loadStats(true);
    loadActivity();
  };

  const activityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "transaction": return <ArrowLeftRight className="h-3.5 w-3.5 text-green-400" />;
      case "merchant": return <Store className="h-3.5 w-3.5 text-secondary" />;
      case "withdrawal": return <Banknote className="h-3.5 w-3.5 text-orange-400" />;
      case "user": return <Users className="h-3.5 w-3.5 text-blue-400" />;
    }
  };

  const cards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
    { title: "Total Merchants", value: stats?.totalMerchants, icon: Store, color: "text-purple-400" },
    { title: "Pending Merchants", value: stats?.pendingMerchants, icon: Store, color: "text-secondary", alert: true },
    { title: "Pending Withdrawals", value: stats?.pendingWithdrawals, icon: Banknote, color: "text-orange-400", alert: true },
    { title: "Total Transactions", value: stats?.recentTransactions, icon: ArrowLeftRight, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform overview and key metrics
            {lastRefreshed && (
              <span className="ml-2 text-muted-foreground/60">
                · Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2 border-border/50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <AdminWalletCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{card.value?.toLocaleString()}</span>
                  {card.alert && (card.value ?? 0) > 0 && (
                    <AlertTriangle className="h-4 w-4 text-secondary animate-pulse" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-20 shrink-0" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <span className="shrink-0">{activityIcon(item.type)}</span>
                  <span className="text-sm text-foreground truncate flex-1">{item.message}</span>
                  <span className="text-[11px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
