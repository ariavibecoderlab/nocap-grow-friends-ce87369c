import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrderStatusBadge from "@/components/marketplace/OrderStatusBadge";
import ReviewForm from "@/components/marketplace/ReviewForm";
import BottomNav from "@/components/BottomNav";
import {
  ArrowLeft,
  Store,
  Package,
  Truck,
  Star,
  MapPin,
  Copy,
} from "lucide-react";
import OrderStatusTimeline from "@/components/marketplace/OrderStatusTimeline";
import ReturnRequestForm from "@/components/marketplace/ReturnRequestForm";
import { useToast } from "@/hooks/use-toast";

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  platform_fee: number;
  buyer_name: string;
  shipping_address: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  store_id: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface StoreInfo {
  store_name: string;
  logo_url: string | null;
}

interface TrackingEvent {
  timestamp: string;
  description: string;
  location?: string;
}

interface ShipmentData {
  id: string;
  carrier: string;
  tracking_number: string | null;
  status: string;
  shipped_at: string | null;
  notes: string | null;
  tracking_events: TrackingEvent[] | null;
}

const CARRIER_LABELS: Record<string, string> = {
  ninja_van: "Ninja Van",
  jnt_express: "J&T Express",
  pos_laju: "Pos Laju",
  gdex: "GDex",
  other: "Other / Manual",
};

