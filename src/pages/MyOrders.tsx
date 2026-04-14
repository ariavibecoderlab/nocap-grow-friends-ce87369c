import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import OrderStatusBadge from "@/components/marketplace/OrderStatusBadge";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Package, ShoppingCart } from "lucide-react";
import PushNotificationToggle from "@/components/PushNotificationToggle";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  store_id: string;
}

interface StoreMap {
  [key: string]: { store_name: string; logo_url: string | null };
}

const MyOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: orderData } = await supabase
        .from("marketplace_orders")
        .select("id, order_number, status, total_amount, created_at, store_id")
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false });

      const orderList = (orderData as OrderRow[]) || [];
      setOrders(orderList);

      if (orderList.length > 0) {
        const storeIds = [...new Set(orderList.map(o => o.store_id))];
        const { data: storeData } = await supabase
          .from("marketplace_stores")
          .select("id, store_name, logo_url")
          .in("id", storeIds);
        if (storeData) {
          const map: StoreMap = {};
          storeData.forEach(s => { map[s.id] = { store_name: s.store_name, logo_url: s.logo_url }; });
          setStores(map);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-white">My Orders</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        <PushNotificationToggle />
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-white/40">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No orders yet</p>
            <p className="text-xs mt-1">Your purchases will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => {
              const store = stores[order.store_id];
              return (
                <Card
                  key={order.id}
                  className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {store?.logo_url ? (
                      <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{store?.store_name || "Store"}</p>
                      <p className="text-[10px] text-white/40">#{order.order_number} · {new Date(order.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">RM {order.total_amount.toFixed(2)}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MyOrders;
