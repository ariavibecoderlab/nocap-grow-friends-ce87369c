import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Package, ShoppingBag, Search, Loader2,
  CheckCircle2, Clock, Truck,
} from "lucide-react";
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

interface GuestOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  buyer_name: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  marketplace_stores: { store_name: string; slug: string; primary_color: string } | null;
}

interface GuestOrderItem {
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

type Tab = "my-orders" | "track-order";

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("track-order");

  // Member orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Guest lookup
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [guestOrder, setGuestOrder] = useState<GuestOrder | null>(null);
  const [guestItems, setGuestItems] = useState<GuestOrderItem[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Switch to "My Orders" tab when user is logged in
  useEffect(() => {
    if (!authLoading && user) setActiveTab("my-orders");
  }, [user, authLoading]);

  // Fetch member orders when on that tab
  useEffect(() => {
    if (activeTab !== "my-orders" || !user) return;
    setOrdersLoading(true);
    supabase
      .from("marketplace_orders")
      .select("*, marketplace_stores(store_name, slug, primary_color)")
      .eq("buyer_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) || []);
        setOrdersLoading(false);
      });
  }, [activeTab, user]);

  // ── Guest lookup ──────────────────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setGuestOrder(null);
    setGuestItems([]);

    const trimmedEmail = email.trim();
    const trimmedOrderNum = orderNumber.trim();

    if (!trimmedEmail || !trimmedOrderNum) {
      setLookupError("Please enter both your email and order number.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setLookupError("Please enter a valid email address.");
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("guest-order-lookup", {
        body: { email: trimmedEmail, order_number: trimmedOrderNum },
      });
      if (error || data?.error) {
        setLookupError(data?.error ?? "Something went wrong. Please try again.");
      } else {
        setGuestOrder(data.order as GuestOrder);
        setGuestItems(data.items as GuestOrderItem[]);
      }
    } catch {
      setLookupError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered", "completed"];
  const activeSteps = STATUS_STEPS.filter((s) => !["cancelled", "refunded"].includes(s));

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display flex-1">Orders</span>
        </div>

        {/* Tabs */}
        <div className="max-w-xl mx-auto px-4 pb-0 flex border-b border-border">
          <button
            onClick={() => setActiveTab("track-order")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "track-order"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
            Track Order
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("my-orders")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "my-orders"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              My Orders
            </button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">

        {/* ── Track Order tab ─────────────────────────────────────────────── */}
        {activeTab === "track-order" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="font-semibold text-foreground text-sm">Track Your Order</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the email you used at checkout and your order number.
                  </p>
                </div>
                <form onSubmit={handleLookup} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-9 text-sm"
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Order Number</Label>
                    <Input
                      type="text"
                      autoComplete="off"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ORD-12345"
                      className="h-9 text-sm font-mono"
                      maxLength={30}
                    />
                  </div>
                  {lookupError && (
                    <p className="text-xs text-destructive">{lookupError}</p>
                  )}
                  <Button type="submit" className="w-full gap-2" disabled={searching}>
                    {searching
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                      : <><Search className="h-4 w-4" /> Find Order</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Guest order result */}
            {guestOrder && (
              <div className="space-y-3">
                {/* Status banner */}
                <Card className={
                  guestOrder.payment_status === "paid"
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-yellow-500/30 bg-yellow-500/10"
                }>
                  <CardContent className="flex items-center gap-3 p-4">
                    {guestOrder.payment_status === "paid"
                      ? <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                      : <Clock className="h-8 w-8 text-yellow-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm">
                        {guestOrder.payment_status === "paid" ? "Payment Confirmed" : "Payment Pending"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Order #{guestOrder.order_number}
                        {guestOrder.marketplace_stores && ` · ${guestOrder.marketplace_stores.store_name}`}
                      </p>
                    </div>
                    <div className="ml-auto shrink-0">
                      <OrderStatusBadge status={guestOrder.status} />
                    </div>
                  </CardContent>
                </Card>

                {/* Progress tracker */}
                {guestOrder.payment_status === "paid" && !["cancelled", "refunded"].includes(guestOrder.status) && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Order Progress</p>
                      <div className="relative">
                        <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-muted mx-5" />
                        <div
                          className="absolute top-3.5 left-0 h-0.5 bg-primary transition-all duration-700 mx-5"
                          style={{
                            width: (() => {
                              const idx = activeSteps.indexOf(guestOrder.status);
                              return idx <= 0 ? "0%" : `${(idx / (activeSteps.length - 1)) * 100}%`;
                            })(),
                          }}
                        />
                        <div className="relative flex items-start justify-between">
                          {activeSteps.map((step, i) => {
                            const done = i <= activeSteps.indexOf(guestOrder.status);
                            const active = step === guestOrder.status;
                            return (
                              <div key={step} className="flex flex-col items-center gap-1 flex-1">
                                <div
                                  className={`h-7 w-7 rounded-full flex items-center justify-center z-10 transition-all ${
                                    done ? "text-primary-foreground" : "bg-muted text-muted-foreground"
                                  } ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : ""}`}
                                  style={done && guestOrder.marketplace_stores?.primary_color
                                    ? { backgroundColor: guestOrder.marketplace_stores.primary_color }
                                    : done ? { backgroundColor: "hsl(var(--primary))" } : {}}
                                >
                                  <Package className="h-3 w-3" />
                                </div>
                                <p className={`text-[9px] capitalize text-center leading-tight ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                                  {step}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tracking number */}
                {guestOrder.tracking_number && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Truck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tracking Number</p>
                        <p className="font-mono font-bold text-foreground">{guestOrder.tracking_number}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order items */}
                <Card>
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm text-foreground mb-3">Items Ordered</p>
                    <div className="space-y-2">
                      {guestItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
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
                        <span>Subtotal</span><span>RM {guestOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span>{guestOrder.shipping_fee === 0 ? "Free" : `RM ${guestOrder.shipping_fee.toFixed(2)}`}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                        <span>Total</span><span>RM {guestOrder.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Placed {format(new Date(guestOrder.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                  </CardContent>
                </Card>

                {/* View full confirmation if they have an account */}
                {guestOrder.marketplace_stores && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/marketplace/${guestOrder.marketplace_stores!.slug}/order/${guestOrder.id}`)}
                  >
                    View Full Order Page
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── My Orders tab (logged-in) ────────────────────────────────────── */}
        {activeTab === "my-orders" && user && (
          ordersLoading ? (
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
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-muted"
                            style={store?.primary_color ? { backgroundColor: store.primary_color + "33" } : {}}
                          >
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">#{order.order_number}</p>
                            {store && <p className="text-xs text-muted-foreground">{store.store_name}</p>}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), "d MMM yyyy, h:mm a")}
                            </p>
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
          )
        )}
      </div>
    </div>
  );
}
