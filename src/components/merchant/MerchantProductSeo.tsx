import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Loader2, CheckCircle2, AlertTriangle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

interface ProductSeo {
  id: string;
  name: string;
  status: string;
  seo: { meta_title?: string; meta_description?: string; slug?: string };
}

const MerchantProductSeo = ({ storeId }: Props) => {
  const [products, setProducts] = useState<ProductSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadProducts(); }, [storeId]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_products")
      .select("id, name, status, seo")
      .eq("store_id", storeId)
      .order("name");
    setProducts((data || []).map((p: any) => ({
      ...p,
      seo: (typeof p.seo === "object" && p.seo !== null) ? p.seo : {},
    })));
    setLoading(false);
  };

  const updateSeo = (productId: string, field: string, value: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, seo: { ...p.seo, [field]: value } } : p
    ));
  };

  const saveSeo = async (product: ProductSeo) => {
    setSaving(product.id);
    const { error } = await supabase
      .from("marketplace_products")
      .update({ seo: product.seo as any })
      .eq("id", product.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SEO saved" });
    }
    setSaving(null);
  };

  const getSeoScore = (seo: ProductSeo["seo"]): { score: number; label: string; color: string } => {
    let score = 0;
    if (seo.meta_title && seo.meta_title.length >= 10 && seo.meta_title.length <= 60) score += 40;
    else if (seo.meta_title && seo.meta_title.length > 0) score += 20;
    if (seo.meta_description && seo.meta_description.length >= 50 && seo.meta_description.length <= 160) score += 40;
    else if (seo.meta_description && seo.meta_description.length > 0) score += 20;
    if (seo.slug && seo.slug.length > 0) score += 20;

    if (score >= 80) return { score, label: "Good", color: "text-green-400" };
    if (score >= 40) return { score, label: "Fair", color: "text-yellow-400" };
    return { score, label: "Poor", color: "text-red-400" };
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: products.length, color: "text-white" },
          { label: "Optimized", value: products.filter(p => getSeoScore(p.seo).score >= 80).length, color: "text-green-400" },
          { label: "Needs Work", value: products.filter(p => getSeoScore(p.seo).score < 40).length, color: "text-red-400" },
        ].map(s => (
          <Card key={s.label} className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-white/40">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs border-white/10 bg-white/5 text-white placeholder:text-white/30" />
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {filtered.map(p => {
          const seoScore = getSeoScore(p.seo);
          const isExpanded = expanded === p.id;

          return (
            <Card key={p.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-white/30 shrink-0" />
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${seoScore.color} border-current/30`}>
                      {seoScore.score >= 80 ? <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> : <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                      {seoScore.label}
                    </Badge>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    <div>
                      <p className="text-[10px] text-white/40 mb-1">Meta Title <span className="text-white/20">(10-60 chars)</span></p>
                      <Input value={p.seo.meta_title || ""} onChange={e => updateSeo(p.id, "meta_title", e.target.value)}
                        placeholder={p.name} maxLength={60}
                        className="h-7 text-xs border-white/10 bg-white/5 text-white placeholder:text-white/20" />
                      <p className="text-[9px] text-white/20 mt-0.5">{(p.seo.meta_title || "").length}/60</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-1">Meta Description <span className="text-white/20">(50-160 chars)</span></p>
                      <Textarea value={p.seo.meta_description || ""} onChange={e => updateSeo(p.id, "meta_description", e.target.value)}
                        placeholder="Describe this product for search engines..."
                        maxLength={160} rows={2}
                        className="text-xs border-white/10 bg-white/5 text-white placeholder:text-white/20 resize-none" />
                      <p className="text-[9px] text-white/20 mt-0.5">{(p.seo.meta_description || "").length}/160</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 mb-1">URL Slug Override</p>
                      <Input value={p.seo.slug || ""} onChange={e => updateSeo(p.id, "slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="custom-url-slug"
                        className="h-7 text-xs border-white/10 bg-white/5 text-white placeholder:text-white/20" />
                    </div>
                    <Button size="sm" onClick={() => saveSeo(p)} disabled={saving === p.id}
                      className="w-full h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
                      {saving === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save SEO
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MerchantProductSeo;
