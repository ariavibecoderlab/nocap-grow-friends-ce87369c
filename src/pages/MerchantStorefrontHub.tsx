import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Layout, FileText, Menu as MenuIcon, Globe, ShoppingBag,
  ExternalLink, Share2, ArrowLeft, Palette, Search, Megaphone, Newspaper,
} from "lucide-react";
import MerchantStorePages from "@/components/merchant/MerchantStorePages";
import MerchantStoreMenus from "@/components/merchant/MerchantStoreMenus";
import StoreSeoSettings from "@/components/merchant/StoreSeoSettings";
import MerchantDomainManager from "@/components/merchant/MerchantDomainManager";
import MerchantCheckoutSettings from "@/components/merchant/MerchantCheckoutSettings";
import MerchantAnnouncement from "@/components/merchant/MerchantAnnouncement";
import MerchantStoreBlog from "@/components/merchant/MerchantStoreBlog";

type SectionKey =
  | "overview" | "pages" | "menus" | "seo" | "domain"
  | "checkout" | "announce" | "blog";

interface Section {
  key: SectionKey;
  label: string;
  icon: any;
  description: string;
}

const SECTIONS: Section[] = [
  { key: "overview",  label: "Overview",   icon: Layout,     description: "Storefront at a glance" },
  { key: "pages",     label: "Pages",      icon: FileText,   description: "Custom pages (About, Policies…)" },
  { key: "menus",     label: "Menus",      icon: MenuIcon,   description: "Header & footer navigation" },
  { key: "blog",      label: "Blog",       icon: Newspaper,  description: "Articles & posts" },
  { key: "announce",  label: "Announcements", icon: Megaphone, description: "Site-wide banners" },
  { key: "seo",       label: "SEO",        icon: Search,     description: "Meta titles, descriptions, sitemap" },
  { key: "domain",    label: "Domain",     icon: Globe,      description: "Custom domain & SSL" },
  { key: "checkout",  label: "Checkout",   icon: ShoppingBag, description: "Shipping & checkout rules" },
];

interface StoreInfo {
  id: string;
  store_name: string;
  slug: string;
  status: string;
  draft_updated_at: string | null;
  published_at: string | null;
  page_layout: any;
  draft_layout: any;
}

