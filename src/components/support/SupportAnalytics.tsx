import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, Clock, BarChart3, CheckCircle2, Timer, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { format, differenceInMinutes, differenceInHours, subDays, startOfDay } from "date-fns";

interface TicketRow {
  id: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  user_id: string;
}

interface ReplyRow {
  id: string;
  ticket_id: string;
  sender_type: string;
  created_at: string;
}

const COLORS = ["hsl(48,100%,50%)", "hsl(200,80%,55%)", "hsl(140,60%,50%)", "hsl(0,80%,60%)", "hsl(280,60%,55%)", "hsl(30,90%,55%)"];

const SupportAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: t }, { data: r }] = await Promise.all([
        supabase.from("support_tickets").select("id, status, priority, category, created_at, updated_at, assigned_to, user_id"),
        supabase.from("support_ticket_replies").select("id, ticket_id, sender_type, created_at"),
      ]);
      setTickets(t || []);
      setReplies(r || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // --- Compute metrics ---

  // First response time per ticket (time from ticket creation to first agent reply)
  const firstResponseTimes: number[] = [];
  const ticketMap = new Map(tickets.map(t => [t.id, t]));

  const repliesByTicket = new Map<string, ReplyRow[]>();
  replies.forEach(r => {
    if (!repliesByTicket.has(r.ticket_id)) repliesByTicket.set(r.ticket_id, []);
    repliesByTicket.get(r.ticket_id)!.push(r);
  });

  repliesByTicket.forEach((reps, ticketId) => {
    const ticket = ticketMap.get(ticketId);
    if (!ticket) return;
    const agentReplies = reps.filter(r => r.sender_type === "agent").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (agentReplies.length > 0) {
      const mins = differenceInMinutes(new Date(agentReplies[0].created_at), new Date(ticket.created_at));
      firstResponseTimes.push(mins);
    }
  });

  const avgFirstResponse = firstResponseTimes.length > 0
    ? Math.round(firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length)
    : 0;

  // Resolution time (for resolved/closed tickets)
  const resolutionTimes: number[] = [];
  tickets.filter(t => t.status === "resolved" || t.status === "closed").forEach(t => {
    const hrs = differenceInHours(new Date(t.updated_at), new Date(t.created_at));
    resolutionTimes.push(hrs);
  });
  const avgResolution = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : 0;

  // Resolution rate
  const resolved = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const resolutionRate = tickets.length > 0 ? Math.round((resolved / tickets.length) * 100) : 0;

  // Category breakdown
  const categoryCount = new Map<string, number>();
  tickets.forEach(t => categoryCount.set(t.category, (categoryCount.get(t.category) || 0) + 1));
  const categoryData = Array.from(categoryCount.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Priority breakdown
  const priorityCount = new Map<string, number>();
  tickets.forEach(t => priorityCount.set(t.priority, (priorityCount.get(t.priority) || 0) + 1));
  const priorityData = Array.from(priorityCount.entries()).map(([name, value]) => ({ name, value }));
  const priorityOrder = ["urgent", "high", "medium", "low"];
  priorityData.sort((a, b) => priorityOrder.indexOf(a.name) - priorityOrder.indexOf(b.name));

  // Status breakdown
  const statusCount = new Map<string, number>();
  tickets.forEach(t => statusCount.set(t.status, (statusCount.get(t.status) || 0) + 1));
  const statusData = Array.from(statusCount.entries()).map(([name, value]) => ({ name, value }));

  // Tickets over last 14 days
  const now = new Date();
  const trendData = Array.from({ length: 14 }, (_, i) => {
    const day = startOfDay(subDays(now, 13 - i));
    const dayEnd = new Date(day.getTime() + 86400000);
    const count = tickets.filter(t => {
      const d = new Date(t.created_at);
      return d >= day && d < dayEnd;
    }).length;
    return { date: format(day, "MMM dd"), count };
  });

  // Replies per ticket (agent productivity)
  const agentReplyCount = replies.filter(r => r.sender_type === "agent").length;
  const avgRepliesPerTicket = tickets.length > 0 ? (agentReplyCount / tickets.length).toFixed(1) : "0";

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)}d ${Math.round((mins % 1440) / 60)}h`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ticket Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-secondary" />
              <span className="text-xs text-muted-foreground">Avg First Response</span>
            </div>
            <p className="text-2xl font-bold">{formatMinutes(avgFirstResponse)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {firstResponseTimes.length} ticket{firstResponseTimes.length !== 1 ? "s" : ""} measured
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Avg Resolution Time</span>
            </div>
            <p className="text-2xl font-bold">{avgResolution}h</p>
            <p className="text-xs text-muted-foreground mt-1">
              {resolutionTimes.length} resolved ticket{resolutionTimes.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Resolution Rate</span>
            </div>
            <p className="text-2xl font-bold">{resolutionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {resolved} of {tickets.length} tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Avg Agent Replies</span>
            </div>
            <p className="text-2xl font-bold">{avgRepliesPerTicket}</p>
            <p className="text-xs text-muted-foreground mt-1">per ticket</p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Tickets Created (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, color: "#fff" }} />
              <Line type="monotone" dataKey="count" stroke="hsl(48,100%,50%)" strokeWidth={2} dot={{ fill: "hsl(48,100%,50%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Category */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By Priority</CardTitle></CardHeader>
          <CardContent>
            {priorityData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === "urgent" ? "hsl(0,80%,60%)" :
                        entry.name === "high" ? "hsl(30,90%,55%)" :
                        entry.name === "medium" ? "hsl(48,100%,50%)" :
                        "hsl(140,60%,50%)"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === "open" ? "hsl(200,80%,55%)" :
                        entry.name === "in_progress" ? "hsl(48,100%,50%)" :
                        entry.name === "resolved" ? "hsl(140,60%,50%)" :
                        "hsl(0,0%,40%)"
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,10%)", border: "1px solid hsl(0,0%,20%)", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportAnalytics;
