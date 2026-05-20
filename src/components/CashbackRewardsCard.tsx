import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RMAmount } from "@/components/RMAmount";
import { Gift, Star, ChevronRight, ArrowDownLeft } from "lucide-react";

interface Props {
  userId: string;
}

interface CashbackTx {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function CashbackRewardsCard({ userId }: Props) {
  const navigate = useNavigate();
  const [monthCashback, setMonthCashback] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [recentCashback, setRecentCashback] = useState<CashbackTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    Promise.all([
      // Cashback this month
      supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "cashback")
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString()),
      // Total loyalty points across all stores
      supabase
        .from("marketplace_loyalty_points")
        .select("points_balance")
        .eq("user_id", userId),
      // Recent cashback transactions
      supabase
        .from("transactions")
        .select("id, amount, description, created_at")
        .eq("user_id", userId)
        .eq("type", "cashback")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(3),
    ]).then(([monthRes, pointsRes, recentRes]) => {
      const monthTotal = (monthRes.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      setMonthCashback(monthTotal);

      const pts = (pointsRes.data ?? []).reduce((sum, r) => sum + (r.points_balance ?? 0), 0);
      setTotalPoints(pts);

      setRecentCashback((recentRes.data ?? []) as CashbackTx[]);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return null;
  if (monthCashback === 0 && totalPoints === 0 && recentCashback.length === 0) return null;

  const monthName = new Date().toLocaleString("en-MY", { month: "long" });

  return (
    <Card className="mt-4 border-secondary/20 bg-white/5">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-white">Cashback & Rewards</span>
          </div>
          <button
            onClick={() => navigate("/transactions")}
            className="flex items-center gap-0.5 text-xs text-secondary font-medium"
          >
            History <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-secondary/10 border border-secondary/15 p-3">
            <p className="text-[10px] text-white/40 mb-0.5">{monthName} cashback</p>
            <p className="font-display text-lg font-bold text-secondary">
              <RMAmount value={monthCashback} />
            </p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-[10px] text-white/40 mb-0.5">Loyalty points</p>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-lg font-bold text-white">{totalPoints.toLocaleString()}</p>
              <Star className="h-3.5 w-3.5 text-secondary fill-secondary mb-0.5" />
            </div>
          </div>
        </div>

        {/* Recent cashback entries */}
        {recentCashback.length > 0 && (
          <div className="space-y-1.5">
            {recentCashback.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-1.5 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-secondary/15 flex items-center justify-center">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70 truncate max-w-[160px]">
                      {tx.description || "Cashback earned"}
                    </p>
                    <p className="text-[10px] text-white/30">
                      {new Date(tx.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-secondary tabular-nums">
                  +<RMAmount value={Math.abs(tx.amount)} />
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
