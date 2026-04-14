import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Save, Loader2, Eye, EyeOff, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  featured_image: string | null;
  is_published: boolean;
  published_at: string | null;
  seo: { meta_title?: string; meta_description?: string };
  created_at: string;
}

const MerchantStoreBlog = ({ storeId }: Props) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", content: "", featured_image: "",
    is_published: false, meta_title: "", meta_description: "",
  });
  const { toast } = useToast();

  useEffect(() => { loadPosts(); }, [storeId]);

  const loadPosts = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketplace_store_blog_posts")
      .select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openCreate = () => {
    setForm({ title: "", slug: "", content: "", featured_image: "", is_published: false, meta_title: "", meta_description: "" });
    setEditing(null);
    setShowEditor(true);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title, slug: post.slug, content: post.content,
      featured_image: post.featured_image || "",
      is_published: post.is_published,
      meta_title: post.seo?.meta_title || "",
      meta_description: post.seo?.meta_description || "",
    });
    setEditing(post);
    setShowEditor(true);
  };

  const savePost = async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    const slug = form.slug || generateSlug(form.title);
    const seo = { meta_title: form.meta_title, meta_description: form.meta_description };
    const payload = {
      store_id: storeId, title: form.title, slug, content: form.content,
      featured_image: form.featured_image || null, is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
      seo: seo as any,
    };

    if (editing) {
      const { error } = await supabase.from("marketplace_store_blog_posts").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Post updated" });
    } else {
      const { error } = await supabase.from("marketplace_store_blog_posts").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Post created" });
    }

    setSaving(false);
    setShowEditor(false);
    loadPosts();
  };

  const deletePost = async (id: string) => {
    await supabase.from("marketplace_store_blog_posts").delete().eq("id", id);
    toast({ title: "Post deleted" });
    loadPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newStatus = !post.is_published;
    await supabase.from("marketplace_store_blog_posts").update({
      is_published: newStatus,
      published_at: newStatus ? new Date().toISOString() : null,
    }).eq("id", post.id);
    toast({ title: newStatus ? "Published" : "Unpublished" });
    loadPosts();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} className="h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
          <Plus className="h-3 w-3 mr-1" /> New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <BookOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No blog posts yet</p>
          <p className="text-[10px] mt-1">Create content to engage your customers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <Card key={post.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{post.title}</p>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${post.is_published ? "border-green-500/30 text-green-400" : "border-white/10 text-white/30"}`}>
                        {post.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">/{post.slug}</p>
                    {post.content && <p className="text-[10px] text-white/40 mt-1 truncate">{post.content.substring(0, 80)}...</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => togglePublish(post)}
                      className="h-7 w-7 p-0 text-white/40 hover:text-white">
                      {post.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(post)}
                      className="h-7 w-7 p-0 text-white/40 hover:text-white">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePost(post.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-sm bg-primary border-white/10 max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">{editing ? "Edit Post" : "New Post"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 mb-1">Title *</p>
              <Input value={form.title} onChange={e => {
                setForm(f => ({ ...f, title: e.target.value, slug: f.slug || generateSlug(e.target.value) }));
              }} placeholder="My Blog Post" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Slug</p>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                placeholder="my-blog-post" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Content</p>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your blog post content here..." rows={8}
                className="text-xs border-white/10 bg-white/5 text-white resize-none" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Featured Image URL</p>
              <Input value={form.featured_image} onChange={e => setForm(f => ({ ...f, featured_image: e.target.value }))}
                placeholder="https://..." className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] text-white/40 mb-2">SEO Settings</p>
              <div className="space-y-2">
                <Input value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                  placeholder="Meta title (max 60 chars)" maxLength={60}
                  className="h-7 text-xs border-white/10 bg-white/5 text-white" />
                <Input value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                  placeholder="Meta description (max 160 chars)" maxLength={160}
                  className="h-7 text-xs border-white/10 bg-white/5 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white">Publish immediately</p>
              <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
            </div>
            <Button onClick={savePost} disabled={saving || !form.title.trim()}
              className="w-full h-8 text-xs bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              {editing ? "Update" : "Create"} Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantStoreBlog;
