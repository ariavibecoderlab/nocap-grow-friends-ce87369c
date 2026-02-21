import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  processing: { label: "Processing", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  shipped: { label: "Shipped", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  delivered: { label: "Delivered", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "bg-white/10 text-white/60" };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${config.className}`}>
      {config.label}
    </Badge>
  );
}
