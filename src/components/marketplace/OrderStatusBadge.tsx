import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:    { label: "Pending",    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed:  { label: "Confirmed",  className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  processing: { label: "Processing", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  shipped:    { label: "Shipped",    className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  delivered:  { label: "Delivered",  className: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  completed:  { label: "Completed",  className: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled:  { label: "Cancelled",  className: "bg-red-500/20 text-red-400 border-red-500/30" },
  refunded:   { label: "Refunded",   className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
