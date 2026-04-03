import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "In Progress", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  resolved: { label: "Resolved", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  closed: { label: "Closed", className: "bg-white/10 text-white/50 border-white/20" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-white/10 text-white/50 border-white/20" },
  medium: { label: "Medium", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  high: { label: "High", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  urgent: { label: "Urgent", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function TicketStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
