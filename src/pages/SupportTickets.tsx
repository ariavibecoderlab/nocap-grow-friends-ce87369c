import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Ticket, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketStatusBadge";
import CreateTicketForm from "@/components/support/CreateTicketForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

const statusFilters = ["all", "open", "in_progress", "resolved", "closed"];

const SupportTickets = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchTickets(); }, [user, filter]);

  if (authLoading) return <div className="min-h-screen bg-primary flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>;
  if (!user) { navigate("/auth"); return null; }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/help-support")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold text-white flex-1">My Tickets</h1>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map(s => (
            <Button key={s} size="sm" variant={filter === s ? "secondary" : "ghost"}
              className={filter !== s ? "text-white/50" : ""}
              onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
        ) : tickets.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-8 text-center">
              <Ticket className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No tickets yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create your first ticket</Button>
            </CardContent>
          </Card>
        ) : (
          tickets.map(ticket => (
            <Card key={ticket.id} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => navigate(`/support-tickets/${ticket.id}`)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-secondary font-mono">{ticket.ticket_number}</p>
                    <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <div className="flex items-center gap-2">
                  <TicketPriorityBadge priority={ticket.priority} />
                  <span className="text-[10px] text-white/40">{format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm")}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateTicketForm open={showCreate} onOpenChange={setShowCreate} onCreated={fetchTickets} />
      <BottomNav />
    </div>
  );
};

export default SupportTickets;
