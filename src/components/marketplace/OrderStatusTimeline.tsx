import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, CheckCircle2, Truck, Clock, XCircle, ShoppingBag } from "lucide-react";

interface HistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  note: string | null;
}

interface OrderStatusTimelineProps {
  orderId: string;
  currentStatus: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "Placed", icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

export default function OrderStatusTimeline({ orderId, currentStatus }: OrderStatusTimelineProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("marketplace_order_status_history")
        .select("id, old_status, new_status, created_at, note")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (data) setHistory(data as HistoryEntry[]);
    };
    fetchHistory();
  }, [orderId]);

  const isCancelled = currentStatus === "cancelled";
  const currentIdx = STATUS_ORDER[currentStatus] ?? 0;

  // Find timestamp for each step from history
  const getStepTime = (statusKey: string) => {
    const entry = history.find((h) => h.new_status === statusKey);
    return entry ? new Date(entry.created_at) : null;
  };

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <XCircle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-400">Order Cancelled</p>
          {history.find((h) => h.new_status === "cancelled") && (
            <p className="text-[10px] text-white/40">
              {new Date(history.find((h) => h.new_status === "cancelled")!.created_at).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10 z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-secondary z-0 transition-all duration-500"
          style={{ width: `${Math.max(0, currentIdx) * 33.33}%` }}
        />

        {STATUS_STEPS.map((step, idx) => {
          const isComplete = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const stepTime = getStepTime(step.key);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                  isComplete
                    ? "bg-secondary text-primary"
                    : "bg-white/10 text-white/30"
                } ${isCurrent ? "ring-2 ring-secondary/40 ring-offset-2 ring-offset-primary" : ""}`}
              >
                {isComplete && !isCurrent ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <p className={`text-[10px] mt-1.5 font-medium ${isComplete ? "text-secondary" : "text-white/30"}`}>
                {step.label}
              </p>
              {stepTime && (
                <p className="text-[9px] text-white/30">
                  {stepTime.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
