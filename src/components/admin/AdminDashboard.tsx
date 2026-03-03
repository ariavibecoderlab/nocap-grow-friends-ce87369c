import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Store, Banknote, ArrowLeftRight, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AdminWalletCard from "@/components/admin/AdminWalletCard";

interface Stats {
  totalUsers: number;
  pendingMerchants: number;
  pendingWithdrawals: number;
  recentTransactions: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usersRes, merchantsRes, withdrawalsRes, txRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("merchant_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count ?? 0,
        pendingMerchants: merchantsRes.count ?? 0,
        pendingWithdrawals: withdrawalsRes.count ?? 0,
        recentTransactions: txRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
    { title: "Pending Merchants", value: stats?.pendingMerchants, icon: Store, color: "text-secondary", alert: true },
    { title: "Pending Withdrawals", value: stats?.pendingWithdrawals, icon: Banknote, color: "text-orange-400", alert: true },
    { title: "Total Transactions", value: stats?.recentTransactions, icon: ArrowLeftRight, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview and key metrics</p>
      </div>

      <AdminWalletCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
};

export default AdminDashboard;
