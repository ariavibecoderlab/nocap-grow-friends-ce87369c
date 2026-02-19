import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StoreCardProps {
  store: {
    id: string;
    store_name: string;
    slug: string;
    tagline?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
    theme: string;
    primary_color: string;
    status: string;
  };
}

export function StoreCard({ store }: StoreCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="overflow-hidden cursor-pointer border-border bg-card hover:shadow-lg transition-all hover:-translate-y-0.5 group"
      onClick={() => navigate(`/marketplace/${store.slug}`)}
    >
      {/* Banner */}
      <div
        className="h-28 relative overflow-hidden"
        style={{ backgroundColor: store.primary_color + "33" }}
      >
        {store.banner_url ? (
          <img src={store.banner_url} alt={store.store_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: store.primary_color + "22" }}>
            <Store className="h-10 w-10 opacity-30" style={{ color: store.primary_color }} />
          </div>
        )}
        {/* Logo */}
        <div className="absolute -bottom-5 left-3">
          <div className="h-10 w-10 rounded-full bg-card border-2 border-border shadow overflow-hidden flex items-center justify-center">
            {store.logo_url ? (
              <img src={store.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-7 pb-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {store.store_name}
            </p>
            {store.tagline && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{store.tagline}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className="text-[9px] shrink-0"
            style={{ borderColor: store.primary_color + "66", color: store.primary_color }}
          >
            {store.theme}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
