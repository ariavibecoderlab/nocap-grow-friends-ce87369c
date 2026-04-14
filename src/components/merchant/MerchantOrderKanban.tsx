import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Package, Truck, CheckCircle2, Clock, RefreshCw, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

const STAGES = [
  { key: "pending", label: "Pending", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { key: "confirmed", label: "Processing", icon: Package, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
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
  const { toast } = useToast();

  useEffect(() => { loadOrders(); }, [storeId]);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_orders")
      .select("id, order_number, buyer_name, total_amount, status, created_at, tracking_number, notes")
      .eq("store_id", storeId)
      .in("status", ["pending", "confirmed", "shipped", "delivered"])
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders(data || []);
    setLoading(false);
  };

  const moveOrder = async (orderId: string, newStatus: string) => {
    setMoving(orderId);
    const { error } = await supabase
      .from("marketplace_orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast({ title: `Order moved to ${newStatus}` });
    }
    setMoving(null);
  };

  const bulkMove = async (fromStatus: string) => {
    const next = NEXT_STATUS[fromStatus];
    if (!next) return;
    const ids = orders.filter(o => o.status === fromStatus).map(o => o.id);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from("marketplace_orders")
      .update({ status: next })
      .in("id", ids);

    if (!error) {
      setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: next } : o));
      toast({ title: `${ids.length} orders moved to ${next}` });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Pipeline header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {STAGES.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-1">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${stage.bg} ${stage.color} border`}>
                <stage.icon className="h-2.5 w-2.5 mr-0.5" />
                {orders.filter(o => o.status === stage.key).length}
              </Badge>
              {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-white/20" />}
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={loadOrders} className="h-7 text-white/40 hover:text-white">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="space-y-4">
        {STAGES.map(stage => {
          const stageOrders = orders.filter(o => o.status === stage.key);
          const nextStatus = NEXT_STATUS[stage.key];

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <stage.icon className={`h-4 w-4 ${stage.color}`} />
                  <p className="text-xs font-semibold text-white">{stage.label}</p>
                  <span className="text-[10px] text-white/30">({stageOrders.length})</span>
                </div>
                {nextStatus && stageOrders.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => bulkMove(stage.key)}
                    className="h-6 text-[9px] border-white/10 text-white/40 hover:bg-white/10">
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
                  {stageOrders.map(order => (
                    <Card key={order.id} className={`border ${stage.bg}`}>
                      <CardContent className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-white">#{order.order_number}</p>
                            <span className="text-[10px] text-secondary font-semibold">RM {Number(order.total_amount).toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-white/40 truncate">{order.buyer_name}</p>
                        </div>
                        {nextStatus && (
                          <Button size="sm" onClick={() => moveOrder(order.id, nextStatus)}
                            disabled={moving === order.id}
                            className="h-6 text-[9px] bg-white/10 hover:bg-white/20 text-white">
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
    </div>
  );
};

export default MerchantOrderKanban;
