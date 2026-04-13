import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, FileText } from "lucide-react";

const StoreCustomPage = () => {
  const { slug, pageSlug } = useParams<{ slug: string; pageSlug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<{ title: string; content: string; seo: Record<string, string> } | null>(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !pageSlug) return;
    const fetch = async () => {
      // Get store id first
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, store_name")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      if (!storeData) { setLoading(false); return; }
      setStoreName(storeData.store_name);

      const { data: pageData } = await supabase
        .from("marketplace_store_pages")
        .select("title, content, seo")
        .eq("store_id", storeData.id)
        .eq("slug", pageSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (pageData) {
        setPage({
          title: pageData.title,
          content: pageData.content,
          seo: (pageData.seo as Record<string, string>) || {},
        });
        // Set document title for SEO
        const seo = pageData.seo as Record<string, string> | null;
        if (seo?.meta_title) document.title = seo.meta_title;
        else document.title = `${pageData.title} - ${storeData.store_name}`;
      }
      setLoading(false);
    };
    fetch();
  }, [slug, pageSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pt-8 mx-auto max-w-md">
          <button onClick={() => navigate(`/store/${slug}`)} className="rounded-full p-1 hover:bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center py-20 text-white/40">
            <FileText className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">Page not found</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-6 mx-auto max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/store/${slug}`)} className="rounded-full p-1.5 hover:bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-white">{page.title}</h1>
            <p className="text-[11px] text-white/40">{storeName}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-white/80 whitespace-pre-wrap leading-relaxed">
          {page.content}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default StoreCustomPage;