const formatCarrier = (carrier: string) =>
  CARRIER_LABELS[carrier] ??
  carrier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user) return;
    const fetch = async () => {
      const { data: orderData } = await supabase
        .from("marketplace_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (!orderData) {
        setLoading(false);
        return;
      }
      setOrder(orderData as unknown as OrderData);

      const [itemsRes, storeRes, reviewsRes, shipmentRes] = await Promise.all([
        supabase
          .from("marketplace_order_items")
          .select(
            "id, product_id, product_name, product_image, quantity, unit_price, subtotal",
          )
          .eq("order_id", orderId),
        supabase
          .from("marketplace_stores")
          .select("store_name, logo_url")
          .eq("id", orderData.store_id)
          .maybeSingle(),
        supabase
          .from("marketplace_reviews")
          .select("product_id")
          .eq("order_id", orderId)
          .eq("buyer_user_id", user.id),
        supabase
          .from("order_shipments")
          .select(
            "id, carrier, tracking_number, status, shipped_at, notes, tracking_events",
          )
          .eq("order_id", orderId)
          .maybeSingle(),
      ]);
      setOrderItems((itemsRes.data as OrderItem[]) || []);
      setStoreInfo(storeRes.data as StoreInfo | null);
      setShipment(shipmentRes.data as ShipmentData | null);
      if (reviewsRes.data) {
        setReviewedProductIds(
          new Set(reviewsRes.data.map((r: any) => r.product_id)),
        );
      }
      setLoading(false);
    };
    fetch();
  }, [orderId, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pt-8 mx-auto max-w-md">
          <button
            onClick={() => navigate("/my-orders")}
            className="rounded-full p-1 hover:bg-white/10 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center py-20 text-white/40">
            <p className="font-medium">Order not found</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button
            onClick={() => navigate("/my-orders")}
            className="rounded-full p-1 hover:bg-white/10 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-white">
            Order Details
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Merchant Logo Receipt Header */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 text-center">
            {storeInfo?.logo_url ? (
              <img
                src={storeInfo.logo_url}
                alt={storeInfo.store_name}
                className="h-16 w-16 rounded-xl mx-auto object-cover border border-white/10"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl mx-auto bg-secondary/20 flex items-center justify-center">
                <Store className="h-8 w-8 text-secondary" />
              </div>
            )}
            <p className="font-display text-lg font-bold text-white mt-3">
              {storeInfo?.store_name || "Store"}
            </p>
            <p className="text-xs text-white/40 mt-1">
              Order #{order.order_number}
            </p>
            <div className="mt-2">
              <OrderStatusBadge status={order.status} />
            </div>
          </CardContent>
        </Card>

        {/* Order Status Timeline */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <OrderStatusTimeline
              orderId={order.id}
              currentStatus={order.status}
            />
          </CardContent>
        </Card>

        {/* Shipment Tracking */}
        {shipment && (
          <Card className="border-cyan-500/20 bg-cyan-500/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Shipment Tracking
                </h3>
                <Badge className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 capitalize">
                  {shipment.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/40">Carrier</p>
                  <p className="text-sm font-medium text-white">
                    {formatCarrier(shipment.carrier)}
                  </p>
                </div>
                {shipment.shipped_at && (
                  <div className="text-right">
                    <p className="text-[10px] text-white/40">Shipped</p>
                    <p className="text-xs text-white/70">
                      {new Date(shipment.shipped_at).toLocaleDateString(
                        "en-MY",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                )}
              </div>

              {shipment.tracking_number && (
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-xs font-mono text-cyan-200 flex-1 truncate">
                    {shipment.tracking_number}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shipment.tracking_number!);
                      toast({
                        title: "Copied!",
                        description: shipment.tracking_number!,
                      });
                    }}
                    className="shrink-0 text-white/40 hover:text-white transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {shipment.tracking_events &&
                shipment.tracking_events.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">
                      Tracking Events
                    </p>
                    {shipment.tracking_events.map((event, idx) => (
                      <div key={idx} className="flex gap-2.5">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-2 w-2 rounded-full mt-1 shrink-0 ${idx === 0 ? "bg-cyan-400" : "bg-white/20"}`}
                          />
                          {idx < shipment.tracking_events!.length - 1 && (
                            <div className="w-px flex-1 bg-white/10 my-0.5" />
                          )}
                        </div>
                        <div className="pb-2 min-w-0">
                          <p className="text-xs text-white leading-snug">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-white/30">
                              {new Date(event.timestamp).toLocaleDateString(
                                "en-MY",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                            {event.location && (
                              <>
                                <span className="text-white/20">·</span>
                                <MapPin className="h-2.5 w-2.5 text-white/30 shrink-0" />
                                <p className="text-[10px] text-white/30 truncate">
                                  {event.location}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="font-display text-sm font-semibold text-white mb-3">
              Items
            </h3>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/10 shrink-0 flex items-center justify-center">
                      <Package className="h-5 w-5 text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-white/40">
                      × {item.quantity} · RM {item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    RM {item.subtotal.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Subtotal</span>
              <span className="text-white">RM {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Shipping</span>
              <span className="text-white">
                {order.shipping_fee === 0
                  ? "Free"
                  : `RM ${order.shipping_fee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-secondary">
                RM {order.total_amount.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="font-display text-sm font-semibold text-white mb-1">
              Delivery Address
            </h3>
            <p className="text-sm text-white/60">{order.buyer_name}</p>
            <p className="text-xs text-white/40 mt-1">
              {order.shipping_address}
            </p>
          </CardContent>
        </Card>

        {/* Reviews Section - only for delivered orders */}
        {order.status === "delivered" && orderItems.length > 0 && (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-secondary" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Rate Your Purchase
                </h3>
              </div>
              {orderItems.map((item) =>
                reviewedProductIds.has(item.product_id) ? (
                  <div key={item.id} className="flex items-center gap-2 py-1">
                    <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    <p className="text-xs text-white/40">
                      Reviewed: {item.product_name}
                    </p>
                  </div>
                ) : (
                  <ReviewForm
                    key={item.id}
                    orderId={order.id}
                    productId={item.product_id}
                    productName={item.product_name}
                    onReviewSubmitted={() =>
                      setReviewedProductIds(
                        (prev) => new Set([...prev, item.product_id]),
                      )
                    }
                  />
                ),
              )}
            </CardContent>
          </Card>
        )}

        {/* Return/Refund - for delivered or shipped orders */}
        {(order.status === "delivered" || order.status === "shipped") && (
          <div className="flex justify-center">
            <ReturnRequestForm
              orderId={order.id}
              storeId={order.store_id}
              totalAmount={order.total_amount}
            />
          </div>
        )}

        <p className="text-center text-[10px] text-white/30 pb-4">
          {new Date(order.created_at).toLocaleDateString("en-MY", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <BottomNav />
    </div>
  );
};

export default OrderConfirmation;
