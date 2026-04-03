import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Ticket, Clock, User, AlertCircle, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SupportSidebar from "@/components/support/SupportSidebar";
import SupportTicketQueue from "@/components/support/SupportTicketQueue";
import SupportTicketView from "@/components/support/SupportTicketView";
import SupportAnalytics from "@/components/support/SupportAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSlaSettings } from "@/hooks/useSlaSettings";

const SupportPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, assignedToMe: 0, unassigned: 0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const { getSlaStatus } = useSlaSettings();

  useEffect(() => {
    const check = async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "support");
      if (!data || data.length === 0) { navigate("/support-login"); return; }
      setHasAccess(true);

      // Fetch stats
      const { data: ticketData } = await supabase.from("support_tickets").select("*");
      if (ticketData) {
        setTickets(ticketData);
        setStats({
          total: ticketData.length,
          open: ticketData.filter(t => t.status === "open").length,
          assignedToMe: ticketData.filter(t => t.assigned_to === user.id).length,
          unassigned: ticketData.filter(t => !t.assigned_to && t.status !== "closed").length,
        });
      }
      setChecking(false);
    };
    if (!authLoading) check();
  }, [user, authLoading]);

  if (authLoading || checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!hasAccess) return null;

  const path = location.pathname;
  const isTicketDetail = path.match(/\/support-portal\/tickets\/(.+)/);
  const isTicketQueue = path === "/support-portal/tickets";
  const isAnalytics = path === "/support-portal/analytics";
  const isDashboard = path === "/support-portal";

  return (
    <div className="flex min-h-screen bg-background">
      <SupportSidebar />
      <div className="flex-1 p-6 overflow-auto">
        {isDashboard && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Support Dashboard</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center">
                <Ticket className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <User className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{stats.assignedToMe}</p>
                <p className="text-xs text-muted-foreground">Assigned to Me</p>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{stats.unassigned}</p>
                <p className="text-xs text-muted-foreground">Unassigned</p>
              </CardContent></Card>
            </div>

            {/* SLA Breach Summary */}
            {(() => {
              const breachedTickets = tickets.filter(t => {
                const sla = getSlaStatus(t);
                return sla && (sla.responseBreached || sla.resolutionBreached);
              });
              const atRiskTickets = tickets.filter(t => {
                const sla = getSlaStatus(t);
                return sla && !sla.responseBreached && !sla.resolutionBreached && (sla.responseWarning || sla.resolutionWarning);
              });

              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-secondary" />
                      SLA Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-2xl font-bold">{breachedTickets.length}</span>
                        <span className="text-sm text-muted-foreground">Breached</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-2xl font-bold">{atRiskTickets.length}</span>
                        <span className="text-sm text-muted-foreground">At Risk</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-2xl font-bold">
                          {tickets.filter(t => t.status !== "closed" && t.status !== "resolved").length - breachedTickets.length - atRiskTickets.length}
                        </span>
                        <span className="text-sm text-muted-foreground">On Track</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
        {isTicketQueue && <SupportTicketQueue />}
        {isTicketDetail && <SupportTicketView />}
        {isAnalytics && <SupportAnalytics />}
      </div>
    </div>
  );
};

export default SupportPortal;
