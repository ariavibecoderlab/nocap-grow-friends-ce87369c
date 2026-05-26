import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import ProductCard from "@/components/marketplace/ProductCard";
import { ArrowLeft, ShoppingBag, SlidersHorizontal, Tag } from "lucide-react";

type SortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "rating";

interface SearchProduct {
  id: string;
  name: string;
  price: number;
  cover_image: string | null;
  store_id: string;
  store_name: string | null;
  store_slug: string | null;
  avg_rating: number | null;
  review_count: number | null;
  stock_quantity: number;
  status: string;
  created_at: string;
  rank: number | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
}

const PAGE_SIZE = 24;

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Featured",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  newest: "Newest",
  rating: "Top Rated",
};

export default function CategoryPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters
  const [sort, setSort] = useState<SortOption>("relevance");
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);

  // Fetch category name
  useEffect(() => {
    if (!categoryId) return;
    supabase
      .from("marketplace_categories")
      .select("id, name, description, icon_url")
      .eq("id", categoryId)
      .single()
      .then(({ data }) => {
        if (data) setCategory(data as Category);
      });
  }, [categoryId]);

  const fetchProducts = useCallback(
    async (
      catId: string,
      currentSort: SortOption,
      stockOnly: boolean,
      min: string,
      max: string,
      currentOffset: number,
      append = false
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const { data, error } = await supabase.rpc("search_products", {
          p_query: null,
          p_category_id: catId,
          p_sort: currentSort,
          p_in_stock: stockOnly,
          p_min_price: min ? parseFloat(min) : null,
          p_max_price: max ? parseFloat(max) : null,
          p_limit: PAGE_SIZE,
          p_offset: currentOffset,
        });

        if (error) throw error;

        const rows = (data as SearchProduct[]) ?? [];
        if (append) {
          setProducts((prev) => [...prev, ...rows]);
        } else {
          setProducts(rows);
        }
        setHasMore(rows.length === PAGE_SIZE);
        setOffset(currentOffset + rows.length);
      } catch (err) {
        console.error("search_products (category) error:", err);
        if (!append) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Re-fetch when filters change
  useEffect(() => {
    if (!categoryId) return;
    setOffset(0);
    setProducts([]);
    fetchProducts(categoryId, sort, inStock, minPrice, maxPrice, 0, false);
  }, [categoryId, sort, inStock, minPrice, maxPrice, fetchProducts]);

  const handleLoadMore = () => {
    if (!categoryId) return;
    fetchProducts(categoryId, sort, inStock, minPrice, maxPrice, offset, true);
  };

  const applyPriceFilter = () => setPriceOpen(false);
  const clearPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    setPriceOpen(false);
  };

  const priceActive = minPrice !== "" || maxPrice !== "";

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-primary/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full p-1.5 hover:bg-white/10 transition-colors text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="h-4 w-4 text-secondary shrink-0" />
            <h1 className="font-display text-lg font-bold text-white truncate">
              {category?.name ?? "Category"}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Filter bar */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="h-8 shrink-0 bg-white/5 border-white/10 text-white text-xs w-44">
              <SlidersHorizontal className="h-3 w-3 mr-1.5 text-white/40" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* In Stock toggle */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/10 rounded-md h-8 px-2.5">
            <span className="text-[11px] text-white/60 whitespace-nowrap">
              In Stock
            </span>
            <Switch
              checked={inStock}
              onCheckedChange={setInStock}
              className="scale-75 origin-right"
            />
          </div>

          {/* Price range */}
          <Popover open={priceOpen} onOpenChange={setPriceOpen}>
            <PopoverTrigger asChild>
              <button
                className={`shrink-0 h-8 px-2.5 rounded-md border text-[11px] font-medium transition-colors whitespace-nowrap ${
                  priceActive
                    ? "border-secondary/50 bg-secondary/10 text-secondary"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                {priceActive
                  ? `RM ${minPrice || "0"} – RM ${maxPrice || "∞"}`
                  : "Price Range"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 bg-primary border-white/10 text-white p-3"
              align="start"
            >
              <p className="text-xs font-semibold text-white/60 mb-2">
                Price Range (RM)
              </p>
              <div className="flex items-center gap-2 mb-3">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-8 bg-white/5 border-white/10 text-white text-xs"
                />
                <span className="text-white/30 text-xs">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-8 bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-secondary text-primary hover:bg-secondary/90"
                  onClick={applyPriceFilter}
                >
                  Apply
                </Button>
                {priceActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-white/40 hover:text-white"
                    onClick={clearPriceFilter}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Result count */}
        {!loading && products.length > 0 && (
          <p className="text-[11px] text-white/40 mb-3">
            {products.length} product{products.length !== 1 ? "s" : ""} in{" "}
            {category?.name ?? "this category"}
          </p>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/5 animate-pulse overflow-hidden"
              >
                <div className="aspect-[4/3] bg-white/10" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="h-14 w-14 mb-4 text-white/20" />
            <p className="text-white font-semibold text-lg">
              No products here yet
            </p>
            <p className="text-white/40 text-sm mt-1 mb-6">
              Check back soon or browse other categories
            </p>
            <Button
              variant="outline"
              className="border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => navigate("/marketplace")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Marketplace
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  storeId={p.store_id}
                  name={p.name}
                  price={p.price}
                  images={p.cover_image ? [p.cover_image] : []}
                  stockQuantity={p.stock_quantity}
                  storeSlug={p.store_slug ?? ""}
                  storeName={p.store_name ?? undefined}
                  rating={p.avg_rating ?? undefined}
                  compact
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Loading...
                    </span>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}

            {!hasMore && products.length >= PAGE_SIZE && (
              <p className="text-center text-[10px] text-white/20 py-4">
                All {products.length} products shown
              </p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
