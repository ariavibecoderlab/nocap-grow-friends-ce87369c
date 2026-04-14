import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Package, Bell, RefreshCw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

interface ProductWithAlert {
  id: string;
  name: string;
  stock_quantity: number;
  status: string;
  alert_id: string | null;
  threshold: number;
  alert_active: boolean;
}

const MerchantInventoryAlerts = ({ storeId }: Props) => {
  const [products, setProducts] = useState<ProductWithAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkThreshold, setBulkThreshold] = useState("5");
  const { toast } = useToast();

  useEffect(() => { loadProducts(); }, [storeId]);

  const loadProducts = async () => {
    setLoading(true);
    const [{ data: prods }, { data: alerts }] = await Promise.all([
      supabase.from("marketplace_products").select("id, name, stock_quantity, status").eq("store_id", storeId).order("name"),
      supabase.from("marketplace_inventory_alerts").select("*").eq("store_id", storeId),
    ]);

    const alertMap = new Map((alerts || []).map((a: any) => [a.product_id, a]));
    setProducts((prods || []).map((p: any) => {
      const alert = alertMap.get(p.id);
      return {
        ...p,
        alert_id: alert?.id || null,
        threshold: alert?.threshold ?? 5,
        alert_active: alert?.is_active ?? false,
      };
    }));
    setLoading(false);
  };

  const saveAlert = async (product: ProductWithAlert, threshold: number, isActive: boolean) => {
    setSaving(product.id);
    if (product.alert_id) {
      await supabase.from("marketplace_inventory_alerts")
        .update({ threshold, is_active: isActive })
        .eq("id", product.alert_id);
    } else {
      await supabase.from("marketplace_inventory_alerts")
        .insert({ product_id: product.id, store_id: storeId, threshold, is_active: isActive });
    }
    setSaving(null);
    toast({ title: "Alert saved" });
    loadProducts();
  };

  const enableBulk = async () => {
    const threshold = parseInt(bulkThreshold) || 5;
    const toInsert = products.filter(p => !p.alert_id).map(p => ({
      product_id: p.id, store_id: storeId, threshold, is_active: true,
    }));
    const toUpdate = products.filter(p => p.alert_id).map(p => p.alert_id!);

    if (toInsert.length > 0) {
      await supabase.from("marketplace_inventory_alerts").insert(toInsert);
    }
    if (toUpdate.length > 0) {
      await supabase.from("marketplace_inventory_alerts")
        .update({ threshold, is_active: true })
        .in("id", toUpdate);
    }
    toast({ title: `Alerts enabled for ${products.length} products` });
    loadProducts();
  };

  const lowStockCount = products.filter(p => p.alert_active && p.stock_quantity <= p.threshold).length;

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-white/40">Products</p>
            <p className="text-lg font-bold text-white">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-white/40">Monitored</p>
            <p className="text-lg font-bold text-blue-400">{products.filter(p => p.alert_active).length}</p>
          </CardContent>
        </Card>
        <Card className={`border-white/10 ${lowStockCount > 0 ? "bg-red-500/10 border-red-500/20" : "bg-white/5"}`}>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-white/40">Low Stock</p>
            <p className={`text-lg font-bold ${lowStockCount > 0 ? "text-red-400" : "text-green-400"}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk enable */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-secondary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white">Bulk Enable Alerts</p>
            <p className="text-[10px] text-white/30">Set threshold for all products</p>
          </div>
          <Input type="number" value={bulkThreshold} onChange={e => setBulkThreshold(e.target.value)}
            className="w-16 h-7 text-xs border-white/10 bg-white/5 text-white text-center" />
          <Button size="sm" onClick={enableBulk} className="h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
            Apply All
          </Button>
        </CardContent>
      </Card>

      {/* Product list */}
      <div className="space-y-2">
        {products.map(p => {
          const isLow = p.alert_active && p.stock_quantity <= p.threshold;
          return (
            <Card key={p.id} className={`border-white/10 ${isLow ? "bg-red-500/10 border-red-500/20" : "bg-white/5"}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      {isLow && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40">Stock: <span className={isLow ? "text-red-400 font-semibold" : "text-white"}>{p.stock_quantity}</span></span>
                      <span className="text-xs text-white/40">Threshold: {p.threshold}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${p.status === "active" ? "border-green-500/30 text-green-400" : "border-white/10 text-white/30"}`}>
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      value={p.threshold}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, threshold: val } : x));
                      }}
                      className="w-14 h-7 text-xs border-white/10 bg-white/5 text-white text-center"
                    />
                    <Switch
                      checked={p.alert_active}
                      onCheckedChange={checked => saveAlert(p, p.threshold, checked)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveAlert(p, p.threshold, p.alert_active)}
                      disabled={saving === p.id} className="h-7 w-7 p-0 text-white/40 hover:text-white">
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MerchantInventoryAlerts;
