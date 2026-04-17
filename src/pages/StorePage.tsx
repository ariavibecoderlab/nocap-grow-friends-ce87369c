import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/marketplace/CartDrawer";
import ProductCard from "@/components/marketplace/ProductCard";
import { ArrowLeft, Store, Search, ChevronRight } from "lucide-react";
import StoreAnnouncement from "@/components/marketplace/StoreAnnouncement";
import { Json } from "@/integrations/supabase/types";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import StoreFollowButton from "@/components/marketplace/StoreFollowButton";
import StoreScoreBadge from "@/components/marketplace/StoreScoreBadge";
import { resolveTheme, themeToCSS, ThemeOverrides } from "@/lib/storeThemes";
import StoreHeroCarousel from "@/components/marketplace/StoreHeroCarousel";
import StoreStickyHeader from "@/components/marketplace/StoreStickyHeader";
import StoreTrustStrip from "@/components/marketplace/StoreTrustStrip";
import StoreCategoryGrid from "@/components/marketplace/StoreCategoryGrid";
import StoreReviewsCarousel from "@/components/marketplace/StoreReviewsCarousel";
import StoreFooter from "@/components/marketplace/StoreFooter";
import ProductQuickView from "@/components/marketplace/ProductQuickView";

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
  page_layout: Json;
  seo: Json;
  announcement: Json;
  settings: Json;
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
  sold_count: number;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
  image_url: string | null;
}

interface MenuItem {
  id: string;
  label: string;
  url: string;
  position: string;
}

interface PageSection {
  id: string;
  type: string;
  title: string;
  content: string;
  imageUrl: string;
  settings?: Record<string, string>;
}

