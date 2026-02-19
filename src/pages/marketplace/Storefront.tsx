import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { CartDrawer } from "@/components/marketplace/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Store, Phone, Mail, MessageCircle, ArrowLeft, Grid3X3, List } from "lucide-react";

interface StoreData {
  id: string;
  store_name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme: "classic" | "bold" | "minimal";
  primary_color: string;
  status: string;
  whatsapp: string | null;
  email: string | null;
  shipping_flat_rate: number;
  free_shipping_min: number | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  images: string[];
  status: string;
  is_featured: boolean;
  description: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function Storefront() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getStoreItems } = useCart();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const cartItems = slug ? getStoreItems(slug) : [];
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!slug) return;
    const fetchStore = async () => {
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("*")
        .eq("slug", slug)
        .eq("status", "live")
        .single();

      if (!storeData) { navigate("/marketplace"); return; }
      setStore(storeData as StoreData);

      const [{ data: prodData }, { data: catData }] = await Promise.all([
        supabase.from("marketplace_products").select("*").eq("store_id", storeData.id).eq("status", "active").order("is_featured", { ascending: false }),
        supabase.from("marketplace_categories").select("*").eq("store_id", storeData.id).order("sort_order"),
      ]);

      setProducts((prodData as Product[]) || []);
      setCategories((catData as Category[]) || []);
      setLoading(false);
    };
    fetchStore();
  }, [slug, navigate]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = filteredProducts.filter((p) => p.is_featured);
  const regularProducts = filteredProducts.filter((p) => !p.is_featured);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!store) return null;
  const pc = store.primary_color;

  // ── BOLD THEME ──────────────────────────────────────────────────────────────
  if (store.theme === "bold") {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Banner */}
        <div className="relative h-56 overflow-hidden" style={{ backgroundColor: pc }}>
          {store.banner_url && (
            <img src={store.banner_url} alt={store.store_name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          <button onClick={() => navigate("/marketplace")} className="absolute top-4 left-4 rounded-full p-2 bg-black/30 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="absolute top-4 right-4 rounded-full p-2 bg-black/30 text-white backdrop-blur"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            {store.logo_url && (
              <div className="h-12 w-12 rounded-full bg-white border-2 overflow-hidden">
                <img src={store.logo_url} alt="logo" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white font-display">{store.store_name}</h1>
              {store.tagline && <p className="text-sm text-white/80">{store.tagline}</p>}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${!selectedCategory ? "text-black" : "bg-muted text-muted-foreground"}`}
                style={!selectedCategory ? { backgroundColor: pc } : {}}
              >All</button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === c.id ? "text-black" : "bg-muted text-muted-foreground"}`}
                  style={selectedCategory === c.id ? { backgroundColor: pc } : {}}
                >{c.name}</button>
              ))}
            </div>
          )}

          {featuredProducts.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Featured</p>
              <div className="grid grid-cols-1 gap-3">
                {featuredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} storeId={store.id} slug={store.slug} primaryColor={pc} theme="bold"
                    onClick={() => navigate(`/marketplace/${slug}/product/${p.id}`)} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {regularProducts.map((p) => (
              <ProductCard key={p.id} product={p} storeId={store.id} slug={store.slug} primaryColor={pc} theme="bold"
                onClick={() => navigate(`/marketplace/${slug}/product/${p.id}`)} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
              <Store className="h-10 w-10 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>

        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} slug={store.slug} primaryColor={pc}
          shippingFlatRate={store.shipping_flat_rate} freeShippingMin={store.free_shipping_min} />
      </div>
    );
  }

  // ── MINIMAL THEME ────────────────────────────────────────────────────────────
  if (store.theme === "minimal") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-4">
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <button onClick={() => navigate("/marketplace")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="font-bold text-lg text-foreground font-display">{store.store_name}</h1>
            </div>
            <button onClick={() => setCartOpen(true)} className="relative text-muted-foreground hover:text-foreground">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: pc }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="py-6">
            {store.tagline && <p className="text-muted-foreground mb-6 text-sm">{store.tagline}</p>}

            {categories.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 mb-4 no-scrollbar">
                <button onClick={() => setSelectedCategory(null)} className={`text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory ? "font-bold" : "text-muted-foreground"}`} style={!selectedCategory ? { color: pc } : {}}>All</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)} className={`text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === c.id ? "font-bold" : "text-muted-foreground"}`} style={selectedCategory === c.id ? { color: pc } : {}}>{c.name}</button>
                ))}
              </div>
            )}

            <div className="divide-y divide-border">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} storeId={store.id} slug={store.slug} primaryColor={pc} theme="minimal"
                  onClick={() => navigate(`/marketplace/${slug}/product/${p.id}`)} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>

        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} slug={store.slug} primaryColor={pc}
          shippingFlatRate={store.shipping_flat_rate} freeShippingMin={store.free_shipping_min} />
      </div>
    );
  }

  // ── CLASSIC THEME (default) ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt="logo" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: pc + "33" }}>
                <Store className="h-4 w-4" style={{ color: pc }} />
              </div>
            )}
            <span className="font-bold text-foreground font-display truncate">{store.store_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="text-muted-foreground hover:text-foreground">
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </button>
            <button onClick={() => setCartOpen(true)} className="relative text-muted-foreground hover:text-foreground">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: pc }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      {store.banner_url && (
        <div className="h-32 overflow-hidden">
          <img src={store.banner_url} alt={store.store_name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4">
        {store.tagline && <p className="text-muted-foreground text-sm mb-4">{store.tagline}</p>}

        {/* Contact info */}
        {(store.whatsapp || store.email) && (
          <div className="flex gap-3 mb-4">
            {store.whatsapp && (
              <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {store.email && (
              <a href={`mailto:${store.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
          </div>
        )}

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
            <Badge
              variant={!selectedCategory ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap text-xs"
              style={!selectedCategory ? { backgroundColor: pc, color: "#000", border: "none" } : {}}
              onClick={() => setSelectedCategory(null)}
            >All</Badge>
            {categories.map((c) => (
              <Badge
                key={c.id}
                variant={selectedCategory === c.id ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap text-xs"
                style={selectedCategory === c.id ? { backgroundColor: pc, color: "#000", border: "none" } : {}}
                onClick={() => setSelectedCategory(c.id === selectedCategory ? null : c.id)}
              >{c.name}</Badge>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
            <Store className="h-10 w-10 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} storeId={store.id} slug={store.slug} primaryColor={pc} theme="classic"
                onClick={() => navigate(`/marketplace/${slug}/product/${p.id}`)} />
            ))}
          </div>
        ) : (
          <div>
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} storeId={store.id} slug={store.slug} primaryColor={pc} theme="minimal"
                onClick={() => navigate(`/marketplace/${slug}/product/${p.id}`)} />
            ))}
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} slug={store.slug} primaryColor={pc}
        shippingFlatRate={store.shipping_flat_rate} freeShippingMin={store.free_shipping_min} />
    </div>
  );
}
