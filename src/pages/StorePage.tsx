import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/marketplace/CartDrawer";
import ProductCard from "@/components/marketplace/ProductCard";
import { ArrowLeft, Store, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Json } from "@/integrations/supabase/types";

interface StoreData {
  id: string;
  slug: string;
  store_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  theme: string;
  shipping_flat_rate: number;
  free_shipping_min: number | null;
}

interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  price: number;
  images: Json;
  stock_quantity: number;
  is_featured: boolean;
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, slug, store_name, tagline, description, logo_url, banner_url, primary_color, theme, shipping_flat_rate, free_shipping_min")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();

      if (!storeData) { setLoading(false); return; }
      setStore(storeData as StoreData);

      const [prodRes, catRes] = await Promise.all([
        supabase.from("marketplace_products")
          .select("id, store_id, name, price, images, stock_quantity, is_featured, category_id")
          .eq("store_id", storeData.id)
          .eq("status", "active")
          .order("is_featured", { ascending: false }),
        supabase.from("marketplace_categories")
          .select("id, name, sort_order")
          .eq("store_id", storeData.id)
          .order("sort_order"),
      ]);

      const prods = (prodRes.data as ProductRow[]) || [];
      setProducts(prods);
      setCategories((catRes.data as CategoryRow[]) || []);

      // Fetch average ratings for all products
      if (prods.length > 0) {
        const productIds = prods.map(p => p.id);
        const { data: reviewData } = await supabase
          .from("marketplace_reviews")
          .select("product_id, rating")
          .in("product_id", productIds);
        if (reviewData && reviewData.length > 0) {
          const ratingMap: Record<string, { sum: number; count: number }> = {};
          reviewData.forEach((r: any) => {
            if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
            ratingMap[r.product_id].sum += r.rating;
            ratingMap[r.product_id].count += 1;
          });
          const avgMap: Record<string, number> = {};
          Object.entries(ratingMap).forEach(([id, { sum, count }]) => {
            avgMap[id] = sum / count;
          });
          setRatings(avgMap);
        }
      }

      setLoading(false);
    };
    fetch();
  }, [slug]);

  const filtered = products.filter(p => {
    const matchCat = selectedCat === "all" || p.category_id === selectedCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pt-8">
          <div className="mx-auto max-w-md">
            <button onClick={() => navigate("/marketplace")} className="rounded-full p-1 hover:bg-white/10 text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center py-20 text-white/40">
              <Store className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">Store not found</p>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Banner */}
      <div className="relative h-40 bg-white/5 overflow-hidden">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-secondary/5" />
        )}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button onClick={() => navigate("/marketplace")} className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60 backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CartDrawer />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Store Info */}
        <div className="flex items-end gap-3 -mt-8 relative z-10">
          <div className="h-16 w-16 rounded-xl border-2 border-primary bg-white/10 overflow-hidden shadow-lg shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                <Store className="h-6 w-6 text-secondary" />
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="font-display text-xl font-bold text-white">{store.store_name}</h1>
            {store.tagline && <p className="text-xs text-white/50">{store.tagline}</p>}
          </div>
        </div>

        {store.description && (
          <p className="text-xs text-white/40 mt-3">{store.description}</p>
        )}

        {/* Shipping info */}
        <div className="mt-3 text-[11px] text-white/40">
          {store.free_shipping_min ? (
            <span>Free shipping above RM {store.free_shipping_min} · Flat rate: RM {store.shipping_flat_rate.toFixed(2)}</span>
          ) : (
            <span>Shipping: RM {store.shipping_flat_rate.toFixed(2)}</span>
          )}
        </div>

        {/* Search + Categories */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCat("all")}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCat === "all" ? "bg-secondary text-primary" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCat === cat.id ? "bg-secondary text-primary" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              storeId={p.store_id}
              name={p.name}
              price={p.price}
              images={(p.images as string[]) || []}
              stockQuantity={p.stock_quantity}
              storeSlug={store.slug}
              rating={ratings[p.id]}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-white/40">
            <Store className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default StorePage;
