import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ImageOff,
  X,
} from "lucide-react";

interface Store {
  id: string;
  store_name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  weight_kg: number | null;
  images: string[] | { url: string }[] | null;
  status: "active" | "inactive" | "draft";
  is_featured: boolean;
  sold_count: number;
  created_at: string;
}

type StatusFilter = "all" | "active" | "draft" | "inactive";

function getImageUrl(images: Product["images"]): string | null {
  if (!images || (Array.isArray(images) && images.length === 0)) return null;
  const first = (images as (string | { url: string })[])[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first) return first.url;
  return null;
}

function statusColor(status: Product["status"]): string {
  if (status === "active")
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (status === "draft")
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  sku: "",
  weight_kg: "",
  category_id: "",
  status: "draft" as Product["status"],
  imageUrls: [""],
};

export default function SellerProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Form sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle active state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch stores on mount
  useEffect(() => {
    if (!user) return;
    const fetchStores = async () => {
      setLoadingStores(true);
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, store_name")
        .eq("merchant_user_id", user.id);
      const list = (data as Store[]) || [];
      setStores(list);
      if (list.length > 0) setSelectedStoreId(list[0].id);
      setLoadingStores(false);
    };
    fetchStores();
  }, [user]);

  // Fetch categories once
  useEffect(() => {
    supabase
      .from("marketplace_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories((data as Category[]) || []));
  }, []);

  // Fetch products when store changes
  const fetchProducts = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("marketplace_products")
      .select("*")
      .eq("store_id", selectedStoreId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoadingProducts(false);
  }, [selectedStoreId, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    const rawImages = product.images as (string | { url: string })[] | null;
    const urls: string[] = rawImages
      ? rawImages.map((img) =>
          typeof img === "string" ? img : (img as { url: string }).url
        )
      : [""];
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
      sku: product.sku || "",
      weight_kg: product.weight_kg != null ? String(product.weight_kg) : "",
      category_id: product.category_id || "",
      status: product.status,
      imageUrls: urls.length > 0 ? urls : [""],
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const images = form.imageUrls.filter((u) => u.trim() !== "");
    const payload = {
      store_id: selectedStoreId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      sku: form.sku.trim() || null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      category_id: form.category_id || null,
      status: form.status,
      images: images.length > 0 ? images : null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("marketplace_products")
        .update(payload)
        .eq("id", editingProduct.id);
      if (error) {
        toast({
          title: "Error updating product",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Product updated" });
        setSheetOpen(false);
        fetchProducts();
      }
    } else {
      const { error } = await supabase
        .from("marketplace_products")
        .insert(payload);
      if (error) {
        toast({
          title: "Error adding product",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Product added" });
        setSheetOpen(false);
        fetchProducts();
      }
    }
    setSaving(false);
  };

  const handleToggle = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    setTogglingId(product.id);
    const { error } = await supabase
      .from("marketplace_products")
      .update({ status: newStatus })
      .eq("id", product.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("marketplace_products")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast({ title: "Product deleted" });
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  const addImageField = () => {
    if (form.imageUrls.length >= 5) return;
    setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ""] }));
  };

  const updateImageUrl = (index: number, value: string) => {
    setForm((f) => {
      const updated = [...f.imageUrls];
      updated[index] = value;
      return { ...f, imageUrls: updated };
    });
  };

  const removeImageField = (index: number) => {
    setForm((f) => ({
      ...f,
      imageUrls: f.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "draft", label: "Draft" },
    { key: "inactive", label: "Inactive" },
  ];

  if (loadingStores) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/merchant")}
            className="rounded-full p-1 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-white flex-1">
            My Products
          </h1>
          {stores.length > 1 && (
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-40 h-8 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {stores.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-white focus:bg-white/10"
                  >
                    {s.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            onClick={openAdd}
            disabled={!selectedStoreId}
            className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* No store state */}
        {stores.length === 0 && (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center py-16">
              <Package className="h-12 w-12 text-white/20 mb-4" />
              <p className="text-white font-semibold">No store found</p>
              <p className="text-white/40 text-sm mt-1 text-center max-w-xs">
                Create a store in the Merchant Dashboard first before adding
                products.
              </p>
              <Button
                className="mt-6 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                onClick={() => navigate("/merchant")}
              >
                Go to Merchant Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedStoreId && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === tab.key
                      ? "bg-secondary text-primary"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({products.filter((p) => p.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Product list */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center py-16">
                  <Package className="h-12 w-12 text-white/20 mb-4" />
                  <p className="text-white font-semibold">
                    {products.length === 0 ? "No products yet" : "No results"}
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    {products.length === 0
                      ? "Add your first product to get started"
                      : "Try a different search or filter"}
                  </p>
                  {products.length === 0 && (
                    <Button
                      className="mt-6 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                      onClick={openAdd}
                    >
                      Add your first product
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.map((product) => {
                  const imageUrl = getImageUrl(product.images);
                  return (
                    <Card
                      key={product.id}
                      className="border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors"
                    >
                      <CardContent className="p-3 flex gap-3">
                        {/* Cover image */}
                        <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-white/20" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {product.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] px-1.5 py-0 ${statusColor(
                                product.status
                              )}`}
                            >
                              {product.status}
                            </Badge>
                          </div>
                          <p className="text-secondary text-sm font-semibold mt-0.5">
                            RM {Number(product.price).toFixed(2)}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-white/40">
                              Stock:{" "}
                              <span className="text-white/60">
                                {product.stock_quantity}
                              </span>
                            </span>
                            <span className="text-[11px] text-white/40">
                              Sold:{" "}
                              <span className="text-white/60">
                                {product.sold_count}
                              </span>
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      {/* Actions */}
                      <div className="flex items-center gap-1 px-3 pb-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(product)}
                          className="h-7 text-[11px] text-white/50 hover:text-white hover:bg-white/10 gap-1"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggle(product)}
                          disabled={togglingId === product.id}
                          className={`h-7 text-[11px] gap-1 ${
                            product.status === "active"
                              ? "text-green-400 hover:bg-green-500/10"
                              : "text-white/40 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {togglingId === product.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : product.status === "active" ? (
                            <ToggleRight className="h-3 w-3" />
                          ) : (
                            <ToggleLeft className="h-3 w-3" />
                          )}
                          {product.status === "active" ? "Active" : "Inactive"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(product)}
                          className="h-7 text-[11px] text-destructive hover:bg-destructive/10 gap-1 ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] bg-card border-white/10 text-white overflow-y-auto"
        >
          <SheetTitle className="font-display text-white mb-6">
            {editingProduct ? "Edit Product" : "Add Product"}
          </SheetTitle>

          <div className="space-y-4 pr-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Name *</Label>
              <Input
                placeholder="Product name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Description</Label>
              <Textarea
                placeholder="Describe the product..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px] resize-none"
              />
            </div>

            {/* Price + Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Price (RM)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Stock Quantity</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock_quantity: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* SKU + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">SKU (optional)</Label>
                <Input
                  placeholder="e.g. PRD-001"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">
                  Weight KG (optional)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.5"
                  value={form.weight_kg}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weight_kg: e.target.value }))
                  }
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category_id: v }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {categories.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="text-white focus:bg-white/10"
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as Product["status"] }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem
                    value="active"
                    className="text-white focus:bg-white/10"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value="draft"
                    className="text-white focus:bg-white/10"
                  >
                    Draft
                  </SelectItem>
                  <SelectItem
                    value="inactive"
                    className="text-white focus:bg-white/10"
                  >
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image URLs */}
            <div className="space-y-2">
              <Label className="text-white/70 text-xs">
                Images (up to 5 URLs)
              </Label>
              {form.imageUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(e) => updateImageUrl(i, e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
                  />
                  {form.imageUrls.length > 1 && (
                    <button
                      onClick={() => removeImageField(i)}
                      className="text-white/30 hover:text-white/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {form.imageUrls.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addImageField}
                  className="text-white/40 hover:text-white hover:bg-white/10 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add image URL
                </Button>
              )}
            </div>

            {/* Save */}
            <Button
              className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold mt-2"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingProduct ? "Save Changes" : "Add Product"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This cannot be undone. The product will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
