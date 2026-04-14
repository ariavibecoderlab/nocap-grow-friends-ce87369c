import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";

interface Props {
  storeId: string;
}

export default function StoreScoreBadge({ storeId }: Props) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!storeId) return;
    const compute = async () => {
      // Compute composite score from: avg rating, response time, fulfillment
      const [reviewsRes, ordersRes] = await Promise.all([
        supabase
          .from("marketplace_reviews")
          .select("rating")
          .in("product_id",
            (await supabase.from("marketplace_products").select("id").eq("store_id", storeId)).data?.map(p => p.id) || []
          ),
        supabase
          .from("marketplace_orders")
          .select("status, created_at, updated_at")
          .eq("store_id", storeId)
          .in("status", ["delivered", "confirmed", "shipped", "cancelled"]),
      ]);

      const reviews = reviewsRes.data || [];
      const orders = ordersRes.data || [];

      // Rating component (0-40)
      const avgRating = reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 3;
      const ratingScore = (avgRating / 5) * 40;

      // Fulfillment rate (0-30)
      const delivered = orders.filter(o => o.status === "delivered").length;
      const cancelled = orders.filter(o => o.status === "cancelled").length;
      const total = orders.length || 1;
      const fulfillmentRate = (delivered / total) * 30;

      // Activity bonus (0-30) — based on order volume
      const activityScore = Math.min(30, orders.length * 0.5);

      const composite = Math.round(ratingScore + fulfillmentRate + activityScore);
      setScore(Math.min(100, composite));

      // Update store score in DB
      await supabase
        .from("marketplace_stores")
        .update({ store_score: Math.min(100, composite) })
        .eq("id", storeId);
    };
    compute();
  }, [storeId]);

  if (score === null) return null;

  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs Improvement";

  return (
    <div className="inline-flex items-center gap-1.5">
      <Award className={`h-4 w-4 ${color}`} />
      <span className={`text-xs font-semibold ${color}`}>{score}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}
