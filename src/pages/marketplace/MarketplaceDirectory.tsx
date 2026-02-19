import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Store, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketplaceStore {
  id: string;
  store_name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  theme: string;
  primary_color: string;
  status: string;
}

export default function MarketplaceDirectory() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, store_name, slug, tagline, logo_url, banner_url, theme, primary_color, status")
        .eq("status", "live")
        .order("created_at", { ascending: false });
      setStores((data as MarketplaceStore[]) || []);
      setLoading(false);
    };
    fetchStores();
  }, []);

  const filtered = stores.filter(
    (s) =>
      s.store_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.tagline ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-5">
          <Store className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-display">NoCap Marketplace</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
            <Store className="h-12 w-12 opacity-30" />
            <p className="font-medium">{search ? "No stores match your search" : "No stores available yet"}</p>
            {search && (
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>Clear search</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
