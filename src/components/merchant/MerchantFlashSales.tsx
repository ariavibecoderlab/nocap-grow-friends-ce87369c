import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Zap, Trash2, Loader2, Edit, Clock } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface FlashSaleRow {
  id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  starts_at: string;
  ends_at: string;
  max_quantity: number;
  sold_quantity: number;
  is_active: boolean;
  product_name?: string;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

interface MerchantFlashSalesProps {
  storeId: string;
}

export default function MerchantFlashSales({ storeId }: MerchantFlashSalesProps) {
  const { toast } = useToast();
  const [sales, setSales] = useState<FlashSaleRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSaleRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [selectedProduct, setSelectedProduct] = useState("");
  const [flashPrice, setFlashPrice] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [startsAt, setStartsAt] = useState<Date | undefined>(undefined);
  const [startsTime, setStartsTime] = useState("00:00");
  const [endsAt, setEndsAt] = useState<Date | undefined>(undefined);
  const [endsTime, setEndsTime] = useState("23:59");

  useEffect(() => {
    fetchAll();
  }, [storeId]);

  const fetchAll = async () => {
    setLoading(true);
    const [salesRes, prodsRes] = await Promise.all([
      supabase
        .from("marketplace_flash_sales")
        .select("id, product_id, flash_price, original_price, starts_at, ends_at, max_quantity, sold_quantity, is_active, marketplace_products!inner(name)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketplace_products")
        .select("id, name, price")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("name"),
    ]);

    if (salesRes.data) {
      setSales(
        salesRes.data.map((s: any) => ({
          ...s,
          product_name: s.marketplace_products?.name,
        }))
      );
    }
    if (prodsRes.data) setProducts(prodsRes.data as ProductOption[]);
    setLoading(false);
  };

  const resetForm = () => {
    setEditingSale(null);
    setSelectedProduct("");
    setFlashPrice("");
    setMaxQuantity("");
    setStartsAt(undefined);
    setStartsTime("00:00");
    setEndsAt(undefined);
    setEndsTime("23:59");
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (sale: FlashSaleRow) => {
    setEditingSale(sale);
    setSelectedProduct(sale.product_id);
    setFlashPrice(String(sale.flash_price));
    setMaxQuantity(String(sale.max_quantity));
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);
    setStartsAt(start);
    setStartsTime(format(start, "HH:mm"));
    setEndsAt(end);
    setEndsTime(format(end, "HH:mm"));
    setShowDialog(true);
  };

  const buildDateTime = (date: Date, time: string): string => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const handleSave = async () => {
    if (!selectedProduct || !flashPrice || !startsAt || !endsAt) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const startsIso = buildDateTime(startsAt, startsTime);
    const endsIso = buildDateTime(endsAt, endsTime);

    if (new Date(endsIso) <= new Date(startsIso)) {
      toast({ title: "End date must be after start date", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      store_id: storeId,
      product_id: selectedProduct,
      flash_price: Number(flashPrice),
      original_price: product.price,
      starts_at: startsIso,
      ends_at: endsIso,
      max_quantity: Number(maxQuantity) || 0,
    };

    if (editingSale) {
      const { error } = await supabase
        .from("marketplace_flash_sales")
        .update(payload)
        .eq("id", editingSale.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Flash sale updated" });
    } else {
      const { error } = await supabase
        .from("marketplace_flash_sales")
        .insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Flash sale created!" });
    }

    await fetchAll();
    setShowDialog(false);
    resetForm();
    setSaving(false);
  };

  const toggleActive = async (sale: FlashSaleRow) => {
    await supabase
      .from("marketplace_flash_sales")
      .update({ is_active: !sale.is_active })
      .eq("id", sale.id);
    await fetchAll();
  };

  const deleteSale = async (id: string) => {
    await supabase.from("marketplace_flash_sales").delete().eq("id", id);
    await fetchAll();
    toast({ title: "Flash sale deleted" });
  };

  const getStatus = (sale: FlashSaleRow) => {
    const now = Date.now();
    const start = new Date(sale.starts_at).getTime();
    const end = new Date(sale.ends_at).getTime();
    if (!sale.is_active) return { label: "Inactive", color: "text-white/40" };
    if (now < start) return { label: "Scheduled", color: "text-blue-400" };
    if (now > end) return { label: "Ended", color: "text-white/40" };
    return { label: "Live", color: "text-green-400" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-400" />
          <span className="text-sm font-semibold text-white">Flash Sales</span>
          <span className="text-[10px] text-white/30">({sales.length})</span>
        </div>
        <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 text-xs h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Sale
        </Button>
      </div>

      {sales.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8">
            <Zap className="h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/40">No flash sales yet</p>
            <p className="text-[10px] text-white/30 mt-1">Create limited-time deals to boost sales</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => {
            const status = getStatus(sale);
            const discount = Math.round(((sale.original_price - sale.flash_price) / sale.original_price) * 100);
            return (
              <Card key={sale.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{sale.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-red-400">RM {sale.flash_price.toFixed(2)}</span>
                        <span className="text-[10px] text-white/30 line-through">RM {sale.original_price.toFixed(2)}</span>
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">-{discount}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
                        <span className={`font-medium ${status.color}`}>● {status.label}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(sale.starts_at), "dd MMM HH:mm")} — {format(new Date(sale.ends_at), "dd MMM HH:mm")}
                        </span>
                      </div>
                      {sale.max_quantity > 0 && (
                        <div className="mt-1.5">
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden w-32">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                              style={{ width: `${Math.min((sale.sold_quantity / sale.max_quantity) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-white/30 mt-0.5">{sale.sold_quantity}/{sale.max_quantity} sold</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <Switch
                        checked={sale.is_active}
                        onCheckedChange={() => toggleActive(sale)}
                        className="scale-75"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openEdit(sale)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400" onClick={() => deleteSale(sale.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) resetForm(); setShowDialog(o); }}>
        <DialogContent className="bg-primary border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-400" />
              {editingSale ? "Edit Flash Sale" : "Create Flash Sale"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Product selection */}
            <div>
              <Label className="text-white/60 text-xs">Product</Label>
              <Select value={selectedProduct} onValueChange={(val) => {
                setSelectedProduct(val);
                const p = products.find((p) => p.id === val);
                if (p && !editingSale) setFlashPrice(String((p.price * 0.8).toFixed(2)));
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10 text-white">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — RM {p.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flash price */}
            <div>
              <Label className="text-white/60 text-xs">Flash Sale Price (RM)</Label>
              <Input
                type="number"
                step="0.01"
                value={flashPrice}
                onChange={(e) => setFlashPrice(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="0.00"
              />
              {selectedProduct && flashPrice && (
                <p className="text-[10px] text-red-400 mt-1">
                  {Math.round(((products.find((p) => p.id === selectedProduct)?.price || 0) - Number(flashPrice)) / (products.find((p) => p.id === selectedProduct)?.price || 1) * 100)}% discount
                </p>
              )}
            </div>

            {/* Max quantity */}
            <div>
              <Label className="text-white/60 text-xs">Max Quantity (0 = unlimited)</Label>
              <Input
                type="number"
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="0"
              />
            </div>

            {/* Start date/time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 bg-white/5 border-white/10 text-white text-xs", !startsAt && "text-white/30")}>
                      {startsAt ? format(startsAt, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-primary border-white/10" align="start">
                    <Calendar mode="single" selected={startsAt} onSelect={setStartsAt} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Start Time</Label>
                <Input type="time" value={startsTime} onChange={(e) => setStartsTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1 text-xs" />
              </div>
            </div>

            {/* End date/time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 bg-white/5 border-white/10 text-white text-xs", !endsAt && "text-white/30")}>
                      {endsAt ? format(endsAt, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-primary border-white/10" align="start">
                    <Calendar mode="single" selected={endsAt} onSelect={setEndsAt} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-white/60 text-xs">End Time</Label>
                <Input type="time" value={endsTime} onChange={(e) => setEndsTime(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1 text-xs" />
              </div>
            </div>

            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingSale ? "Update Flash Sale" : "Create Flash Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
