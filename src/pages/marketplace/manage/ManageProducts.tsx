import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, Package, Image, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  images: string[];
  description: string | null;
  sku: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ManageProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: storeData } = await supabase.from("marketplace_stores").select("id").eq("merchant_user_id", user.id).single();
      if (!storeData) { setLoading(false); return; }
      setStoreId(storeData.id);

      const [{ data: prodData }, { data: catData }] = await Promise.all([
        supabase.from("marketplace_products").select("*").eq("store_id", storeData.id).order("created_at", { ascending: false }),
        supabase.from("marketplace_categories").select("*").eq("store_id", storeData.id).order("sort_order"),
      ]);
      setProducts((prodData as Product[]) || []);
      setCategories((catData as Category[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setPrice(""); setStock(""); setSku("");
    setStatus("draft"); setIsFeatured(false); setCategoryId(""); setImages([]);
    setShowDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name); setDescription(p.description ?? ""); setPrice(String(p.price));
    setStock(String(p.stock_quantity)); setSku(p.sku ?? ""); setStatus(p.status);
    setIsFeatured(p.is_featured); setCategoryId(p.category_id ?? ""); setImages(p.images || []);
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !storeId || !user) return;
    setUploadingImages(true);
    const newUrls: string[] = [];

    for (const file of Array.from(e.target.files).slice(0, 5 - images.length)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("marketplace-assets").upload(path, file, { upsert: false });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
        newUrls.push(publicUrl);
      }
    }

    setImages((prev) => [...prev, ...newUrls].slice(0, 5));
    setUploadingImages(false);
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  const saveProduct = async () => {
    if (!storeId || !name.trim() || !price) return;
    setSaving(true);

    const payload = {
      store_id: storeId,
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      stock_quantity: Number(stock) || 0,
      sku: sku.trim() || null,
      status,
      is_featured: isFeatured,
      category_id: categoryId || null,
      images,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("marketplace_products").update(payload).eq("id", editing.id));
      if (!error) setProducts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...payload } as Product : p));
    } else {
      const { data, error: e } = await supabase.from("marketplace_products").insert(payload).select().single();
      error = e;
      if (!error && data) setProducts((prev) => [data as Product, ...prev]);
    }

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: editing ? "Product updated!" : "Product created!" }); setShowDialog(false); }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("marketplace_products").delete().eq("id", id);
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== id));
    else toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/30",
    draft: "bg-muted text-muted-foreground border-border",
    out_of_stock: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace/manage")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display flex-1">Products</span>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : !storeId ? (
          <div className="flex flex-col items-center py-16 gap-4 text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p className="font-medium">Create your store first</p>
            <Button variant="outline" onClick={() => navigate("/marketplace/manage/settings")}>Create Store</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4 text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p className="font-medium">No products yet</p>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add First Product</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0">
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-muted-foreground m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      {p.is_featured && <Badge className="text-[9px] h-4 px-1.5 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Featured</Badge>}
                    </div>
                    <p className="text-sm font-bold text-foreground">RM {Number(p.price).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${STATUS_COLORS[p.status]}`}>{p.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{p.stock_quantity} in stock</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Images */}
            <div>
              <Label className="text-xs mb-2 block">Product Images (up to 5)</Label>
              <div className="flex gap-2 flex-wrap">
                {images.map((url) => (
                  <div key={url} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="product" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(url)} className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">×</button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:bg-muted transition-colors"
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Product Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product" className="min-h-[80px] text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Price (RM) *</Label>
                <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock Quantity</Label>
                <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {categories.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Featured Product</Label>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>
            <Button onClick={saveProduct} disabled={saving || !name.trim() || !price} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : (editing ? "Update Product" : "Create Product")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
