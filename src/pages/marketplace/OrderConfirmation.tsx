import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Package, Truck, Home, Clock, ArrowLeft, ShoppingBag, Wifi } from "lucide-react";

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
  const [storeColor, setStoreColor] = useState("hsl(var(--primary))");
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const [statusJustChanged, setStatusJustChanged] = useState(false);

  // ── Initial data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !slug) return;

    const fetchOrder = async () => {
      const [{ data: storeData }, { data: orderData }] = await Promise.all([
        supabase.from("marketplace_stores").select("primary_color").eq("slug", slug).single(),
        supabase.from("marketplace_orders").select("*").eq("id", orderId).single(),
      ]);

      if (storeData?.primary_color) setStoreColor(storeData.primary_color);
      if (!orderData) { navigate("/marketplace"); return; }
      setOrder(orderData as Order);
      prevStatusRef.current = (orderData as Order).status;

      const { data: itemData } = await supabase
        .from("marketplace_order_items")
        .select("*")
        .eq("order_id", orderId);
      setItems((itemData as OrderItem[]) || []);
      setLoading(false);
    };

    fetchOrder();
  }, [orderId, slug, navigate]);

  // ── Realtime subscription (separate effect for clean lifecycle) ─────────
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "marketplace_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrder(updated);
          // Flash animation if status changed
          if (prevStatusRef.current && prevStatusRef.current !== updated.status) {
            setStatusJustChanged(true);
            setTimeout(() => setStatusJustChanged(false), 2000);
          }
          prevStatusRef.current = updated.status;
        }
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setLiveConnected(false);
    };
  }, [orderId]);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  const activeSteps = STATUS_STEPS.filter((s) => !["cancelled", "refunded"].includes(s));
  const currentStep = activeSteps.indexOf(order.status);
  const isCancelled = ["cancelled", "refunded"].includes(order.status);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/marketplace/${slug}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display flex-1">Order Confirmation</span>

          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 text-xs transition-colors ${liveConnected ? "text-primary" : "text-muted-foreground"}`}>
            <Wifi className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{liveConnected ? "Live" : "Connecting…"}</span>
            {liveConnected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* Payment status banner */}
        {order.payment_status === "paid" && (
          <Card className="border-green-500/30 bg-green-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Payment Successful!</p>
                <p className="text-xs text-muted-foreground">Order #{order.order_number}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {order.payment_status === "pending" && (
          <Card className="border-yellow-500/30 bg-yellow-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-8 w-8 text-yellow-600 shrink-0" />
              <div>
                <p className="font-bold text-foreground">Payment Pending</p>
                <p className="text-xs text-muted-foreground">Please complete your payment. Order #{order.order_number}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status tracker */}
        {order.payment_status === "paid" && !isCancelled && (
          <Card className={`transition-all duration-500 ${statusJustChanged ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm text-foreground">Order Status</p>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* Step tracker */}
              <div className="relative">
                {/* Connector line */}
                <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-muted mx-6" />
                {/* Filled connector */}
                <div
                  className="absolute top-3.5 left-0 h-0.5 bg-primary transition-all duration-700 mx-6"
                  style={{
                    width: currentStep <= 0
                      ? "0%"
                      : `calc(${(currentStep / (activeSteps.length - 1)) * 100}% - 0px)`,
                  }}
                />

                <div className="relative flex items-start justify-between">
                  {activeSteps.map((step, i) => {
                    const Icon = STEP_ICONS[i];
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${
                            done
                              ? "text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground"
                          } ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : ""}`}
                          style={done ? { backgroundColor: storeColor } : {}}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className={`text-[9px] text-center capitalize leading-tight ${
                          active ? "font-bold text-foreground" : "text-muted-foreground"
                        }`}>
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status changed flash */}
              {statusJustChanged && (
                <p className="text-xs text-primary font-medium text-center mt-3 animate-pulse">
                  ✓ Order status updated!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancelled / Refunded */}
        {isCancelled && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-4">
              <p className="font-bold text-foreground capitalize">{order.status}</p>
              <p className="text-xs text-muted-foreground mt-0.5">This order has been {order.status}.</p>
            </CardContent>
          </Card>
        )}

        {/* Tracking number */}
        {order.tracking_number && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Tracking Number</p>
                <p className="font-mono font-bold text-foreground">{order.tracking_number}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order items */}
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
                <span>Shipping</span>
                <span>{order.shipping_fee === 0 ? "Free" : `RM ${order.shipping_fee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                <span>Total</span><span>RM {order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <Card>
          <CardContent className="p-4 space-y-1 text-sm">
            <p className="font-semibold text-foreground mb-2">Delivery To</p>
            <p className="text-foreground">{order.buyer_name}</p>
            <p className="text-muted-foreground">{order.buyer_phone}</p>
            <p className="text-muted-foreground">{order.buyer_email}</p>
            <p className="text-muted-foreground text-xs mt-1">{order.shipping_address}</p>
            {order.notes && (
              <p className="text-muted-foreground text-xs italic pt-1">Note: {order.notes}</p>
            )}
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
