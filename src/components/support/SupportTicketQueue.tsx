import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle, Clock } from "lucide-react";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useSlaSettings } from "@/hooks/useSlaSettings";
import { format } from "date-fns";

export default function SupportTicketQueue() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { getSlaStatus, loading: slaLoading } = useSlaSettings();

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (priorityFilter !== "all") query = query.eq("priority", priorityFilter);
    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [statusFilter, priorityFilter]);

  const filtered = tickets.filter(t =>
    !search || t.ticket_number?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loading || slaLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ticket Queue</h2>
        <span className="text-sm text-muted-foreground">{filtered.length} tickets</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const sla = getSlaStatus(ticket);
            const hasBreached = sla && (sla.responseBreached || sla.resolutionBreached);
            const hasWarning = sla && !hasBreached && (sla.responseWarning || sla.resolutionWarning);

            return (
              <Card key={ticket.id}
                className={`cursor-pointer hover:bg-accent/50 transition-colors ${hasBreached ? "border-red-500/50" : hasWarning ? "border-yellow-500/30" : ""}`}
                onClick={() => navigate(`/support-portal/tickets/${ticket.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} />
                      {hasBreached && (
                        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {sla!.responseBreached ? "Response SLA breached" : "Resolution SLA breached"}
                        </Badge>
                      )}
                      {hasWarning && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1 border-yellow-500/50 text-yellow-500">
                          <Clock className="h-3 w-3" />
                          {sla!.responseWarning ? "Response SLA at risk" : "Resolution SLA at risk"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate mt-1">{ticket.subject}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground capitalize">{ticket.category}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(ticket.created_at), "dd MMM, HH:mm")}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No tickets found</p>}
        </div>
      )}
    </div>
  );
}
