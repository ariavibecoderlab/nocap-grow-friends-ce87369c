import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, X, Plus, Star, ShoppingBag } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useNavigate } from "react-router-dom";

interface CompareProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  stock_quantity: number;
  sold_count: number;
  description: string | null;
  store_id: string;
  store_name?: string;
  store_slug?: string;
  rating?: number;
  review_count?: number;
  category_name?: string;
}

// Singleton state for compare list (shared across components)
let compareList: string[] = [];
let listeners: Set<() => void> = new Set();

function notify() { listeners.forEach(fn => fn()); }

export function addToCompare(productId: string) {
  if (compareList.length >= 3 || compareList.includes(productId)) return;
  compareList = [...compareList, productId];
  notify();
}

export function removeFromCompare(productId: string) {
  compareList = compareList.filter(id => id !== productId);
  notify();
}

export function isInCompare(productId: string) {
  return compareList.includes(productId);
}

export function useCompareList() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return compareList;
}

export function clearCompare() {
  compareList = [];
  notify();
}

// Floating compare bar shown when items are selected
export function CompareBar() {
  const items = useCompareList();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
        <Button
          onClick={() => setOpen(true)}
          className="bg-secondary text-primary hover:bg-secondary/90 shadow-lg gap-2 rounded-full px-5 h-10"
        >
          <GitCompareArrows className="h-4 w-4" />
          Compare ({items.length}/3)
        </Button>
      </div>
      <CompareDialog open={open} onOpenChange={setOpen} productIds={items} />
    </>
  );
}

// Full comparison dialog
function CompareDialog({ open, onOpenChange, productIds }: { open: boolean; onOpenChange: (v: boolean) => void; productIds: string[] }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || productIds.length === 0) return;
    setLoading(true);
    (async () => {
      const { data: prods } = await supabase
        .from("marketplace_products")
        .select("id, name, price, images, stock_quantity, sold_count, description, store_id, category_id")
        .in("id", productIds);

      if (!prods) { setLoading(false); return; }

      // Fetch store info
      const storeIds = [...new Set(prods.map(p => p.store_id))];
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, store_name, slug")
        .in("id", storeIds);

      const storeMap: Record<string, { store_name: string; slug: string }> = {};
      storeData?.forEach(s => { storeMap[s.id] = s; });

      // Fetch category info
      const catIds = prods.map(p => p.category_id).filter(Boolean) as string[];
      const { data: catData } = catIds.length > 0
        ? await supabase.from("marketplace_categories").select("id, name").in("id", catIds)
        : { data: [] };
      const catMap: Record<string, string> = {};
      catData?.forEach(c => { catMap[c.id] = c.name; });

      // Fetch ratings
      const { data: reviews } = await supabase
        .from("marketplace_reviews")
        .select("product_id, rating")
        .in("product_id", productIds);

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      reviews?.forEach(r => {
        if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
        ratingMap[r.product_id].sum += r.rating;
        ratingMap[r.product_id].count += 1;
      });

      const result: CompareProduct[] = prods.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: (p.images as string[]) || [],
        stock_quantity: p.stock_quantity,
        sold_count: p.sold_count,
        description: p.description,
        store_id: p.store_id,
        store_name: storeMap[p.store_id]?.store_name,
        store_slug: storeMap[p.store_id]?.slug,
        rating: ratingMap[p.id] ? ratingMap[p.id].sum / ratingMap[p.id].count : undefined,
        review_count: ratingMap[p.id]?.count || 0,
        category_name: p.category_id ? catMap[p.category_id] : undefined,
      }));

      // Maintain order
      const ordered = productIds.map(id => result.find(p => p.id === id)).filter(Boolean) as CompareProduct[];
      setProducts(ordered);
      setLoading(false);
    })();
  }, [open, productIds]);

  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    {
      label: "Price",
      render: (p) => {
        const prices = products.map(x => x.price);
        const lowest = Math.min(...prices);
        return (
          <span className={`font-bold ${p.price === lowest && products.length > 1 ? "text-green-400" : "text-secondary"}`}>
            RM {p.price.toFixed(2)}
          </span>
        );
      },
    },
    {
      label: "Rating",
      render: (p) => p.rating ? (
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-secondary text-secondary" />
          {p.rating.toFixed(1)} <span className="text-white/30">({p.review_count})</span>
        </span>
      ) : <span className="text-white/30">No reviews</span>,
    },
    {
      label: "Sold",
      render: (p) => <span>{p.sold_count} sold</span>,
    },
    {
      label: "Stock",
      render: (p) => p.stock_quantity > 0
        ? <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">{p.stock_quantity} in stock</Badge>
        : <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Out of stock</Badge>,
    },
    {
      label: "Category",
      render: (p) => <span className="text-white/60">{p.category_name || "—"}</span>,
    },
    {
      label: "Store",
      render: (p) => (
        <button
          className="text-secondary text-xs hover:underline"
          onClick={() => { onOpenChange(false); navigate(`/store/${p.store_slug}`); }}
        >
          {p.store_name}
        </button>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-primary border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <GitCompareArrows className="h-5 w-5 text-secondary" />
            Product Comparison
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-white/40 w-24"></th>
                  {products.map(p => (
                    <th key={p.id} className="p-2 text-center min-w-[140px]">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(p.id)}
                          className="absolute -top-1 -right-1 rounded-full bg-white/10 p-0.5 hover:bg-white/20 z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div
                          className="cursor-pointer"
                          onClick={() => { onOpenChange(false); navigate(`/store/${p.store_slug}/product/${p.id}`); }}
                        >
                          <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden bg-white/5 mb-2">
                            {p.images[0] ? (
                              <img src={getOptimizedImageUrl(p.images[0], 192, 192)} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="h-8 w-8 text-white/10" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-white text-xs line-clamp-2 hover:text-secondary transition-colors">
                            {p.name}
                          </p>
                        </div>
                      </div>
                    </th>
                  ))}
                  {products.length < 3 && (
                    <th className="p-2 text-center min-w-[140px]">
                      <div className="w-24 h-24 mx-auto rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center mb-2">
                        <Plus className="h-6 w-6 text-white/20" />
                      </div>
                      <p className="text-white/30 text-[10px]">Add product</p>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label} className="border-t border-white/5">
                    <td className="p-2 text-white/40 font-medium">{row.label}</td>
                    {products.map(p => (
                      <td key={p.id} className="p-2 text-center">{row.render(p)}</td>
                    ))}
                    {products.length < 3 && <td className="p-2"></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/40 text-xs"
            onClick={() => { clearCompare(); onOpenChange(false); }}
          >
            Clear all
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
