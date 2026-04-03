import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by: string;
}

export default function CannedResponseManager() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const fetchResponses = async () => {
    setLoading(true);
    const { data } = await supabase.from("canned_responses").select("*").order("category").order("title");
    setResponses((data as CannedResponse[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchResponses(); }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setCategory("general");
    setDialogOpen(true);
  };

  const openEdit = (r: CannedResponse) => {
    setEditing(r);
    setTitle(r.title);
    setContent(r.content);
    setCategory(r.category);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("canned_responses").update({ title: title.trim(), content: content.trim(), category: category.trim() || "general" }).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Response updated" });
      } else {
        const { error } = await supabase.from("canned_responses").insert({ title: title.trim(), content: content.trim(), category: category.trim() || "general", created_by: user.id });
        if (error) throw error;
        toast({ title: "Response created" });
      }
      setDialogOpen(false);
      fetchResponses();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("canned_responses").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    toast({ title: "Response deleted" });
    fetchResponses();
  };

  const categories = [...new Set(responses.map(r => r.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Canned Responses</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Response</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "Create"} Canned Response</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Greeting" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. general, billing, technical" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Content</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="The reply text..." rows={5} />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving || !title.trim() || !content.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : responses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No canned responses yet. Create one to get started.</p>
      ) : (
        categories.map(cat => (
          <div key={cat} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{cat}</h4>
            {responses.filter(r => r.category === cat).map(r => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