const PRODUCTS_PER_PAGE = 12;

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "draft";
  const previewToken = searchParams.get("token");
  const previewStoreId = searchParams.get("store");
  const [store, setStore] = useState<StoreData | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<any[] | null>(null);
  const [previewTheme, setPreviewTheme] = useState<{ themeId: string; overrides: any } | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [followerCount, setFollowerCount] = useState(0);
  const [flashPrices, setFlashPrices] = useState<Record<string, number>>({});
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, slug, store_name, tagline, description, logo_url, banner_url, primary_color, theme, shipping_flat_rate, free_shipping_min, page_layout, seo, announcement, settings")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();

      if (!storeData) { setLoading(false); return; }
      setStore(storeData as unknown as StoreData);

      const seo = storeData.seo as Record<string, string> | null;
      if (seo?.meta_title) document.title = seo.meta_title;
      else document.title = storeData.store_name;

      const [prodRes, catRes, menuRes, followRes] = await Promise.all([
        supabase.from("marketplace_products")
          .select("id, store_id, name, price, images, stock_quantity, is_featured, category_id, sold_count, created_at")
          .eq("store_id", storeData.id)
          .eq("status", "active")
          .order("is_featured", { ascending: false }),
        supabase.from("marketplace_categories")
          .select("id, name, sort_order, image_url")
          .eq("store_id", storeData.id)
          .order("sort_order"),
        supabase.from("marketplace_store_menus")
          .select("id, label, url, position")
          .eq("store_id", storeData.id)
          .order("sort_order"),
        supabase.from("marketplace_store_follows")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeData.id),
      ]);

      const prods = (prodRes.data as unknown as ProductRow[]) || [];
      setProducts(prods);
      setCategories((catRes.data as unknown as CategoryRow[]) || []);
      setMenus((menuRes.data as unknown as MenuItem[]) || []);
      setFollowerCount(followRes.count || 0);

      if (prods.length > 0) {
        const productIds = prods.map(p => p.id);
        const [reviewRes, flashRes] = await Promise.all([
          supabase.from("marketplace_reviews")
            .select("product_id, rating")
            .in("product_id", productIds),
          supabase.from("marketplace_flash_sales")
            .select("product_id, flash_price")
            .eq("store_id", storeData.id)
            .eq("is_active", true)
            .lte("starts_at", new Date().toISOString())
            .gte("ends_at", new Date().toISOString()),
        ]);

        if (reviewRes.data && reviewRes.data.length > 0) {
          const ratingMap: Record<string, { sum: number; count: number }> = {};
          reviewRes.data.forEach((r: any) => {
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

        if (flashRes.data && flashRes.data.length > 0) {
          const fp: Record<string, number> = {};
          flashRes.data.forEach((f: any) => { fp[f.product_id] = f.flash_price; });
          setFlashPrices(fp);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(v => v + PRODUCTS_PER_PAGE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  const filtered = products.filter(p => {
    const matchCat = selectedCat === "all" || p.category_id === selectedCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const headerMenus = menus.filter(m => m.position === "header");
  const footerMenus = menus.filter(m => m.position === "footer");
  const sections = (store?.page_layout && Array.isArray(store.page_layout) ? store.page_layout : []) as unknown as PageSection[];

  const featuredProducts = products.filter(p => p.is_featured);
  const newArrivals = [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  // Compute average store rating
  const allRatings = Object.values(ratings);
  const avgStoreRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;

  // Resolve hero slides from page_layout
  const heroSection = sections.find(s => s.type === "hero_slideshow" || s.type === "hero_banner");
  const heroSlides = heroSection?.type === "hero_slideshow" && heroSection.settings
    ? JSON.parse(heroSection.content || "[]").map((s: any) => ({
        imageUrl: s.imageUrl || "",
        title: s.title || "",
        subtitle: s.subtitle || "",
        ctaText: s.ctaText || "",
        ctaUrl: s.ctaUrl || "",
      }))
    : heroSection?.type === "hero_banner"
      ? [{ imageUrl: heroSection.imageUrl || "", title: heroSection.title || "", subtitle: heroSection.content || "" }]
      : [];

  // Resolve theme
  const storeSettings = store?.settings && typeof store.settings === "object" && !Array.isArray(store.settings)
    ? (store.settings as Record<string, unknown>)
    : {};
  const overrides = (storeSettings.theme_overrides || {}) as ThemeOverrides;
  const resolvedTheme = store ? resolveTheme(store.theme, overrides) : null;
  const themeCSSVars = resolvedTheme ? themeToCSS(resolvedTheme) : {};

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
          <div className="mx-auto max-w-4xl">
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

  const ctaSections = sections.filter(s => s.type === "cta_banner");
  const otherSections = sections.filter(s => s.type !== "hero_banner" && s.type !== "hero_slideshow" && s.type !== "featured_products" && s.type !== "cta_banner");

  return (
    <div className="min-h-screen pb-20" style={{ ...themeCSSVars, backgroundColor: "var(--store-bg, hsl(var(--primary)))", color: "var(--store-text, white)", fontFamily: "var(--store-font-body, inherit)" } as React.CSSProperties}>
      {/* Sticky header */}
      <StoreStickyHeader
        storeName={store.store_name}
        logoUrl={store.logo_url}
        onSearchToggle={() => setShowSearch(p => !p)}
      />

      {/* Announcement Bar */}
      <StoreAnnouncement announcement={store.announcement} />

      {/* Hero Carousel */}
      <div className="relative">
        <StoreHeroCarousel
          bannerUrl={store.banner_url}
          slides={heroSlides.length > 0 ? heroSlides : undefined}
          accentColor={resolvedTheme?.colors.accent}
        />
        {/* Navigation overlay on hero */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button onClick={() => navigate("/marketplace")} className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60 backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CartDrawer />
        </div>
      </div>

      {/* Store Info Bar */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-end gap-3 -mt-8 relative z-10">
          <div className="h-16 w-16 overflow-hidden shadow-lg shrink-0 border-2" style={{ borderRadius: "var(--store-radius)", borderColor: "var(--store-bg)", backgroundColor: "var(--store-surface)" }}>
            {store.logo_url ? (
              <img src={getOptimizedImageUrl(store.logo_url, 128, 128)} alt={store.store_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: resolvedTheme?.colors.accent + "33" }}>
                <Store className="h-6 w-6" style={{ color: "var(--store-accent)" }} />
              </div>
            )}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>{store.store_name}</h1>
            {store.tagline && <p className="text-xs" style={{ color: "var(--store-text-muted)" }}>{store.tagline}</p>}
            <div className="mt-1.5 flex items-center gap-3">
              <StoreFollowButton storeId={store.id} />
              <StoreScoreBadge storeId={store.id} />
            </div>
          </div>
        </div>

        {/* Header Navigation */}
        {headerMenus.length > 0 && (
          <div className="flex gap-4 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {headerMenus.map(m => (
              <button key={m.id} onClick={() => navigate(m.url)}
                className="shrink-0 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--store-accent)" }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trust Strip */}
      <div className="mt-4">
        <StoreTrustStrip
          productCount={products.length}
          avgRating={avgStoreRating}
          freeShippingMin={store.free_shipping_min}
          followerCount={followerCount}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* Featured Products Row */}
        {featuredProducts.length > 0 && (
          <div className="mt-8 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
                ⭐ Best Sellers
              </h2>
              <span className="text-[11px] font-medium" style={{ color: "var(--store-accent)" }}>
                {featuredProducts.length} items
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              {featuredProducts.slice(0, 8).map(p => (
                <div key={p.id} className="flex-shrink-0 w-44 md:w-52">
                  <ProductCard
                    id={p.id} storeId={p.store_id} name={p.name} price={p.price}
                    images={(p.images as string[]) || []} stockQuantity={p.stock_quantity}
                    storeSlug={store.slug} rating={ratings[p.id]} soldCount={p.sold_count}
                    flashPrice={flashPrices[p.id]}
                    onQuickView={setQuickViewId}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Grid */}
        <div className="mt-8 animate-fade-in">
          <StoreCategoryGrid
            categories={categories}
            selectedCat={selectedCat}
            onSelect={setSelectedCat}
            accentColor={resolvedTheme?.colors.accent}
          />
        </div>

        {/* CTA Banner sections */}
        {ctaSections.map(section => (
          <div
            key={section.id}
            className="mt-8 p-6 md:p-10 text-center animate-fade-in relative overflow-hidden"
            style={{
              borderRadius: "var(--store-radius)",
              background: `linear-gradient(135deg, ${resolvedTheme?.colors.accent}33, ${resolvedTheme?.colors.accent}11)`,
              border: `1px solid ${resolvedTheme?.colors.accent}22`,
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: "var(--store-accent)" }} />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10" style={{ backgroundColor: "var(--store-accent)" }} />
            <h3 className="text-lg md:text-2xl font-bold mb-2 relative" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
              {section.title}
            </h3>
            {section.content && <p className="text-xs md:text-sm mb-5 relative" style={{ color: "var(--store-text-muted)" }}>{section.content}</p>}
            {section.settings?.cta_text && (
              <a
                href={section.settings.cta_url || "#"}
                className="relative inline-block px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md"
                style={{
                  backgroundColor: "var(--store-primary)",
                  color: "var(--store-primary-fg)",
                  borderRadius: "var(--store-btn-radius)",
                }}
              >
                {section.settings.cta_text}
              </a>
            )}
          </div>
        ))}

        {/* Page Layout Sections (text, about, testimonials, image_banner) */}
        {otherSections.length > 0 && (
          <div className="mt-8 space-y-4">
            {otherSections.map(section => (
              <div key={section.id} className="animate-fade-in">
                {section.type === "image_banner" && section.imageUrl && (
                  <img src={section.imageUrl} alt={section.title} className="w-full object-cover shadow-sm" style={{ borderRadius: "var(--store-radius)" }} />
                )}
                {(section.type === "text_block" || section.type === "about") && (
                  <div className="p-5 border" style={{ borderRadius: "var(--store-radius)", backgroundColor: "var(--store-surface)", borderColor: "var(--store-surface-border)" }}>
                    <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>{section.title}</h3>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: "var(--store-text-muted)" }}>{section.content}</p>
                  </div>
                )}
                {section.type === "testimonials" && (
                  <div className="p-5 border" style={{ borderRadius: "var(--store-radius)", backgroundColor: "var(--store-surface)", borderColor: "var(--store-surface-border)" }}>
                    <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>{section.title}</h3>
                    <p className="text-xs italic leading-relaxed" style={{ color: "var(--store-text-muted)" }}>"{section.content}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <div className="mt-8 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
                🆕 New Arrivals
              </h2>
              <span className="text-[11px] font-medium" style={{ color: "var(--store-accent)" }}>
                Just added
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              {newArrivals.map(p => (
                <div key={p.id} className="flex-shrink-0 w-40 md:w-48">
                  <ProductCard
                    id={p.id} storeId={p.store_id} name={p.name} price={p.price}
                    images={(p.images as string[]) || []} stockQuantity={p.stock_quantity}
                    storeSlug={store.slug} rating={ratings[p.id]} soldCount={p.sold_count}
                    flashPrice={flashPrices[p.id]} compact
                    onQuickView={setQuickViewId}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Carousel */}
        <div className="mt-8 animate-fade-in">
          <StoreReviewsCarousel storeId={store.id} />
        </div>

        {/* Search + All Products */}
        <div className="mt-10" id="store-all-products">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
              All Products
            </h2>
            <button onClick={() => setShowSearch(p => !p)} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--store-accent)" }}>
              <Search className="h-3.5 w-3.5" /> {showSearch ? "Hide" : "Search"}
            </button>
          </div>

          {showSearch && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--store-text-muted)" }} />
              <input
                ref={searchRef}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 h-9 text-sm border outline-none focus:ring-2"
                style={{ backgroundColor: "var(--store-surface)", borderColor: "var(--store-surface-border)", color: "var(--store-text)", borderRadius: "var(--store-radius)", "--tw-ring-color": "var(--store-accent)" } as React.CSSProperties}
              />
            </div>
          )}

          {/* Category Filter Chips */}
          {categories.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCat("all")}
                className="shrink-0 px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  borderRadius: "var(--store-btn-radius)",
                  backgroundColor: selectedCat === "all" ? "var(--store-primary)" : "var(--store-surface)",
                  color: selectedCat === "all" ? "var(--store-primary-fg)" : "var(--store-text-muted)",
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className="shrink-0 px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    borderRadius: "var(--store-btn-radius)",
                    backgroundColor: selectedCat === cat.id ? "var(--store-primary)" : "var(--store-surface)",
                    color: selectedCat === cat.id ? "var(--store-primary-fg)" : "var(--store-text-muted)",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid — 2 cols mobile, 3 cols desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.slice(0, visibleCount).map(p => (
              <ProductCard
                key={p.id} id={p.id} storeId={p.store_id} name={p.name} price={p.price}
                images={(p.images as string[]) || []} stockQuantity={p.stock_quantity}
                storeSlug={store.slug} rating={ratings[p.id]} soldCount={p.sold_count}
                flashPrice={flashPrices[p.id]}
                onQuickView={setQuickViewId}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16" style={{ color: "var(--store-text-muted)" }}>
              <Store className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {visibleCount < filtered.length && (
            <div ref={loadMoreRef} className="mt-6 flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--store-accent)", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <ProductQuickView
        productId={quickViewId}
        storeSlug={store.slug}
        onClose={() => setQuickViewId(null)}
      />

      {/* Footer */}
      <StoreFooter
        storeName={store.store_name}
        description={store.description}
        logoUrl={store.logo_url}
        footerMenus={footerMenus}
      />

      <BottomNav />
    </div>
  );
};

export default StorePage;
