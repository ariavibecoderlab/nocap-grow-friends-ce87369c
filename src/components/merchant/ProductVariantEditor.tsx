import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Layers } from "lucide-react";

interface Variant {
  id?: string;
  variant_name: string;
  variant_value: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string;
  isNew?: boolean;
}

interface ProductVariantEditorProps {
  productId: string;
}

export default function ProductVariantEditor({ productId }: ProductVariantEditorProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_product_variants")
      .select("id, variant_name, variant_value, price_adjustment, stock_quantity, sku")
      .eq("product_id", productId)
      .order("sort_order");
    setVariants((data as Variant[]) || []);
    setLoading(false);
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { variant_name: "Size", variant_value: "", price_adjustment: 0, stock_quantity: 0, sku: "", isNew: true },
    ]);
  };

  const updateVariant = (idx: number, field: keyof Variant, value: string | number) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const removeVariant = async (idx: number) => {
    const v = variants[idx];
    if (v.id) {
      await supabase.from("marketplace_product_variants").delete().eq("id", v.id);
      toast({ title: "Variant removed" });
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    setSaving(true);
    let hasError = false;

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.variant_value.trim()) continue;

      const payload = {
        product_id: productId,
        variant_name: v.variant_name,
        variant_value: v.variant_value.trim(),
        price_adjustment: Number(v.price_adjustment) || 0,
        stock_quantity: Number(v.stock_quantity) || 0,
        sku: v.sku?.trim() || null,
        sort_order: i,
      };

      if (v.id) {
        const { error } = await supabase
          .from("marketplace_product_variants")
          .update(payload)
          .eq("id", v.id);
        if (error) hasError = true;
      } else {
        const { error } = await supabase
          .from("marketplace_product_variants")
          .insert(payload);
        if (error) hasError = true;
      }
    }

    if (hasError) {
      toast({ title: "Some variants failed to save", variant: "destructive" });
    } else {
      toast({ title: "Variants saved" });
    }

    await fetchVariants();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-semibold text-white">Variants</span>
          <span className="text-[10px] text-white/30">({variants.length})</span>
        </div>
        <Button size="sm" variant="outline" className="border-white/10 text-white/60 text-[10px] h-6 px-2" onClick={addVariant}>
          <Plus className="h-3 w-3 mr-0.5" /> Add
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="text-[10px] text-white/30 text-center py-2">No variants. Add size, color, or other options.</p>
      ) : (
        <div className="space-y-2">
          {variants.map((v, idx) => (
            <div key={v.id || `new-${idx}`} className="bg-white/5 rounded-md p-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-white/40 text-[10px]">Type</Label>
                  <Input
                    value={v.variant_name}
                    onChange={(e) => updateVariant(idx, "variant_name", e.target.value)}
                    placeholder="Size, Color..."
                    className="bg-white/5 border-white/10 text-white text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-white/40 text-[10px]">Value</Label>
                  <Input
                    value={v.variant_value}
                    onChange={(e) => updateVariant(idx, "variant_value", e.target.value)}
                    placeholder="S, M, L, Red..."
                    className="bg-white/5 border-white/10 text-white text-xs h-7 mt-0.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-white/40 text-[10px]">Price +/-</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={v.price_adjustment}
                    onChange={(e) => updateVariant(idx, "price_adjustment", e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs h-7 mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-white/40 text-[10px]">Stock</Label>
                  <Input
                    type="number"
                    value={v.stock_quantity}
                    onChange={(e) => updateVariant(idx, "stock_quantity", e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-xs h-7 mt-0.5"
                  />
                </div>
                <div className="flex items-end">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400" onClick={() => removeVariant(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variants.length > 0 && (
        <Button size="sm" className="w-full bg-secondary/20 text-secondary hover:bg-secondary/30 text-xs h-7" onClick={saveAll} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Save Variants
        </Button>
      )}
    </div>
  );
}
