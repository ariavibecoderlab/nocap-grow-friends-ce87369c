import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import OrderStatusBadge from "@/components/marketplace/OrderStatusBadge";
import { ArrowLeft, Package, MapPin, Phone, Mail, User, Truck, Loader2, Hash, Printer } from "lucide-react";
import { generateSalesOrderPdf } from "@/lib/generateSalesOrderPdf";

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  shipping_address: string;
  notes: string | null;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  platform_fee: number;
  tracking_number: string | null;
  payment_status: string;
  created_at: string;
  store_id: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const STATUS_PIPELINE = ["pending", "confirmed", "processing", "shipped", "delivered"];

interface Props {
  orderId: string;
  onBack: () => void;
  onStatusChange: () => void;
}

export default function MerchantOrderDetail({ orderId, onBack, onStatusChange }: Props) {
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{ store_name: string; logo_url: string | null } | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from("marketplace_orders")
          .select("id, order_number, status, buyer_name, buyer_email, buyer_phone, shipping_address, notes, subtotal, shipping_fee, total_amount, platform_fee, tracking_number, payment_status, created_at, store_id")
          .eq("id", orderId)
          .single(),
        supabase
          .from("marketplace_order_items")
          .select("id, product_name, product_image, quantity, unit_price, subtotal")
          .eq("order_id", orderId),
      ]);
      if (orderRes.data) {
        const o = orderRes.data as OrderDetail;
        setOrder(o);
        setTrackingInput(o.tracking_number || "");
        // Fetch store info
        const storeRes = await supabase
          .from("marketplace_stores")
          .select("store_name, logo_url")
          .eq("id", o.store_id)
          .single();
        if (storeRes.data) setStoreInfo(storeRes.data);
      }
      setItems((itemsRes.data as OrderItem[]) || []);
      setLoading(false);
    };
    load();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const update: Record<string, string> = { status: newStatus };
    await supabase.from("marketplace_orders").update(update).eq("id", order.id);
    setOrder({ ...order, status: newStatus });
    onStatusChange();
    toast({ title: `Order ${newStatus}` });
    setUpdating(false);
  };

  const saveTracking = async () => {
    if (!order) return;
    setSavingTracking(true);
    await supabase
      .from("marketplace_orders")
      .update({ tracking_number: trackingInput.trim() || null })
      .eq("id", order.id);
    setOrder({ ...order, tracking_number: trackingInput.trim() || null });
    onStatusChange();
    toast({ title: "Tracking number saved" });
    setSavingTracking(false);
  };

  const printOrder = async () => {
    if (!order || !storeInfo) return;
    setPrinting(true);
    try {
      await generateSalesOrderPdf({
        storeName: storeInfo.store_name,
        logoUrl: storeInfo.logo_url,
        orderNumber: order.order_number,
        orderDate: order.created_at,
        status: order.status,
        buyerName: order.buyer_name,
        buyerEmail: order.buyer_email,
        buyerPhone: order.buyer_phone,
        shippingAddress: order.shipping_address,
        notes: order.notes,
        items: items.map(i => ({
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
        trackingNumber: order.tracking_number,
      });
      toast({ title: "Sales order PDF downloaded" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
    setPrinting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8 text-white/40">
        <p>Order not found</p>
        <Button variant="ghost" className="mt-2 text-white/60" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const currentStep = STATUS_PIPELINE.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="font-display text-sm font-semibold text-white">Order #{order.order_number}</p>
          <p className="text-[10px] text-white/40">
            {new Date(order.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}
            {new Date(order.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={printOrder} disabled={printing}>
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        </Button>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Status Pipeline */}
      {!isCancelled && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3">
            <p className="text-[10px] text-white/40 mb-2 font-medium uppercase tracking-wider">Order Progress</p>
            <div className="flex items-center gap-1">
              {STATUS_PIPELINE.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    i <= currentStep ? "bg-secondary" : "bg-white/10"
                  }`} />
                  {i < STATUS_PIPELINE.length - 1 && (
                    <div className={`h-0.5 flex-1 ${
                      i < currentStep ? "bg-secondary" : "bg-white/10"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {STATUS_PIPELINE.map((step) => (
                <p key={step} className="text-[8px] text-white/30 capitalize">{step}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Actions */}
      {!isCancelled && order.status !== "delivered" && (
        <div className="flex gap-2 flex-wrap">
          {order.status === "pending" && (
            <Button size="sm" className="text-xs h-8 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 flex-1"
              disabled={updating} onClick={() => updateStatus("confirmed")}>
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Order"}
            </Button>
          )}
          {order.status === "confirmed" && (
            <Button size="sm" className="text-xs h-8 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex-1"
              disabled={updating} onClick={() => updateStatus("processing")}>
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Start Processing"}
            </Button>
          )}
          {order.status === "processing" && (
            <Button size="sm" className="text-xs h-8 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex-1"
              disabled={updating} onClick={() => updateStatus("shipped")}>
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark as Shipped"}
            </Button>
          )}
          {order.status === "shipped" && (
            <Button size="sm" className="text-xs h-8 bg-green-500/20 text-green-400 hover:bg-green-500/30 flex-1"
              disabled={updating} onClick={() => updateStatus("delivered")}>
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Delivered"}
            </Button>
          )}
          <Button size="sm" className="text-xs h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30"
            disabled={updating} onClick={() => updateStatus("cancelled")}>
            Cancel
          </Button>
        </div>
      )}

      {/* Buyer Info */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 space-y-2.5">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Buyer Information</p>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-secondary shrink-0" />
            <p className="text-sm text-white">{order.buyer_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-secondary shrink-0" />
            <p className="text-sm text-white/70">{order.buyer_email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-secondary shrink-0" />
            <p className="text-sm text-white/70">{order.buyer_phone}</p>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-white/70">{order.shipping_address}</p>
          </div>
          {order.notes && (
            <div className="bg-white/5 rounded-md p-2 mt-1">
              <p className="text-[10px] text-white/40 mb-0.5">Notes</p>
              <p className="text-xs text-white/60">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 space-y-2.5">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Items ({items.length})</p>
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
              <div className="h-10 w-10 rounded-md bg-white/5 overflow-hidden shrink-0">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.product_name}</p>
                <p className="text-[10px] text-white/40">RM {item.unit_price.toFixed(2)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-white shrink-0">RM {item.subtotal.toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 space-y-1.5">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Payment Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Subtotal</span>
            <span className="text-white">RM {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Shipping</span>
            <span className="text-white">RM {order.shipping_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Platform Fee</span>
            <span className="text-white/50">-RM {order.platform_fee.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm font-semibold">
            <span className="text-white">Total</span>
            <span className="text-secondary">RM {order.total_amount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Number */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-secondary" /> Tracking Number
          </p>
          <div className="flex gap-2">
            <Input
              value={trackingInput}
              onChange={e => setTrackingInput(e.target.value)}
              placeholder="Enter tracking number"
              className="bg-white/5 border-white/10 text-white text-sm h-9 flex-1"
            />
            <Button size="sm" className="bg-secondary text-primary text-xs h-9 px-4"
              disabled={savingTracking || trackingInput === (order.tracking_number || "")}
              onClick={saveTracking}>
              {savingTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
          {order.tracking_number && (
            <p className="text-[10px] text-white/30">Current: {order.tracking_number}</p>
          )}
        </CardContent>
      </Card>

      {/* Print Sales Order */}
      <Button
        className="w-full bg-secondary text-primary hover:bg-secondary/90 text-sm h-10"
        onClick={printOrder}
        disabled={printing}
      >
        {printing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
        Print Sales Order
      </Button>
    </div>
  );
}
