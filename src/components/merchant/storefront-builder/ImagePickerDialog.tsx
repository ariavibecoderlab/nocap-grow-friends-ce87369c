import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";
import { Loader2, Upload, ImageIcon, Search, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeId: string;
  onSelect: (url: string) => void;
  folder?: string;
}

interface ProductImg { id: string; name: string; url: string; }
interface MediaImg { name: string; url: string; }

export default function ImagePickerDialog({ open, onOpenChange, storeId, onSelect, folder = "builder" }: Props) {
  const { toast } = useToast();
  const folderPath = `${folder}/${storeId}`;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [products, setProducts] = useState<ProductImg[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [media, setMedia] = useState<MediaImg[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Load product images
  useEffect(() => {
    if (!open) return;
    setProductsLoading(true);
    supabase
      .from("marketplace_products")
      .select("id, name, images")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const out: ProductImg[] = [];
        (data || []).forEach((p: any) => {
          const imgs = Array.isArray(p.images) ? p.images : [];
          imgs.forEach((u: string) => {
            if (typeof u === "string" && u) out.push({ id: p.id, name: p.name, url: u });
          });
        });
        setProducts(out);
        setProductsLoading(false);
      });
  }, [open, storeId]);

  // Load media library
  useEffect(() => {
    if (!open) return;
    setMediaLoading(true);
    supabase.storage
      .from("marketplace-assets")
      .list(folderPath, { limit: 100, sortBy: { column: "created_at", order: "desc" } })
      .then(({ data }) => {
        const items: MediaImg[] = (data || [])
          .filter((f) => f.name && !f.name.endsWith("/"))
          .map((f) => {
            const { data: pub } = supabase.storage.from("marketplace-assets").getPublicUrl(`${folderPath}/${f.name}`);
            return { name: f.name, url: pub.publicUrl };
          });
        setMedia(items);
        setMediaLoading(false);
      });
  }, [open, folderPath]);

  const pick = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files allowed", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folderPath}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("marketplace-assets").upload(path, compressed, { contentType: compressed.type, upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
      pick(pub.publicUrl);
      toast({ title: "Uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-base">Choose an image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="upload" className="data-[state=active]:bg-secondary data-[state=active]:text-primary text-xs">
              <Upload className="h-3 w-3 mr-1" /> Upload
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-secondary data-[state=active]:text-primary text-xs">
              <ImageIcon className="h-3 w-3 mr-1" /> From products
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-secondary data-[state=active]:text-primary text-xs">
              <ImageIcon className="h-3 w-3 mr-1" /> Media library
            </TabsTrigger>
          </TabsList>

          {/* UPLOAD */}
          <TabsContent value="upload" className="mt-4">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full h-48 rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-white/50 hover:text-white/80 hover:border-white/30 transition disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7" />
                  <span className="text-sm font-medium">Click to upload</span>
                  <span className="text-[11px] text-white/40">PNG, JPG, WEBP up to ~10MB</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-white/40 mt-2 text-center">Images are auto-compressed and saved to your media library.</p>
          </TabsContent>

          {/* PRODUCTS */}
          <TabsContent value="products" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="pl-8 bg-white/5 border-white/10 text-white h-9 text-xs"
              />
            </div>
            {productsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs">
                {products.length === 0 ? "No product images yet. Add product photos in your dashboard first." : "No matches."}
              </div>
            ) : (
              <ImageGrid items={filteredProducts.map((p) => ({ url: p.url, label: p.name }))} onPick={pick} />
            )}
          </TabsContent>

          {/* MEDIA LIBRARY */}
          <TabsContent value="media" className="mt-4">
            {mediaLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
            ) : media.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs">No images yet. Upload one to start your library.</div>
            ) : (
              <ImageGrid items={media.map((m) => ({ url: m.url, label: m.name }))} onPick={pick} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ImageGrid({ items, onPick }: { items: { url: string; label: string }[]; onPick: (u: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto pr-1">
      {items.map((it, i) => (
        <button
          key={`${it.url}-${i}`}
          onClick={() => onPick(it.url)}
          className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] hover:border-secondary hover:ring-2 hover:ring-secondary/40 transition"
          title={it.label}
        >
          <img src={it.url} alt={it.label} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
            <Check className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
          </div>
        </button>
      ))}
    </div>
  );
}
