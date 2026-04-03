import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Paperclip, Send, Loader2, X, FileText, Image as ImageIcon } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NocapLogo from "@/components/NocapLogo";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/support/TicketStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";
import { format } from "date-fns";

const SupportTicketDetail = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!ticketId) return;
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("id", ticketId).single(),
      supabase.from("support_ticket_replies").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);
    setTicket(t);
    setReplies(r || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ticketId]);

  // Realtime
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_replies", filter: `ticket_id=eq.${ticketId}` },
        (payload) => setReplies(prev => [...prev, payload.new as any])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies]);

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
        const processed = file.type.startsWith("image/") ? await compressImage(file) : file;
        const path = `${user.id}/${ticketId}/${Date.now()}_${processed.name}`;
        const { error } = await supabase.storage.from("support-attachments").upload(path, processed);
        if (error) throw error;
        attachmentPaths.push(path);
      }
      const { error } = await supabase.from("support_ticket_replies").insert({
        ticket_id: ticketId, sender_id: user.id, sender_type: "user",
        message: message.trim() || "Attached files.", attachments: attachmentPaths,
      });
      if (error) throw error;
      setMessage(""); setFiles([]);
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("support-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("support-attachments").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  if (loading) return <div className="min-h-screen bg-primary flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>;
  if (!ticket) return <div className="min-h-screen bg-primary flex items-center justify-center text-white/50">Ticket not found</div>;

  return (
    <div className="min-h-screen bg-primary pb-20 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/support-tickets")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <NocapLogo size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-secondary font-mono">{ticket.ticket_number}</p>
              <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <span className="text-[10px] text-white/40 self-center capitalize">{ticket.category}</span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-md space-y-3">
          {/* Initial description */}
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-3">
              <p className="text-[10px] text-white/40 mb-1">{format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm")}</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {replies.map(reply => (
            <div key={reply.id} className={`flex ${reply.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[85%] border-white/10 ${reply.sender_type === "user" ? "bg-secondary/20" : "bg-white/5"}`}>
                <CardContent className="p-3">
                  <p className="text-[10px] text-white/40 mb-1">
                    {reply.sender_type === "agent" ? "Support Agent" : "You"} · {format(new Date(reply.created_at), "HH:mm")}
                  </p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{reply.message}</p>
                  {reply.attachments && (reply.attachments as string[]).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {(reply.attachments as string[]).map((path: string, i: number) => (
                        <button key={i} onClick={async () => { const url = await getSignedUrl(path); window.open(url, "_blank"); }}
                          className="flex items-center gap-1.5 text-xs text-secondary hover:underline">
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
      </div>

      {/* Reply input */}
      {ticket.status !== "closed" && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="mx-auto max-w-md">
            {files.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] text-white/50 bg-white/5 rounded px-2 py-1 shrink-0">
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
              <Button variant="ghost" size="icon" className="text-white/50 shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your reply..."
                className="min-h-[40px] max-h-[120px] resize-none bg-white/5 border-white/10 text-white text-sm" rows={1} />
              <Button size="icon" className="shrink-0" onClick={sendReply} disabled={sending || (!message.trim() && files.length === 0)}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SupportTicketDetail;
