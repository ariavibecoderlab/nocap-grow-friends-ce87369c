import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Plus, Trash2, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  bundle_price: number;
  compare_price: number;
  is_active: boolean;
  created_at: string;
  items?: BundleItem[];
}

interface BundleItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: { id: string; name: string; price: number; images: any };
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: any;
}

interface Props {
  storeId: string;
}

const MerchantProductBundles = ({ storeId }: Props) => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [form, setForm] = useState({ name: "", description: "", bundle_price: "", compare_price: "" });
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBundles();
    loadProducts();
  }, [storeId]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("marketplace_products")
      .select("id, name, price, images")
      .eq("store_id", storeId)
      .eq("status", "active");
    setProducts(data || []);
  };

  const loadBundles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_product_bundles")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (data) {
      const bundlesWithItems = await Promise.all(
        data.map(async (b: any) => {
          const { data: items } = await supabase
            .from("marketplace_bundle_items")
            .select("id, product_id, quantity")
            .eq("bundle_id", b.id);
          return { ...b, items: items || [] };
        })
      );
      setBundles(bundlesWithItems);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", bundle_price: "", compare_price: "" });
    setSelectedProducts([]);
    setShowForm(true);
  };

  const openEdit = (bundle: Bundle) => {
    setEditing(bundle);
    setForm({
      name: bundle.name,
      description: bundle.description || "",
      bundle_price: String(bundle.bundle_price),
      compare_price: String(bundle.compare_price),
    });
    setSelectedProducts(
      (bundle.items || []).map(i => ({ productId: i.product_id, quantity: i.quantity }))
    );
    setShowForm(true);
  };

  const addProduct = (productId: string) => {
    if (selectedProducts.find(p => p.productId === productId)) return;
    setSelectedProducts(prev => [...prev, { productId, quantity: 1 }]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    setSelectedProducts(prev =>
      prev.map(p => (p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p))
    );
  };

  const calcComparePrice = () => {
    return selectedProducts.reduce((total, sp) => {
      const product = products.find(p => p.id === sp.productId);
      return total + (product?.price || 0) * sp.quantity;
    }, 0);
  };

  const handleSave = async () => {
    if (!form.name.trim() || selectedProducts.length < 2) {
      toast({ title: "Bundle needs a name and at least 2 products", variant: "destructive" });
      return;
    }
    setSaving(true);
    const comparePrice = calcComparePrice();
    const bundlePrice = parseFloat(form.bundle_price) || comparePrice;

    if (editing) {
      await supabase
        .from("marketplace_product_bundles")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          bundle_price: bundlePrice,
          compare_price: comparePrice,
        })
        .eq("id", editing.id);

      await supabase.from("marketplace_bundle_items").delete().eq("bundle_id", editing.id);
      await supabase.from("marketplace_bundle_items").insert(
        selectedProducts.map(sp => ({
          bundle_id: editing.id,
          product_id: sp.productId,
          quantity: sp.quantity,
        }))
      );
    } else {
      const { data: newBundle } = await supabase
        .from("marketplace_product_bundles")
        .insert({
          store_id: storeId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          bundle_price: bundlePrice,
          compare_price: comparePrice,
        })
        .select("id")
        .single();

      if (newBundle) {
        await supabase.from("marketplace_bundle_items").insert(
          selectedProducts.map(sp => ({
            bundle_id: newBundle.id,
            product_id: sp.productId,
            quantity: sp.quantity,
          }))
        );
      }
    }

    toast({ title: editing ? "Bundle updated" : "Bundle created" });
    setShowForm(false);
    setSaving(false);
    loadBundles();
  };

  const toggleActive = async (bundle: Bundle) => {
    await supabase
      .from("marketplace_product_bundles")
      .update({ is_active: !bundle.is_active })
      .eq("id", bundle.id);
    loadBundles();
  };

  const deleteBundle = async (id: string) => {
    await supabase.from("marketplace_bundle_items").delete().eq("bundle_id", id);
    await supabase.from("marketplace_product_bundles").delete().eq("id", id);
    toast({ title: "Bundle deleted" });
    loadBundles();
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Product Bundles</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 h-8 text-xs">
          <Plus className="h-3 w-3" /> New Bundle
        </Button>
      </div>

      {bundles.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <Package className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No bundles yet</p>
          <p className="text-xs mt-1">Create product bundles to offer deals</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bundles.map(bundle => {
            const savings = bundle.compare_price - bundle.bundle_price;
            const pct = bundle.compare_price > 0 ? Math.round((savings / bundle.compare_price) * 100) : 0;

            return (
              <Card key={bundle.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{bundle.name}</p>
                        {pct > 0 && (
                          <span className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full font-bold">
                            Save {pct}%
                          </span>
                        )}
                      </div>
                      {bundle.description && (
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{bundle.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-secondary font-bold">RM {bundle.bundle_price.toFixed(2)}</span>
                        {savings > 0 && (
                          <span className="text-[10px] text-white/30 line-through">RM {bundle.compare_price.toFixed(2)}</span>
                        )}
                        <span className="text-[10px] text-white/30">{bundle.items?.length || 0} products</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={bundle.is_active} onCheckedChange={() => toggleActive(bundle)} />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(bundle)} className="h-7 w-7 text-white/40 hover:text-white">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteBundle(bundle.id)} className="h-7 w-7 text-destructive/60 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
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
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/60 text-xs">Bundle Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="e.g. Starter Pack" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="Optional description" />
            </div>

            {/* Product Selection */}
            <div>
              <Label className="text-white/60 text-xs">Products ({selectedProducts.length} selected)</Label>
              <div className="mt-1 max-h-32 overflow-y-auto space-y-1 border border-white/10 rounded-lg p-2">
                {products.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).map(p => (
                  <button key={p.id} onClick={() => addProduct(p.id)}
                    className="w-full text-left text-[11px] text-white/60 hover:text-white hover:bg-white/5 px-2 py-1 rounded flex justify-between">
                    <span className="truncate">{p.name}</span>
                    <span className="text-white/30 shrink-0 ml-2">RM {p.price.toFixed(2)}</span>
                  </button>
                ))}
                {products.filter(p => !selectedProducts.find(sp => sp.productId === p.id)).length === 0 && (
                  <p className="text-[10px] text-white/30 text-center py-2">All products added</p>
                )}
              </div>
            </div>

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="space-y-1">
                {selectedProducts.map(sp => {
                  const product = products.find(p => p.id === sp.productId);
                  return (
                    <div key={sp.productId} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                      <span className="text-[11px] text-white flex-1 truncate">{product?.name}</span>
                      <Input type="number" min={1} value={sp.quantity}
                        onChange={e => updateQuantity(sp.productId, parseInt(e.target.value) || 1)}
                        className="w-14 h-6 text-[10px] bg-white/5 border-white/10 text-white text-center" />
                      <button onClick={() => removeProduct(sp.productId)} className="text-destructive/60 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex justify-between text-[10px] text-white/40 px-1 pt-1">
                  <span>Individual total: RM {calcComparePrice().toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-white/60 text-xs">Bundle Price (RM)</Label>
              <Input type="number" step="0.01" value={form.bundle_price}
                onChange={e => setForm(f => ({ ...f, bundle_price: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder={`e.g. ${(calcComparePrice() * 0.9).toFixed(2)}`} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-secondary text-primary hover:bg-secondary/90">
              {saving ? "Saving..." : editing ? "Update Bundle" : "Create Bundle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantProductBundles;
