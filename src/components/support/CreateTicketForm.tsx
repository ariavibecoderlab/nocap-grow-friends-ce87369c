import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const categories = [
  { value: "general", label: "General" },
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "account", label: "Account" },
  { value: "marketplace", label: "Marketplace" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function CreateTicketForm({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const total = files.length + selected.length;
    if (total > 5) {
      toast({ title: "Maximum 5 files allowed", variant: "destructive" });
      return;
    }
    const oversized = selected.find(f => f.size > 20 * 1024 * 1024);
    if (oversized) {
      toast({ title: "Each file must be under 20MB", variant: "destructive" });
      return;
    }
    setFiles(prev => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      // Create ticket
      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets")
        .insert({ user_id: user.id, subject: subject.trim(), description: description.trim(), category, priority })
        .select("id")
        .single();
      if (ticketErr) throw ticketErr;

      // Upload files if any
      if (files.length > 0) {
        const urls: string[] = [];
        for (const file of files) {
          const processed = file.type.startsWith("image/") ? await compressImage(file) : file;
          const path = `${user.id}/${ticket.id}/${Date.now()}_${processed.name}`;
          const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, processed);
          if (upErr) throw upErr;
          urls.push(path);
        }
        // Add initial attachments as a system reply
        await supabase.from("support_ticket_replies").insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_type: "user",
          message: "Attached files with ticket submission.",
          attachments: urls,
        });
      }

      toast({ title: "Ticket created successfully" });
      setSubject(""); setDescription(""); setCategory("general"); setPriority("medium"); setFiles([]);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Failed to create ticket", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows={4} maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label>Attachments (optional, max 5 files, 20MB each)</Label>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-1" /> Add files
            </Button>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button onClick={() => removeFile(i)}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !subject.trim() || !description.trim()}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting...</> : "Submit Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
