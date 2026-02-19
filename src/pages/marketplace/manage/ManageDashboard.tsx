import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Store, Package, ShoppingBag, Settings, Users, Plus, ExternalLink, BarChart3, Clock } from "lucide-react";

interface MarketplaceStore {
  id: string;
  store_name: string;
  slug: string;
  status: string;
  theme: string;
  primary_color: string;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

export default function ManageDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Check merchant role
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "merchant");
      if (!roles || roles.length === 0) { setLoading(false); return; }
      setIsMerchant(true);

      // Get store
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("*")
        .eq("merchant_user_id", user.id)
        .single();

      if (!storeData) { setLoading(false); return; }
      setStore(storeData as MarketplaceStore);

      // Stats
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from("marketplace_orders").select("id, status, total_amount, payment_status").eq("store_id", storeData.id),
        supabase.from("marketplace_products").select("id").eq("store_id", storeData.id),
      ]);

      if (orders) {
        const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => o.status === "pending" && o.payment_status === "paid").length,
          totalRevenue: paidOrders.reduce((s: number, o: any) => s + Number(o.total_amount), 0),
          totalProducts: products?.length ?? 0,
        });
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background max-w-xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!isMerchant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Store className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="font-medium text-foreground">Merchant access required</p>
        <Button variant="outline" onClick={() => navigate("/merchant")}>Go to Merchant Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/merchant")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display flex-1">Marketplace Manager</span>
          {store && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.open(`/marketplace/${store.slug}`, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> View Store
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {!store ? (
          /* No store yet — create wizard */
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-12 gap-4">
              <Store className="h-12 w-12 text-muted-foreground opacity-40" />
              <div className="text-center">
                <p className="font-bold text-foreground">No Marketplace Store Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your online store to start selling</p>
              </div>
              <Button onClick={() => navigate("/marketplace/manage/settings")} className="gap-2">
                <Plus className="h-4 w-4" /> Create My Store
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Store status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: store.primary_color + "22" }}>
                      <Store className="h-5 w-5" style={{ color: store.primary_color }} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{store.store_name}</p>
                      <p className="text-xs text-muted-foreground">/marketplace/{store.slug}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      store.status === "live" ? "border-green-500/50 text-green-600 bg-green-500/10" :
                      store.status === "paused" ? "border-yellow-500/50 text-yellow-600 bg-yellow-500/10" :
                      "border-muted text-muted-foreground"
                    }`}
                  >
                    {store.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">RM {stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-[11px] text-muted-foreground">Total Revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ShoppingBag className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{stats.totalOrders}</p>
                  <p className="text-[11px] text-muted-foreground">Total Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                  <p className="text-xl font-bold text-foreground">{stats.pendingOrders}</p>
                  <p className="text-[11px] text-muted-foreground">Pending Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{stats.totalProducts}</p>
                  <p className="text-[11px] text-muted-foreground">Products</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick links */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Manage</p>
              {[
                { icon: Package, label: "Products", sub: "Add & manage your product catalog", path: "/marketplace/manage/products" },
                { icon: ShoppingBag, label: "Orders", sub: "View and process customer orders", path: "/marketplace/manage/orders" },
                { icon: Settings, label: "Store Settings", sub: "Theme, logo, shipping rates", path: "/marketplace/manage/settings" },
                { icon: Users, label: "Team", sub: "Invite managers to help you", path: "/marketplace/manage/team" },
              ].map(({ icon: Icon, label, sub, path }) => (
                <Card key={path} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(path)}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
