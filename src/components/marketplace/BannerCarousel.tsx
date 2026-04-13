import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
}

const BannerCarousel = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from("marketplace_banners")
      .select("id, image_url, link_url, title")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) setBanners(data);
      });
  }, []);

  // Auto-rotate every 5s
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const handleClick = (banner: Banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith("http")) {
        window.open(banner.link_url, "_blank");
      } else {
        navigate(banner.link_url);
      }
    }
  };

  return (
    <div className="mb-4 relative rounded-xl overflow-hidden">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((b) => (
          <div
            key={b.id}
            className="w-full shrink-0 cursor-pointer"
            onClick={() => handleClick(b)}
          >
            <img
              src={getOptimizedImageUrl(b.image_url, 800, 320)}
              alt={b.title || "Promotion"}
              className="w-full h-36 object-cover rounded-xl"
            />
          </div>
        ))}
      </div>

      {/* Nav arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white/80 hover:bg-black/60 backdrop-blur-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white/80 hover:bg-black/60 backdrop-blur-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-4 bg-secondary" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
