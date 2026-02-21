import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Store, MapPin } from "lucide-react";

interface StoreCardProps {
  id: string;
  slug: string;
  storeName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  primaryColor?: string;
}

export default function StoreCard({ slug, storeName, tagline, logoUrl, bannerUrl }: StoreCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="border-white/10 bg-white/5 overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]"
      onClick={() => navigate(`/store/${slug}`)}
    >
      {/* Banner */}
      <div className="h-24 bg-white/5 relative overflow-hidden">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-secondary/5" />
        )}
        {/* Logo */}
        <div className="absolute -bottom-5 left-3">
          <div className="h-12 w-12 rounded-xl border-2 border-primary bg-white/10 overflow-hidden shadow-lg">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                <Store className="h-5 w-5 text-secondary" />
              </div>
            )}
          </div>
        </div>
      </div>
      <CardContent className="pt-8 pb-4 px-4">
        <p className="font-display text-sm font-semibold text-white truncate">{storeName}</p>
        {tagline && <p className="text-[11px] text-white/40 mt-0.5 truncate">{tagline}</p>}
      </CardContent>
    </Card>
  );
}
