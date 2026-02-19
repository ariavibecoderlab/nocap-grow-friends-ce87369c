import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Package, Truck, Home, Clock, ArrowLeft, ShoppingBag } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  shipping_address: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered", "completed"];
const STEP_ICONS = [Clock, CheckCircle2, Package, Truck, Home, CheckCircle2];

export default function OrderConfirmation() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [storeColor, setStoreColor] = useState("#FFD700");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !slug) return;
    const fetchOrder = async () => {
      const { data: storeData } = await supabase.from("marketplace_stores").select("primary_color").eq("slug", slug).single();
      if (storeData) setStoreColor(storeData.primary_color);

      const { data: orderData } = await supabase
        .from("marketplace_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!orderData) { navigate("/marketplace"); return; }
      setOrder(orderData as Order);

      const { data: itemData } = await supabase
        .from("marketplace_order_items")
        .select("*")
        .eq("order_id", orderId);
      setItems((itemData as OrderItem[]) || []);
      setLoading(false);
    };
    fetchOrder();

    // Realtime status updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "marketplace_orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as Order))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) return null;
  const pc = storeColor;
  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/marketplace/${slug}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display">Order Confirmation</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Success banner */}
        {order.payment_status === "paid" && (
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Payment Successful!</p>
                <p className="text-xs text-muted-foreground">Your order has been placed. Order #{order.order_number}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {order.payment_status === "pending" && (
          <Card className="border-yellow-500/30 bg-yellow-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-8 w-8 text-yellow-500 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Payment Pending</p>
                <p className="text-xs text-muted-foreground">Please complete your payment. Order #{order.order_number}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status tracker */}
        {order.payment_status === "paid" && !["cancelled", "refunded"].includes(order.status) && (
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm text-foreground mb-4">Order Status</p>
              <div className="flex items-center justify-between">
                {STATUS_STEPS.filter((s) => !["cancelled", "refunded"].includes(s)).map((step, i) => {
                  const Icon = STEP_ICONS[i];
                  const done = i <= currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${done ? "text-black" : "bg-muted text-muted-foreground"}`}
                        style={done ? { backgroundColor: pc } : {}}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className={`text-[9px] text-center capitalize ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        {step}
                      </p>
                      {i < STATUS_STEPS.length - 2 && (
                        <div className="absolute" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking number */}
        {order.tracking_number && (
          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <Truck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tracking Number</p>
                <p className="font-mono font-bold text-foreground">{order.tracking_number}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order details */}
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm text-foreground mb-3">Order Details</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image && (
                    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">×{item.quantity} @ RM {item.unit_price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">RM {item.subtotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>RM {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span><span>{order.shipping_fee === 0 ? "Free" : `RM ${order.shipping_fee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Total</span><span>RM {order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="font-semibold text-foreground">Delivery To</p>
            <p className="text-foreground">{order.buyer_name}</p>
            <p className="text-muted-foreground">{order.buyer_phone}</p>
            <p className="text-muted-foreground">{order.buyer_email}</p>
            <p className="text-muted-foreground text-xs">{order.shipping_address}</p>
            {order.notes && <p className="text-muted-foreground text-xs italic">Note: {order.notes}</p>}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/marketplace/${slug}`)}>
            Continue Shopping
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate("/marketplace/my-orders")}>
            <ShoppingBag className="h-4 w-4 mr-1.5" /> My Orders
          </Button>
        </div>
      </div>
    </div>
  );
}
