import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Mail, RefreshCw, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AbandonedCart {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  items: any[];
  subtotal: number;
  recovery_status: string;
  reminded_at: string | null;
  recovered_at: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
}

const MerchantAbandonedCarts = ({ storeId }: Props) => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadCarts();
  }, [storeId, filter]);

  const loadCarts = async () => {
    setLoading(true);
    let query = supabase
      .from("marketplace_abandoned_carts")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") query = query.eq("recovery_status", filter);

    const { data } = await query;
    setCarts((data as AbandonedCart[]) || []);
    setLoading(false);
  };

  const markReminded = async (cartId: string) => {
    const { error } = await supabase
      .from("marketplace_abandoned_carts")
      .update({ recovery_status: "reminded", reminded_at: new Date().toISOString() })
      .eq("id", cartId);

    if (!error) {
      toast({ title: "Marked as reminded" });
      loadCarts();
    }
  };

  const markRecovered = async (cartId: string) => {
    const { error } = await supabase
      .from("marketplace_abandoned_carts")
      .update({ recovery_status: "recovered", recovered_at: new Date().toISOString() })
      .eq("id", cartId);

    if (!error) {
      toast({ title: "Marked as recovered!" });
      loadCarts();
    }
  };

  const stats = {
    total: carts.length,
    abandoned: carts.filter(c => c.recovery_status === "abandoned").length,
    reminded: carts.filter(c => c.recovery_status === "reminded").length,
    recovered: carts.filter(c => c.recovery_status === "recovered").length,
    totalValue: carts.filter(c => c.recovery_status === "abandoned").reduce((s, c) => s + c.subtotal, 0),
  };

  const statusIcon = (status: string) => {
    if (status === "recovered") return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    if (status === "reminded") return <Mail className="h-3 w-3 text-blue-400" />;
    return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "recovered") return "bg-green-500/20 text-green-300 border-green-500/30";
    if (status === "reminded") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total Carts", value: stats.total, color: "text-white" },
          { label: "Abandoned", value: stats.abandoned, color: "text-yellow-400" },
          { label: "Reminded", value: stats.reminded, color: "text-blue-400" },
          { label: "Recovered", value: stats.recovered, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-white/40">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.totalValue > 0 && (
        <Card className="border-secondary/20 bg-secondary/10">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60">Recoverable Revenue</p>
              <p className="text-lg font-bold text-secondary">RM {stats.totalValue.toFixed(2)}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-secondary/40" />
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-1">
        {["all", "abandoned", "reminded", "recovered"].map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "secondary" : "ghost"}
            onClick={() => setFilter(f)}
            className="text-[10px] h-7 capitalize"
          >
            {f}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={loadCarts} className="ml-auto h-7">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Cart List */}
      {carts.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No abandoned carts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {carts.map(cart => {
            const items = Array.isArray(cart.items) ? cart.items : [];
            const timeSince = Math.floor((Date.now() - new Date(cart.created_at).getTime()) / 3600000);

            return (
              <Card key={cart.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {cart.buyer_name || cart.buyer_email || "Guest"}
                        </p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusColor(cart.recovery_status)}`}>
                          {statusIcon(cart.recovery_status)}
                          <span className="ml-1">{cart.recovery_status}</span>
                        </Badge>
                      </div>
                      {cart.buyer_email && (
                        <p className="text-[10px] text-white/40 truncate">{cart.buyer_email}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-secondary font-semibold">
                          RM {cart.subtotal.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {timeSince < 24 ? `${timeSince}h ago` : `${Math.floor(timeSince / 24)}d ago`}
                        </span>
                      </div>
                      {items.length > 0 && (
                        <p className="text-[10px] text-white/30 mt-1 truncate">
                          {items.map((i: any) => i.name || i.product_name).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {cart.recovery_status === "abandoned" && (
                        <Button size="sm" variant="outline" onClick={() => markReminded(cart.id)}
                          className="h-7 text-[10px] border-white/10 text-white/60 hover:bg-white/10">
                          <Mail className="h-3 w-3 mr-1" /> Remind
                        </Button>
                      )}
                      {cart.recovery_status !== "recovered" && (
                        <Button size="sm" onClick={() => markRecovered(cart.id)}
                          className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Recovered
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MerchantAbandonedCarts;
