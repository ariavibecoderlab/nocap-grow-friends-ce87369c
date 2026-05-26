import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  storeId: string;
}

interface ShipDialogState {
  open: boolean;
  orderId: string;
  orderNumber: string;
}

const CARRIERS = [
  { value: "ninja_van", label: "Ninja Van" },
  { value: "jnt_express", label: "J&T Express" },
  { value: "pos_laju", label: "Pos Laju" },
  { value: "gdex", label: "GDex" },
  { value: "other", label: "Other / Manual" },
];

const STAGES = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    key: "confirmed",
    label: "Processing",
    icon: Package,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "shipped",
    label: "Shipped",
    icon: Truck,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
] as const;

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

const MerchantOrderKanban = ({ storeId }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Ship dialog state
  const [shipDialog, setShipDialog] = useState<ShipDialogState>({
    open: false,
    orderId: "",
    orderNumber: "",
  });
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipNotes, setShipNotes] = useState("");
  const [submittingShip, setSubmittingShip] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [storeId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_orders")
      .select(
        "id, order_number, buyer_name, total_amount, status, created_at, tracking_number, notes",
      )
      .eq("store_id", storeId)
      .in("status", ["pending", "confirmed", "shipped", "delivered"])
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders(data || []);
    setSelected(new Set());
    setLoading(false);
  };

  const openShipDialog = (orderId: string, orderNumber: string) => {
    setCarrier("");
    setTrackingNumber("");
    setShipNotes("");
    setShipDialog({ open: true, orderId, orderNumber });
  };

  const confirmShipment = async () => {
    if (!carrier) {
      toast({ title: "Select a carrier", variant: "destructive" });
      return;
    }
    setSubmittingShip(true);
    const { orderId } = shipDialog;

    const updatePayload: Record<string, string | null> = { status: "shipped" };
    if (trackingNumber.trim())
      updatePayload.tracking_number = trackingNumber.trim();

    const { error: updateErr } = await supabase
      .from("marketplace_orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (updateErr) {
      toast({
        title: "Error updating order",
        description: updateErr.message,
        variant: "destructive",
      });
      setSubmittingShip(false);
      return;
    }

    const { error: shipErr } = await supabase.from("order_shipments").insert({
      order_id: orderId,
      tracking_number: trackingNumber.trim() || null,
      carrier,
      status: "shipped",
      shipped_at: new Date().toISOString(),
      notes: shipNotes.trim() || null,
    });

    if (shipErr) {
      // order already marked shipped — warn but don't block
      toast({
        title: "Order marked shipped",
        description: `Shipment record error: ${shipErr.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Order shipped",
        description: trackingNumber.trim()
          ? `Tracking: ${trackingNumber.trim()}`
          : undefined,
      });
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "shipped",
              tracking_number: trackingNumber.trim() || o.tracking_number,
            }
          : o,
      ),
    );
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(orderId);
      return n;
    });
    setShipDialog({ open: false, orderId: "", orderNumber: "" });
    setSubmittingShip(false);
  };

  const moveOrder = async (orderId: string, currentStatus: string) => {
    const newStatus = NEXT_STATUS[currentStatus];
    if (!newStatus) return;

    // Confirmed → Shipped needs the ship dialog
    if (currentStatus === "confirmed") {
      const order = orders.find((o) => o.id === orderId);
      openShipDialog(orderId, order?.order_number ?? orderId);
      return;
    }

    setMoving(orderId);
    const { error } = await supabase
      .from("marketplace_orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(orderId);
        return n;
      });
      toast({ title: `Order moved to ${newStatus}` });
    }
    setMoving(null);
  };

  const bulkMove = async (fromStatus: string) => {
    const next = NEXT_STATUS[fromStatus];
    if (!next) return;
    const ids = orders.filter((o) => o.status === fromStatus).map((o) => o.id);
    if (ids.length === 0) return;

    // confirmed → shipped bulk: skip dialog, move without tracking
    const { error } = await supabase
      .from("marketplace_orders")
      .update({ status: next })
      .in("id", ids);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (ids.includes(o.id) ? { ...o, status: next } : o)),
      );
      setSelected(new Set());
      toast({ title: `${ids.length} orders moved to ${next}` });
    }
  };

  const bulkMoveSelected = async () => {
    if (selected.size === 0) return;
    const selectedOrders = orders.filter((o) => selected.has(o.id));
    const byStatus = new Map<string, string[]>();
    selectedOrders.forEach((o) => {
      const next = NEXT_STATUS[o.status];
      if (next) {
        const list = byStatus.get(o.status) || [];
        list.push(o.id);
        byStatus.set(o.status, list);
      }
    });

    let movedTotal = 0;
    for (const [, ids] of byStatus) {
      const next = NEXT_STATUS[orders.find((o) => o.id === ids[0])!.status];
      const { error } = await supabase
        .from("marketplace_orders")
        .update({ status: next })
        .in("id", ids);
      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (ids.includes(o.id) ? { ...o, status: next } : o)),
        );
        movedTotal += ids.length;
      }
    }
    setSelected(new Set());
    if (movedTotal > 0) toast({ title: `${movedTotal} orders advanced` });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllInStage = (stageKey: string) => {
    const ids = orders
      .filter((o) => o.status === stageKey && NEXT_STATUS[stageKey])
      .map((o) => o.id);
    setSelected((prev) => {
      const n = new Set(prev);
      const allSelected = ids.every((id) => n.has(id));
      ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id)));
      return n;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {STAGES.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${stage.bg} ${stage.color} border`}
              >
                <stage.icon className="h-2.5 w-2.5 mr-0.5" />
                {orders.filter((o) => o.status === stage.key).length}
              </Badge>
              {i < STAGES.length - 1 && (
                <ChevronRight className="h-3 w-3 text-white/20" />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {selected.size > 0 && (
            <Button
              size="sm"
              onClick={bulkMoveSelected}
              className="h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90"
            >
              Move {selected.size} selected{" "}
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={loadOrders}
            className="h-7 text-white/40 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="space-y-4">
        {STAGES.map((stage) => {
          const stageOrders = orders.filter((o) => o.status === stage.key);
          const nextStatus = NEXT_STATUS[stage.key];
          const selectableIds = stageOrders
            .filter((o) => nextStatus)
            .map((o) => o.id);
          const allSelected =
            selectableIds.length > 0 &&
            selectableIds.every((id) => selected.has(id));

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {nextStatus && stageOrders.length > 0 && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => selectAllInStage(stage.key)}
                      className="h-3.5 w-3.5 border-white/20"
                    />
                  )}
                  <stage.icon className={`h-4 w-4 ${stage.color}`} />
                  <p className="text-xs font-semibold text-white">
                    {stage.label}
                  </p>
                  <span className="text-[10px] text-white/30">
                    ({stageOrders.length})
                  </span>
                </div>
                {nextStatus && stageOrders.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkMove(stage.key)}
                    className="h-6 text-[9px] border-white/10 text-white/40 hover:bg-white/10"
                  >
                    Move all <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                  </Button>
                )}
              </div>

              {stageOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 py-4 text-center">
                  <p className="text-[10px] text-white/20">No orders</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {stageOrders.map((order) => (
                    <Card
                      key={order.id}
                      className={`border ${stage.bg} ${selected.has(order.id) ? "ring-1 ring-secondary/50" : ""}`}
                    >
                      <CardContent className="p-2.5 flex items-center justify-between gap-2">
                        {nextStatus && (
                          <Checkbox
                            checked={selected.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                            className="h-3.5 w-3.5 border-white/20 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-white">
                              #{order.order_number}
                            </p>
                            <span className="text-[10px] text-secondary font-semibold">
                              RM {Number(order.total_amount).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 truncate">
                            {order.buyer_name}
                          </p>
                          {(stage.key === "shipped" ||
                            stage.key === "delivered") &&
                            order.tracking_number && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Truck className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                                <span className="text-[10px] text-purple-300 font-mono truncate max-w-[100px]">
                                  {order.tracking_number}
                                </span>
                              </div>
                            )}
                        </div>
                        {nextStatus && (
                          <Button
                            size="sm"
                            onClick={() => moveOrder(order.id, stage.key)}
                            disabled={moving === order.id}
                            className="h-6 text-[9px] bg-white/10 hover:bg-white/20 text-white"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ship order dialog */}
      <Dialog
        open={shipDialog.open}
        onOpenChange={(open) =>
          !open && setShipDialog((s) => ({ ...s, open: false }))
        }
      >
        <DialogContent className="bg-primary border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Mark as Shipped</DialogTitle>
            <p className="text-xs text-white/40">
              Order #{shipDialog.orderNumber}
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-white/60">Carrier *</label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10">
                  {CARRIERS.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                      className="text-white focus:bg-white/10"
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">
                Tracking Number (optional)
              </label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. NV123456789MY"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/60">Notes (optional)</label>
              <Input
                value={shipNotes}
                onChange={(e) => setShipNotes(e.target.value)}
                placeholder="e.g. Fragile, handle with care"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShipDialog((s) => ({ ...s, open: false }))}
              className="text-white/40 hover:text-white"
              disabled={submittingShip}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmShipment}
              disabled={submittingShip || !carrier}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submittingShip ? "Shipping…" : "Confirm Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantOrderKanban;
