import { useEffect, useState, useMemo, useRef, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/marketplace/CartDrawer";
import ProductCard from "@/components/marketplace/ProductCard";
import NocapLogo from "@/components/NocapLogo";
import { ArrowLeft, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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

interface StoreInfo {
  id: string;
  slug: string;
  store_name: string;
  logo_url: string | null;
}

interface CategoryInfo {
  id: string;
  name: string;
  store_id: string;
}

type SortOption = "featured" | "price_low" | "price_high" | "rating" | "newest";

const PAGE_SIZE = 12;

const Marketplace = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [priceInited, setPriceInited] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      // Fetch all live stores, active products, and categories in parallel
      const [storesRes, productsRes, categoriesRes] = await Promise.all([
        supabase
          .from("marketplace_stores")
          .select("id, slug, store_name, logo_url")
          .eq("status", "live")
          .order("store_name"),
        supabase
          .from("marketplace_products")
          .select("id, store_id, name, price, images, stock_quantity, is_featured, category_id")
          .eq("status", "active")
          .order("is_featured", { ascending: false }),
        supabase
          .from("marketplace_categories")
          .select("id, name, store_id")
          .order("sort_order"),
      ]);

      const storeList = (storesRes.data as StoreInfo[]) || [];
      const productList = (productsRes.data as ProductRow[]) || [];
      const categoryList = (categoriesRes.data as CategoryInfo[]) || [];

      setStores(storeList);
      setProducts(productList);
      setCategories(categoryList);

      // Fetch average ratings for all products
      if (productList.length > 0) {
        const { data: reviewData } = await supabase
          .from("marketplace_reviews")
          .select("product_id, rating");
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
    load();
  }, []);

  // Compute global price bounds
  const priceBounds = useMemo<[number, number]>(() => {
    if (products.length === 0) return [0, 100];
    const prices = products.map(p => p.price);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [products]);

  // Init price range once products load
  useEffect(() => {
    if (!priceInited && products.length > 0) {
      setPriceRange(priceBounds);
      setPriceInited(true);
    }
  }, [products, priceInited, priceBounds]);

  // Build a store lookup map
  const storeMap = useMemo(() => {
    const map: Record<string, StoreInfo> = {};
    stores.forEach(s => { map[s.id] = s; });
    return map;
  }, [stores]);

  // Categories filtered by selected store
  const visibleCategories = useMemo(() => {
    if (selectedStore === "all") return categories;
    return categories.filter(c => c.store_id === selectedStore);
  }, [categories, selectedStore]);

  // Reset category when store changes and category no longer valid
  useEffect(() => {
    if (selectedCategory !== "all" && !visibleCategories.find(c => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [visibleCategories, selectedCategory]);

  const priceFilterActive = priceInited && (priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1]);

  // Active filter count
  const activeFilterCount = [
    selectedStore !== "all",
    selectedCategory !== "all",
    sortBy !== "featured",
    priceFilterActive,
    inStockOnly,
  ].filter(Boolean).length;

  // Filtered & sorted products
  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const matchStore = selectedStore === "all" || p.store_id === selectedStore;
      const matchCat = selectedCategory === "all" || p.category_id === selectedCategory;
      const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchStock = !inStockOnly || p.stock_quantity > 0;
      return matchStore && matchCat && matchSearch && matchPrice && matchStock;
    });

    // Sort
    switch (sortBy) {
      case "price_low":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result = [...result].sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));
        break;
      case "newest":
        result = [...result].reverse();
        break;
      case "featured":
      default:
        // already sorted by is_featured desc from query
        break;
    }

    return result;
  }, [products, selectedStore, selectedCategory, search, sortBy, ratings, inStockOnly, priceRange]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedStore, selectedCategory, search, sortBy, inStockOnly, priceRange]);

  const hasMore = visibleCount < filtered.length;
  const visibleProducts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const clearFilters = () => {
    setSelectedStore("all");
    setSelectedCategory("all");
    setSortBy("featured");
    setPriceRange(priceBounds);
    setSearch("");
    setInStockOnly(false);
  };

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold flex-1 text-white">Shop</h1>
            <CartDrawer />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Search + Filter Toggle */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white px-2.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Filters</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[10px] text-secondary hover:underline">
                  Clear all
                </button>
              )}
            </div>

            {/* Store filter */}
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.store_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            {visibleCategories.length > 0 && (
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {visibleCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort */}
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Sort by</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            {priceBounds[1] > priceBounds[0] && (
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">
                  Price Range: RM {priceRange[0]} – RM {priceRange[1]}
                </label>
                <Slider
                  min={priceBounds[0]}
                  max={priceBounds[1]}
                  step={1}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  className="mt-2"
                />
              </div>
            )}

            {/* In Stock Only */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-white/40">In Stock Only</label>
              <Switch
                checked={inStockOnly}
                onCheckedChange={setInStockOnly}
                className="scale-75 origin-right"
              />
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {selectedStore !== "all" && (
              <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10 gap-1 cursor-pointer" onClick={() => setSelectedStore("all")}>
                {storeMap[selectedStore]?.store_name} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10 gap-1 cursor-pointer" onClick={() => setSelectedCategory("all")}>
                {visibleCategories.find(c => c.id === selectedCategory)?.name} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {sortBy !== "featured" && (
              <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10 gap-1 cursor-pointer" onClick={() => setSortBy("featured")}>
                {sortBy === "price_low" ? "Price ↑" : sortBy === "price_high" ? "Price ↓" : sortBy === "rating" ? "Top Rated" : "Newest"} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {priceFilterActive && (
              <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10 gap-1 cursor-pointer" onClick={() => setPriceRange(priceBounds)}>
                RM {priceRange[0]}–{priceRange[1]} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {inStockOnly && (
              <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary bg-secondary/10 gap-1 cursor-pointer" onClick={() => setInStockOnly(false)}>
                In Stock <X className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-[10px] text-white/30 mb-3">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          {selectedStore !== "all" ? ` from ${storeMap[selectedStore]?.store_name}` : " from all stores"}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No products found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="mt-3 text-secondary text-xs" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {visibleProducts.map(p => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  storeId={p.store_id}
                  name={p.name}
                  price={p.price}
                  images={(p.images as string[]) || []}
                  stockQuantity={p.stock_quantity}
                  storeSlug={storeMap[p.store_id]?.slug || ""}
                  storeName={storeMap[p.store_id]?.store_name}
                  rating={ratings[p.id]}
                  compact
                />
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              </div>
            )}
            {!hasMore && filtered.length > PAGE_SIZE && (
              <p className="text-center text-[10px] text-white/20 py-4">All {filtered.length} products shown</p>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Marketplace;
