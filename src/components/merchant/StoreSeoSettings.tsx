import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

export default function StoreSeoSettings({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("marketplace_stores").select("seo").eq("id", storeId).single();
      if (data?.seo && typeof data.seo === "object" && !Array.isArray(data.seo)) {
        const seo = data.seo as Record<string, string>;
        setMetaTitle(seo.meta_title || "");
        setMetaDesc(seo.meta_description || "");
        setOgImage(seo.og_image || "");
      }
      setLoading(false);
    };
    load();
  }, [storeId]);

  const save = async () => {
    setSaving(true);
    const seo = { meta_title: metaTitle, meta_description: metaDesc, og_image: ogImage };
    const { error } = await supabase.from("marketplace_stores").update({ seo: seo as unknown as Json }).eq("id", storeId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "SEO settings saved!" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
        <Globe className="h-4 w-4 text-secondary" /> Store SEO
      </h3>
      <p className="text-[11px] text-white/40">Optimize your store for search engines and social media sharing.</p>

      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-white/60 text-xs">Meta Title</Label>
            <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
              placeholder="My Awesome Store - Best Products Online"
              className="bg-white/5 border-white/10 text-white mt-1" />
            <p className="text-[10px] text-white/30 mt-0.5">{metaTitle.length}/60 characters</p>
          </div>
          <div>
            <Label className="text-white/60 text-xs">Meta Description</Label>
            <Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)}
              placeholder="Describe your store in 160 characters..."
              className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" />
            <p className="text-[10px] text-white/30 mt-0.5">{metaDesc.length}/160 characters</p>
          </div>
          <div>
            <Label className="text-white/60 text-xs">OG Image URL</Label>
            <Input value={ogImage} onChange={e => setOgImage(e.target.value)}
              placeholder="https://... (shared on social media)"
              className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
          <Button className="w-full bg-secondary text-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save SEO Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
