import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  shipping_address: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  payment_method: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "refunded"];

export default function ManageOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: storeData } = await supabase.from("marketplace_stores").select("id").eq("merchant_user_id", user.id).single();
      if (!storeData) { setLoading(false); return; }
      setStoreId(storeData.id);

      const { data: ordersData } = await supabase
        .from("marketplace_orders")
        .select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false });

      setOrders((ordersData as Order[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.tracking_number ?? "");
    const { data } = await supabase.from("marketplace_order_items").select("*").eq("order_id", order.id);
    setOrderItems((data as OrderItem[]) || []);
  };

  const updateOrder = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    const { error } = await supabase.from("marketplace_orders").update({
      status: newStatus,
      tracking_number: trackingNumber.trim() || null,
    }).eq("id", selectedOrder.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: newStatus, tracking_number: trackingNumber.trim() || null } : o));
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus, tracking_number: trackingNumber.trim() || null } : null);
      toast({ title: "Order updated!" });
    }
    setUpdating(false);
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace/manage")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display">Orders</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p className="font-medium">No orders found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => openOrder(order)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{order.buyer_name} · {order.buyer_email}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "d MMM yyyy, h:mm a")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="font-bold text-sm text-foreground">RM {Number(order.total_amount).toFixed(2)}</p>
                      <OrderStatusBadge status={order.status} />
                      {order.payment_status !== "paid" && (
                        <span className="text-[9px] text-destructive font-medium">UNPAID</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Items</p>
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {item.product_image && (
                      <div className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity} @ RM {item.unit_price.toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">RM {item.subtotal.toFixed(2)}</p>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-border flex justify-between font-bold text-sm text-foreground">
                  <span>Total</span><span>RM {Number(selectedOrder.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Buyer info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Delivery</p>
                <p className="text-sm font-semibold text-foreground">{selectedOrder.buyer_name}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.buyer_phone}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.buyer_email}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedOrder.shipping_address}</p>
                {selectedOrder.notes && <p className="text-xs text-muted-foreground italic">Note: {selectedOrder.notes}</p>}
              </div>

              <Separator />

              {/* Update status */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Update Status</p>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Truck className="h-3 w-3" /> Tracking Number</p>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" className="h-9 text-sm" />
                </div>
                <Button onClick={updateOrder} disabled={updating} className="w-full">
                  {updating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating…</> : "Update Order"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