export default function MerchantStorefrontHub() {
  const { storeId: storeIdParam } = useParams<{ storeId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const sectionParam = (searchParams.get("section") as SectionKey) || "overview";
  const [section, setSection] = useState<SectionKey>(sectionParam);

  useEffect(() => { setSection(sectionParam); }, [sectionParam]);

  // Resolve store
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      let query = supabase
        .from("marketplace_stores")
        .select("id, store_name, slug, status, draft_updated_at, published_at, page_layout, draft_layout")
        .eq("merchant_user_id", user.id);
      if (storeIdParam) query = query.eq("id", storeIdParam);
      const { data } = await query.limit(1).maybeSingle();
      if (!data) {
        toast({ title: "No store found", description: "Create a store first from the merchant dashboard.", variant: "destructive" });
        navigate("/merchant");
        return;
      }
      setStore(data as any);
      setLoading(false);
    })();
  }, [user, authLoading, storeIdParam, navigate, toast]);

  const goSection = (key: SectionKey) => {
    setSection(key);
    const next = new URLSearchParams(searchParams);
    next.set("section", key);
    setSearchParams(next, { replace: true });
  };

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  const hasUnpublished = !!store.draft_updated_at &&
    (!store.published_at || new Date(store.draft_updated_at) > new Date(store.published_at));
  const liveUrl = `${window.location.origin}/store/${store.slug}`;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3 px-3 md:px-5 h-12">
          <Button variant="ghost" size="sm" onClick={() => navigate("/merchant")} className="text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <div className="h-4 w-px bg-white/15" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">{store.store_name}</div>
            <div className="text-[10px] text-white/40 truncate">/{store.slug}</div>
          </div>
          {hasUnpublished && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Unpublished changes
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(liveUrl); toast({ title: "Link copied" }); }} className="text-white/70 hover:text-white text-xs">
              <Share2 className="h-3.5 w-3.5 mr-1" /> <span className="hidden md:inline">Share</span>
            </Button>
            <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white">
              <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden md:inline">View live</span>
            </a>
            <Link to={`/merchant/storefront/builder/${store.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-primary text-xs font-semibold hover:opacity-90">
              <Palette className="h-3.5 w-3.5" /> Open Builder
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sub-nav */}
        <nav className="hidden md:block w-56 shrink-0 border-r border-white/10 min-h-[calc(100vh-3rem)] p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-2 py-1.5">Storefront</div>
          {SECTIONS.map((s) => {
            const active = section === s.key;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => goSection(s.key)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition ${
                  active ? "bg-secondary text-primary font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile sub-nav (chip scroller) */}
        <div className="md:hidden fixed top-12 left-0 right-0 z-20 bg-background/95 backdrop-blur border-b border-white/10 overflow-x-auto">
          <div className="flex gap-1.5 px-3 py-2 whitespace-nowrap">
            {SECTIONS.map((s) => {
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => goSection(s.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
                    active ? "bg-secondary text-primary" : "bg-white/5 text-white/70"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 p-3 md:p-5 pt-16 md:pt-5">
          {section === "overview" && (
            <OverviewPanel
              store={store}
              hasUnpublished={hasUnpublished}
              onNavigate={goSection}
            />
          )}
          {section === "pages"     && <MerchantStorePages storeId={store.id} storeSlug={store.slug} />}
          {section === "menus"     && <MerchantStoreMenus storeId={store.id} />}
          {section === "blog"      && <MerchantStoreBlog storeId={store.id} />}
          {section === "announce"  && <MerchantAnnouncement storeId={store.id} />}
          {section === "seo"       && <StoreSeoSettings storeId={store.id} />}
          {section === "domain"    && <MerchantDomainManager storeId={store.id} />}
          {section === "checkout"  && <MerchantCheckoutSettings storeId={store.id} />}
        </main>
      </div>
    </div>
  );
}

// ---------- Overview ----------
function OverviewPanel({
  store, hasUnpublished, onNavigate,
}: {
  store: StoreInfo;
  hasUnpublished: boolean;
  onNavigate: (k: SectionKey) => void;
}) {
  const blockCount = Array.isArray(store.draft_layout) && store.draft_layout.length > 0
    ? store.draft_layout.length
    : Array.isArray(store.page_layout) ? store.page_layout.length : 0;
  const liveUrl = `${window.location.origin}/store/${store.slug}`;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Storefront</h1>
        <p className="text-xs text-white/50 mt-0.5">Manage everything customers see — design, content, navigation, SEO & more.</p>
      </div>

      {/* Status card */}
      <Card className="border-white/10 bg-gradient-to-br from-secondary/15 to-secondary/5">
        <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${store.status === "live" ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-xs font-semibold capitalize">{store.status}</span>
              {hasUnpublished && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Unpublished changes
                </span>
              )}
            </div>
            <div className="text-sm text-white/80">
              {blockCount} section{blockCount === 1 ? "" : "s"} on your storefront
            </div>
            <a href={liveUrl} target="_blank" rel="noreferrer" className="text-[11px] text-secondary hover:underline inline-flex items-center gap-1 mt-1">
              {liveUrl} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <Link to={`/merchant/storefront/builder/${store.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary text-primary text-xs font-semibold hover:opacity-90">
              <Palette className="h-3.5 w-3.5" /> Open Builder
            </Link>
            <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/10 text-white text-xs font-semibold hover:bg-white/15">
              <ExternalLink className="h-3.5 w-3.5" /> Preview
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Quick links grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {SECTIONS.filter(s => s.key !== "overview").map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => onNavigate(s.key)}
              className="text-left p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-7 w-7 rounded-md bg-secondary/20 text-secondary flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-semibold text-white">{s.label}</div>
              </div>
              <div className="text-[11px] text-white/50">{s.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
