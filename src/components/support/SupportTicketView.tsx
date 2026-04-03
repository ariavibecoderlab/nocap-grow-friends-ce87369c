import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import CannedResponsePicker from "@/components/support/CannedResponsePicker";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SupportTicketView() {
  const params = useParams<{ ticketId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // Support both React Router params and path-based extraction
  const ticketId = params.ticketId || location.pathname.split("/support-portal/tickets/")[1];
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!ticketId) return;
    const [{ data: t }, { data: r }, { data: agentRoles }] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("id", ticketId).single(),
      supabase.from("support_ticket_replies").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id").eq("role", "support"),
    ]);
    setTicket(t);
    setReplies(r || []);

    // Fetch agent profiles
    if (agentRoles && agentRoles.length > 0) {
      const ids = agentRoles.map(a => a.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      profs?.forEach(p => { map[p.user_id] = p.full_name || "Agent"; });
      setProfiles(map);
      setAgents(agentRoles.map(a => ({ user_id: a.user_id, name: map[a.user_id] || "Agent" })));
    }

    // Fetch ticket submitter profile
    if (t) {
      const { data: submitter } = await supabase.from("profiles").select("user_id, full_name").eq("user_id", t.user_id).single();
      if (submitter) setProfiles(prev => ({ ...prev, [submitter.user_id]: submitter.full_name || "User" }));
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ticketId]);

  // Realtime
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-ticket-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_replies", filter: `ticket_id=eq.${ticketId}` },
        (payload) => setReplies(prev => [...prev, payload.new as any])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies]);

  const updateTicket = async (field: string, value: string) => {
    if (!ticketId) return;
    const oldValue = ticket?.[field];
    const { error } = await supabase.from("support_tickets").update({ [field]: value }).eq("id", ticketId);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    setTicket((prev: any) => ({ ...prev, [field]: value }));
    toast({ title: `Ticket ${field.replace("_", " ")} updated` });

    // Send email notification on status change
    if (field === "status" && oldValue !== value) {
      supabase.functions.invoke("support-ticket-email", {
        body: { type: "status_changed", ticket_id: ticketId, old_status: oldValue, new_status: value },
      }).catch(err => console.error("Email notification error:", err));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 5) { toast({ title: "Max 5 files", variant: "destructive" }); return; }
    if (selected.find(f => f.size > 20 * 1024 * 1024)) { toast({ title: "Max 20MB per file", variant: "destructive" }); return; }
    setFiles(prev => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendReply = async () => {
    if (!user || !ticketId || (!message.trim() && files.length === 0)) return;
    setSending(true);
    try {
      let attachmentPaths: string[] = [];
      for (const file of files) {
        const path = `${user.id}/${ticketId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("support-attachments").upload(path, file);
        if (error) throw error;
        attachmentPaths.push(path);
      }
      const { error } = await supabase.from("support_ticket_replies").insert({
        ticket_id: ticketId, sender_id: user.id, sender_type: "agent",
        message: message.trim() || "Attached files.", attachments: attachmentPaths,
      });
      if (error) throw error;
      setMessage(""); setFiles([]);

      // Send email notification to ticket owner
      const agentName = profiles[user.id] || "Support Agent";
      supabase.functions.invoke("support-ticket-email", {
        body: { type: "agent_reply", ticket_id: ticketId, reply_message: message.trim() || "Attached files.", agent_name: agentName },
      }).catch(err => console.error("Email notification error:", err));
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("support-attachments").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!ticket) return <p className="text-center text-muted-foreground py-12">Ticket not found</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/support-portal/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-sm font-semibold truncate">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground">
            By: {profiles[ticket.user_id] || "User"} · {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={ticket.status} onValueChange={v => updateTicket("status", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <Select value={ticket.priority} onValueChange={v => updateTicket("priority", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Assigned To</Label>
          <Select value={ticket.assigned_to || "unassigned"} onValueChange={v => updateTicket("assigned_to", v === "unassigned" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {agents.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-3 space-y-3 bg-muted/20">
        <Card className="bg-card">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-1">{profiles[ticket.user_id] || "User"} · {format(new Date(ticket.created_at), "HH:mm")}</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>

        {replies.map(reply => (
          <div key={reply.id} className={`flex ${reply.sender_type === "agent" ? "justify-end" : "justify-start"}`}>
            <Card className={`max-w-[85%] ${reply.sender_type === "agent" ? "bg-primary/10 border-primary/20" : "bg-card"}`}>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {reply.sender_type === "agent" ? (profiles[reply.sender_id] || "Agent") : (profiles[reply.sender_id] || "User")} · {format(new Date(reply.created_at), "HH:mm")}
                </p>
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                {reply.attachments && (reply.attachments as string[]).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(reply.attachments as string[]).map((path: string, i: number) => (
                      <button key={i} onClick={async () => { const url = await getSignedUrl(path); window.open(url, "_blank"); }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {path.split("/").pop()}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      <div className="mt-3">
        {files.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-2 py-1 shrink-0">
                <span className="truncate max-w-[100px]">{f.name}</span>
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Reply as support agent..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm" rows={1} />
          <Button size="icon" className="shrink-0" onClick={sendReply} disabled={sending || (!message.trim() && files.length === 0)}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
