import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Variant {
  id: string;
  variant_name: string;
  variant_value: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string | null;
}

interface VariantSelectorProps {
  productId: string;
  onVariantSelect: (variant: Variant | null) => void;
}

export default function VariantSelector({ productId, onVariantSelect }: VariantSelectorProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("marketplace_product_variants")
        .select("id, variant_name, variant_value, price_adjustment, stock_quantity, sku")
        .eq("product_id", productId)
        .order("sort_order");
      if (data) setVariants(data as Variant[]);
    };
    fetch();
  }, [productId]);

  // Group by variant_name (e.g. "Size" -> ["S", "M", "L"])
  const groups = useMemo(() => {
    const map: Record<string, Variant[]> = {};
    variants.forEach((v) => {
      if (!map[v.variant_name]) map[v.variant_name] = [];
      map[v.variant_name].push(v);
    });
    return map;
  }, [variants]);

  const groupNames = Object.keys(groups);

  // When selection changes, find the matching variant
  useEffect(() => {
    if (groupNames.length === 0) {
      onVariantSelect(null);
      return;
    }
    // Check all groups have a selection
    const allSelected = groupNames.every((name) => selected[name]);
    if (!allSelected) {
      onVariantSelect(null);
      return;
    }
    // Find variant matching all selections
    const match = variants.find((v) => selected[v.variant_name] === v.variant_value);
    onVariantSelect(match || null);
  }, [selected, variants, groupNames]);

  if (variants.length === 0) return null;

  const handleSelect = (name: string, value: string) => {
    setSelected((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-3 mt-4">
      {groupNames.map((name) => (
        <div key={name}>
          <label className="text-xs text-white/50 mb-1.5 block font-medium">{name}</label>
          <div className="flex flex-wrap gap-1.5">
            {groups[name].map((v) => {
              const isSelected = selected[name] === v.variant_value;
              const outOfStock = v.stock_quantity <= 0;
              return (
                <button
                  key={v.id}
                  onClick={() => !outOfStock && handleSelect(name, v.variant_value)}
                  disabled={outOfStock}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? "border-secondary bg-secondary/20 text-secondary"
                      : outOfStock
                        ? "border-white/5 text-white/20 cursor-not-allowed line-through"
                        : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {v.variant_value}
                  {v.price_adjustment > 0 && (
                    <span className="text-[10px] ml-1 text-white/30">+RM{v.price_adjustment.toFixed(2)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
