import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import CartDrawer from "@/components/marketplace/CartDrawer";
import StoreCard from "@/components/marketplace/StoreCard";
import NocapLogo from "@/components/NocapLogo";
import { ArrowLeft, Search, Store } from "lucide-react";

interface StoreRow {
  id: string;
  slug: string;
  store_name: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
}

const Marketplace = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, slug, store_name, tagline, logo_url, banner_url, primary_color")
        .eq("status", "live")
        .order("store_name");
      setStores((data as StoreRow[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = stores.filter(s =>
    s.store_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.tagline || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold flex-1 text-white">Marketplace</h1>
            <CartDrawer />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Store className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No stores found</p>
            <p className="text-xs mt-1">Check back later for new shops</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(store => (
              <StoreCard
                key={store.id}
                id={store.id}
                slug={store.slug}
                storeName={store.store_name}
                tagline={store.tagline}
                logoUrl={store.logo_url}
                bannerUrl={store.banner_url}
                primaryColor={store.primary_color}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Marketplace;
