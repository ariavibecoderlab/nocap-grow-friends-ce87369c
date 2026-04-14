import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  product_name: string;
  product_image: string;
  created_at: string;
}

export default function StoreReviewsCarousel({ storeId }: { storeId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const load = async () => {
      // Get top-rated reviews for this store's products
      const { data: products } = await supabase
        .from("marketplace_products")
        .select("id, name, images")
        .eq("store_id", storeId)
        .eq("status", "active");
      if (!products || products.length === 0) return;

      const productIds = products.map(p => p.id);
      const productMap = new Map(products.map(p => [p.id, p]));

      const { data: reviewData } = await supabase
        .from("marketplace_reviews")
        .select("id, rating, comment, product_id, created_at")
        .in("product_id", productIds)
        .gte("rating", 4)
        .order("rating", { ascending: false })
        .limit(10);

      if (reviewData && reviewData.length > 0) {
        setReviews(
          reviewData
            .filter(r => r.comment)
            .map(r => {
              const prod = productMap.get(r.product_id);
              const images = (prod?.images as string[]) || [];
              return {
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                product_name: prod?.name || "",
                product_image: images[0] || "",
                created_at: r.created_at,
              };
            })
        );
      }
    };
    load();
  }, [storeId]);

  if (reviews.length === 0) return null;

  const visibleCount = Math.min(reviews.length, 3);
  const maxIdx = Math.max(0, reviews.length - visibleCount);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--store-font-heading)", color: "var(--store-text)" }}>
          What Customers Say
        </h2>
        {reviews.length > visibleCount && (
          <div className="flex gap-1">
            <button onClick={() => setCurrent(i => Math.max(0, i - 1))} disabled={current === 0}
              className="p-1 rounded-full disabled:opacity-20 hover:opacity-80">
              <ChevronLeft className="h-4 w-4" style={{ color: "var(--store-text-muted)" }} />
            </button>
            <button onClick={() => setCurrent(i => Math.min(maxIdx, i + 1))} disabled={current >= maxIdx}
              className="p-1 rounded-full disabled:opacity-20 hover:opacity-80">
              <ChevronRight className="h-4 w-4" style={{ color: "var(--store-text-muted)" }} />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden">
        <div
          className="flex gap-3 transition-transform duration-500"
          style={{ transform: `translateX(-${current * (100 / visibleCount + 2)}%)` }}
        >
          {reviews.map(r => (
            <div
              key={r.id}
              className="flex-shrink-0 p-4 border space-y-2"
              style={{
                width: `calc(${100 / visibleCount}% - 0.75rem)`,
                minWidth: "220px",
                borderRadius: "var(--store-radius)",
                backgroundColor: "var(--store-surface)",
                borderColor: "var(--store-surface-border)",
              }}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3"
                    style={{
                      color: i < r.rating ? "var(--store-accent)" : "var(--store-surface-border)",
                      fill: i < r.rating ? "var(--store-accent)" : "none",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--store-text-muted)" }}>
                "{r.comment}"
              </p>
              <div className="flex items-center gap-2 pt-1">
                {r.product_image && (
                  <img src={r.product_image} alt="" className="h-8 w-8 rounded object-cover" />
                )}
                <span className="text-[10px] truncate" style={{ color: "var(--store-text-muted)" }}>
                  {r.product_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
