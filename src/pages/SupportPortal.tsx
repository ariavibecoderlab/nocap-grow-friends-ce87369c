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

  useEffect(() => {
    const check = async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "support");
      if (!data || data.length === 0) { navigate("/support-login"); return; }
      setHasAccess(true);

      // Fetch stats
      const { data: tickets } = await supabase.from("support_tickets").select("status, assigned_to");
      if (tickets) {
        setStats({
          total: tickets.length,
          open: tickets.filter(t => t.status === "open").length,
          assignedToMe: tickets.filter(t => t.assigned_to === user.id).length,
          unassigned: tickets.filter(t => !t.assigned_to && t.status !== "closed").length,
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
