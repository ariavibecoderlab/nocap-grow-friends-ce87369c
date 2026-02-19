import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  store_id: string;
  marketplace_stores?: { store_name: string; slug: string; primary_color: string };
}

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("marketplace_orders")
        .select("*, marketplace_stores(store_name, slug, primary_color)")
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display">My Orders</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 opacity-30" />
            <p className="font-medium">No orders yet</p>
            <Button variant="outline" onClick={() => navigate("/marketplace")}>Browse Marketplace</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const store = order.marketplace_stores;
              return (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => store && navigate(`/marketplace/${store.slug}/order/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">#{order.order_number}</p>
                          {store && <p className="text-xs text-muted-foreground">{store.store_name}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="font-bold text-foreground text-sm">RM {Number(order.total_amount).toFixed(2)}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
