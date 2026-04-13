import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, FileText, Globe } from "lucide-react";

interface StorePage {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  sort_order: number;
  seo: Record<string, string>;
}

export default function MerchantStorePages({ storeId, storeSlug }: { storeId: string; storeSlug: string }) {
  const { toast } = useToast();
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editPage, setEditPage] = useState<StorePage | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPages(); }, [storeId]);

  const fetchPages = async () => {
    const { data } = await supabase
      .from("marketplace_store_pages")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order");
    setPages((data as unknown as StorePage[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditPage(null);
    setTitle(""); setSlug(""); setContent(""); setIsPublished(false);
    setSeoTitle(""); setSeoDesc("");
    setShowDialog(true);
  };

  const openEdit = (p: StorePage) => {
    setEditPage(p);
    setTitle(p.title); setSlug(p.slug); setContent(p.content); setIsPublished(p.is_published);
    setSeoTitle(p.seo?.meta_title || ""); setSeoDesc(p.seo?.meta_description || "");
    setShowDialog(true);
  };

  const generateSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const savePage = async () => {
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    const seo = { meta_title: seoTitle, meta_description: seoDesc };
    const payload = {
      store_id: storeId,
      title: title.trim(),
      slug: slug.trim(),
      content,
      is_published: isPublished,
      seo: seo as any,
    };

    if (editPage) {
      const { error } = await supabase.from("marketplace_store_pages").update(payload).eq("id", editPage.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Page updated" });
    } else {
      const { error } = await supabase.from("marketplace_store_pages").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Page created" });
    }
    await fetchPages();
    setShowDialog(false);
    setSaving(false);
  };

  const deletePage = async (id: string) => {
    await supabase.from("marketplace_store_pages").delete().eq("id", id);
    await fetchPages();
    toast({ title: "Page deleted" });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-white">Custom Pages</h3>
        <Button size="sm" className="bg-secondary text-primary text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Page
        </Button>
      </div>

      <p className="text-[11px] text-white/40">Create pages like About, FAQ, Shipping Policy. Available at /store/{storeSlug}/page/[slug]</p>

      {pages.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No custom pages yet</p>
          </CardContent>
        </Card>
      ) : (
        pages.map(p => (
          <Card key={p.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-secondary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.title}</p>
                  <p className="text-[10px] text-white/40">/{p.slug} · {p.is_published ? "Published" : "Draft"}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 text-white/40 hover:text-white"><Edit className="h-4 w-4" /></button>
                <button onClick={() => deletePage(p.id)} className="p-1.5 text-red-400/60 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-primary border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editPage ? "Edit Page" : "Create Page"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/60 text-xs">Page Title</Label>
              <Input value={title} onChange={e => { setTitle(e.target.value); if (!editPage) setSlug(generateSlug(e.target.value)); }}
                className="bg-white/5 border-white/10 text-white mt-1" placeholder="About Us" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">URL Slug</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1 font-mono text-xs" placeholder="about-us" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Content</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1 min-h-[150px] text-sm"
                placeholder="Write your page content here..." />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white/60 text-xs">Published</Label>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            {/* SEO */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-medium text-white/60 flex items-center gap-1 mb-2"><Globe className="h-3 w-3" /> SEO Settings</p>
              <div className="space-y-2">
                <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
                  placeholder="Meta Title" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                <Textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)}
                  placeholder="Meta Description" className="bg-white/5 border-white/10 text-white text-xs min-h-[50px]" />
              </div>
            </div>

            <Button className="w-full bg-secondary text-primary" onClick={savePage} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editPage ? "Save Changes" : "Create Page"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
