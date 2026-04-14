import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star } from "lucide-react";

interface Props {
  storeId: string;
  compact?: boolean;
}

export default function LoyaltyPointsBadge({ storeId, compact }: Props) {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !storeId) return;
    supabase
      .from("marketplace_loyalty_points")
      .select("points_balance")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setPoints(data?.points_balance ?? 0));
  }, [user, storeId]);

  if (!user || points === null || points === 0) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-secondary font-medium">
        <Star className="h-3 w-3 fill-secondary" />
        {points} pts
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-1.5">
      <Star className="h-4 w-4 fill-secondary text-secondary" />
      <div>
        <p className="text-xs font-semibold text-secondary">{points} Loyalty Points</p>
        <p className="text-[10px] text-white/40">Earn 1 point per RM spent</p>
      </div>
    </div>
  );
}
