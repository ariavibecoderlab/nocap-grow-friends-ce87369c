import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import OrderStatusBadge from "@/components/marketplace/OrderStatusBadge";
import MerchantOrderDetail from "@/components/merchant/MerchantOrderDetail";
import { Store, Plus, Package, ShoppingCart, Tag, Loader2, Trash2, Edit, Upload, X, Settings, Truck, Star, Printer, Zap, BarChart3, FileUp, RotateCcw, Layout, FileText, Menu, Globe } from "lucide-react";
import StoreThemePicker from "@/components/merchant/StoreThemePicker";
import MerchantFlashSales from "@/components/merchant/MerchantFlashSales";
import BulkProductUpload from "@/components/merchant/BulkProductUpload";
import StoreAnalytics from "@/components/merchant/StoreAnalytics";
import MerchantReviews from "@/components/merchant/MerchantReviews";
import MerchantReturns from "@/components/merchant/MerchantReturns";
import StorePageBuilder from "@/components/merchant/StorePageBuilder";
import MerchantStorePages from "@/components/merchant/MerchantStorePages";
import MerchantStoreMenus from "@/components/merchant/MerchantStoreMenus";
import StoreSeoSettings from "@/components/merchant/StoreSeoSettings";
import { Json } from "@/integrations/supabase/types";
import { ThemeOverrides } from "@/lib/storeThemes";
import ProductVariantEditor from "@/components/merchant/ProductVariantEditor";
import { compressImage } from "@/lib/compressImage";
import { generateBulkSalesOrderPdf, type SalesOrderData } from "@/lib/generateSalesOrderPdf";
import { Checkbox } from "@/components/ui/checkbox";

interface StoreData {
  id: string;
  store_name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: string;
  theme: string;
  primary_color: string;
  shipping_flat_rate: number;
  free_shipping_min: number | null;
  email: string | null;
  whatsapp: string | null;
  branch_id: string;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  status: string;
  images: Json;
  is_featured: boolean;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  buyer_name: string;
  tracking_number: string | null;
  created_at: string;
}

interface DiscountRow {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
}

interface MerchantMarketplaceProps {
  branches: { id: string; branch_name: string }[];
  selectedBranchId: string | null;
}

export default function MerchantMarketplace({ branches, selectedBranchId }: MerchantMarketplaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  // Store creation
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createBranch, setCreateBranch] = useState("");
  const [createTagline, setCreateTagline] = useState("");
  const [createLogoUrl, setCreateLogoUrl] = useState("");
  const [createBannerUrl, setCreateBannerUrl] = useState("");
  const [uploadingCreateLogo, setUploadingCreateLogo] = useState(false);
  const [uploadingCreateBanner, setUploadingCreateBanner] = useState(false);
  const [creating, setCreating] = useState(false);
  const createLogoRef = useRef<HTMLInputElement>(null);
  const createBannerRef = useRef<HTMLInputElement>(null);

  // Product dialog
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodStatus, setProdStatus] = useState("active");
  const [savingProd, setSavingProd] = useState(false);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Order update
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkPrinting, setBulkPrinting] = useState(false);

  // Discount dialog
  const [showDiscount, setShowDiscount] = useState(false);
  const [discCode, setDiscCode] = useState("");
  const [discType, setDiscType] = useState("percentage");
  const [discValue, setDiscValue] = useState("");
  const [discMinOrder, setDiscMinOrder] = useState("");
  const [discMaxUses, setDiscMaxUses] = useState("");
  const [savingDisc, setSavingDisc] = useState(false);

  // Store settings
  const [settingsTagline, setSettingsTagline] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsWhatsapp, setSettingsWhatsapp] = useState("");
  const [settingsShipping, setSettingsShipping] = useState("");
  const [settingsFreeMin, setSettingsFreeMin] = useState("");
  const [settingsTheme, setSettingsTheme] = useState("classic");
  const [settingsStoreName, setSettingsStoreName] = useState("");
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !selectedBranchId) return;
    fetchStore();
  }, [user, selectedBranchId]);

  const fetchStore = async () => {
    setLoading(true);
    setStore(null);
    setProducts([]);
    setOrders([]);
    setDiscounts([]);
    const { data } = await supabase
      .from("marketplace_stores")
      .select("*")
      .eq("merchant_user_id", user!.id)
      .eq("branch_id", selectedBranchId!)
      .maybeSingle();

    if (data) {
      const s = data as unknown as StoreData;
      setStore(s);
      setSettingsStoreName(s.store_name);
      setSettingsTagline(s.tagline || "");
      setSettingsDesc(s.description || "");
      setSettingsEmail(s.email || "");
      setSettingsWhatsapp(s.whatsapp || "");
      setSettingsShipping(String(s.shipping_flat_rate || 0));
      setSettingsFreeMin(s.free_shipping_min ? String(s.free_shipping_min) : "");
      setSettingsTheme(s.theme || "classic");
      // Load theme overrides from settings JSONB
      const storeSettings = (data as any).settings;
      if (storeSettings && typeof storeSettings === "object" && storeSettings.theme_overrides) {
        setThemeOverrides(storeSettings.theme_overrides as ThemeOverrides);
      } else {
        setThemeOverrides({});
      }
      await Promise.all([fetchProducts(data.id), fetchOrders(data.id), fetchDiscounts(data.id)]);
    }
    setLoading(false);
  };

  const fetchProducts = async (storeId: string) => {
    const { data } = await supabase
      .from("marketplace_products")
      .select("id, name, price, stock_quantity, status, images, is_featured")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setProducts((data as ProductRow[]) || []);
  };

  const fetchOrders = async (storeId: string) => {
    const { data } = await supabase
      .from("marketplace_orders")
      .select("id, order_number, status, total_amount, buyer_name, tracking_number, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders((data as OrderRow[]) || []);
  };

  const fetchDiscounts = async (storeId: string) => {
    const { data } = await supabase
      .from("marketplace_discount_codes")
      .select("id, code, discount_type, discount_value, is_active, used_count, max_uses, expires_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setDiscounts((data as DiscountRow[]) || []);
  };

  const createStore = async () => {
    if (!createName.trim() || !createSlug.trim() || !createBranch) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("marketplace_stores")
      .insert({
        merchant_user_id: user!.id,
        store_name: createName.trim(),
        slug: createSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        branch_id: createBranch,
        status: "draft",
        tagline: createTagline.trim() || null,
        logo_url: createLogoUrl || null,
        banner_url: createBannerUrl || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const s = data as unknown as StoreData;
      setStore(s);
      setSettingsStoreName(s.store_name);
      setSettingsTagline(s.tagline || "");
      setShowCreate(false);
      toast({ title: "Store created!" });
    }
    setCreating(false);
  };

  const uploadCreateImage = async (file: File, type: 'logo' | 'banner') => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15MB", variant: "destructive" });
      return;
    }
    type === 'logo' ? setUploadingCreateLogo(true) : setUploadingCreateBanner(true);
    const maxDim = type === 'logo' ? 512 : 1600;
    const compressed = await compressImage(file, maxDim, maxDim);
    const ext = compressed.name.split('.').pop() || 'jpg';
    const path = `${user.id}/store/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, compressed);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from('marketplace-assets').getPublicUrl(path);
      if (type === 'logo') setCreateLogoUrl(urlData.publicUrl);
      else setCreateBannerUrl(urlData.publicUrl);
      toast({ title: `${type === 'logo' ? 'Logo' : 'Banner'} uploaded` });
    }
    type === 'logo' ? setUploadingCreateLogo(false) : setUploadingCreateBanner(false);
  };

  const toggleStoreLive = async () => {
    if (!store) return;
    const newStatus = store.status === "live" ? "draft" : "live";
    const { error } = await supabase
      .from("marketplace_stores")
      .update({ status: newStatus })
      .eq("id", store.id);
    if (!error) {
      setStore({ ...store, status: newStatus });
      toast({ title: newStatus === "live" ? "Store is now live!" : "Store taken offline" });
    }
  };

  const uploadImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !store) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    const compressed = await compressImage(file, 1200, 1200);
    const ext = compressed.name.split('.').pop() || 'jpg';
    const path = `${user.id}/products/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, compressed);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from('marketplace-assets').getPublicUrl(path);
      setProdImages(prev => [...prev, urlData.publicUrl]);
      toast({ title: "Image uploaded" });
    }
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setProdImages(prev => prev.filter((_, i) => i !== idx));
  };

  const saveProduct = async () => {
    if (!store || !prodName.trim() || !prodPrice) return;
    setSavingProd(true);

    const payload = {
      store_id: store.id,
      name: prodName.trim(),
      price: Number(prodPrice),
      stock_quantity: Number(prodStock) || 0,
      description: prodDesc.trim() || null,
      status: prodStatus,
      images: prodImages as unknown as Json,
    };

    if (editProduct) {
      const { error } = await supabase.from("marketplace_products").update(payload).eq("id", editProduct.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Product updated" });
    } else {
      const { error } = await supabase.from("marketplace_products").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Product added" });
    }

    await fetchProducts(store.id);
    setShowProduct(false);
    resetProductForm();
    setSavingProd(false);
  };

  const resetProductForm = () => {
    setEditProduct(null);
    setProdName("");
    setProdPrice("");
    setProdStock("");
    setProdDesc("");
    setProdStatus("active");
    setProdImages([]);
  };

  const openEditProduct = (p: ProductRow) => {
    setEditProduct(p);
    setProdName(p.name);
    setProdPrice(String(p.price));
    setProdStock(String(p.stock_quantity));
    setProdStatus(p.status);
    setProdImages(Array.isArray(p.images) ? (p.images as string[]) : []);
    setShowProduct(true);
  };

  const deleteProduct = async (id: string) => {
    if (!store) return;
    await supabase.from("marketplace_products").delete().eq("id", id);
    await fetchProducts(store.id);
    toast({ title: "Product deleted" });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, trackingNumber?: string) => {
    setUpdatingOrder(orderId);
    const update: Record<string, string> = { status: newStatus };
    if (trackingNumber) update.tracking_number = trackingNumber;
    await supabase.from("marketplace_orders").update(update).eq("id", orderId);
    if (store) await fetchOrders(store.id);
    toast({ title: `Order ${newStatus}` });
    setUpdatingOrder(null);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.id)));
    }
  };

  const bulkPrintOrders = async () => {
    if (!store || selectedOrderIds.size === 0) return;
    setBulkPrinting(true);
    try {
      // Fetch full order details + items for selected orders
      const ids = Array.from(selectedOrderIds);
      const [ordersRes, itemsRes, storeRes] = await Promise.all([
        supabase
          .from("marketplace_orders")
          .select("id, order_number, status, buyer_name, buyer_email, buyer_phone, shipping_address, notes, subtotal, shipping_fee, total_amount, tracking_number, created_at")
          .in("id", ids),
        supabase
          .from("marketplace_order_items")
          .select("order_id, product_name, quantity, unit_price, subtotal")
          .in("order_id", ids),
        supabase
          .from("marketplace_stores")
          .select("store_name, logo_url")
          .eq("id", store.id)
          .single(),
      ]);

      if (!ordersRes.data || !storeRes.data) throw new Error("Failed to fetch data");

      const itemsByOrder = new Map<string, typeof itemsRes.data>();
      for (const item of (itemsRes.data || [])) {
        const arr = itemsByOrder.get(item.order_id) || [];
        arr.push(item);
        itemsByOrder.set(item.order_id, arr);
      }

      const salesOrders: SalesOrderData[] = ordersRes.data.map(o => ({
        storeName: storeRes.data.store_name,
        logoUrl: storeRes.data.logo_url,
        orderNumber: o.order_number,
        orderDate: o.created_at,
        status: o.status,
        buyerName: o.buyer_name,
        buyerEmail: o.buyer_email,
        buyerPhone: o.buyer_phone,
        shippingAddress: o.shipping_address,
        notes: o.notes,
        items: (itemsByOrder.get(o.id) || []).map(i => ({
          productName: i.product_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
        })),
        subtotal: o.subtotal,
        shippingFee: o.shipping_fee,
        totalAmount: o.total_amount,
        trackingNumber: o.tracking_number,
      }));

      await generateBulkSalesOrderPdf(salesOrders);
      toast({ title: `${salesOrders.length} sales order(s) downloaded` });
      setSelectedOrderIds(new Set());
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    }
    setBulkPrinting(false);
  };

  const saveDiscount = async () => {
    if (!store || !discCode.trim() || !discValue) return;
    setSavingDisc(true);
    const { error } = await supabase.from("marketplace_discount_codes").insert({
      store_id: store.id,
      code: discCode.trim().toUpperCase(),
      discount_type: discType,
      discount_value: Number(discValue),
      min_order_amount: discMinOrder ? Number(discMinOrder) : null,
      max_uses: discMaxUses ? Number(discMaxUses) : null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Discount created!" });
      await fetchDiscounts(store.id);
      setShowDiscount(false);
      setDiscCode(""); setDiscValue(""); setDiscMinOrder(""); setDiscMaxUses("");
    }
    setSavingDisc(false);
  };

  const toggleDiscount = async (id: string, active: boolean) => {
    await supabase.from("marketplace_discount_codes").update({ is_active: !active }).eq("id", id);
    if (store) await fetchDiscounts(store.id);
  };

  const uploadStoreImage = async (file: File, type: 'logo' | 'banner') => {
    if (!user || !store) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image must be under 15MB", variant: "destructive" });
      return;
    }
    type === 'logo' ? setUploadingLogo(true) : setUploadingBanner(true);
    const maxDim = type === 'logo' ? 512 : 1600;
    const compressed = await compressImage(file, maxDim, maxDim);
    const ext = compressed.name.split('.').pop() || 'jpg';
    const path = `${user.id}/store/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('marketplace-assets').upload(path, compressed);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from('marketplace-assets').getPublicUrl(path);
      const url = urlData.publicUrl;
      const field = type === 'logo' ? 'logo_url' : 'banner_url';
      await supabase.from('marketplace_stores').update({ [field]: url }).eq('id', store.id);
      setStore({ ...store, [field]: url });
      toast({ title: `${type === 'logo' ? 'Logo' : 'Banner'} updated` });
    }
    type === 'logo' ? setUploadingLogo(false) : setUploadingBanner(false);
  };

  const saveSettings = async () => {
    if (!store) return;
    setSavingSettings(true);
    const currentSettings = (store as any).settings || {};
    const { error } = await supabase.from('marketplace_stores').update({
      store_name: settingsStoreName.trim(),
      tagline: settingsTagline.trim() || null,
      description: settingsDesc.trim() || null,
      email: settingsEmail.trim() || null,
      whatsapp: settingsWhatsapp.trim() || null,
      shipping_flat_rate: Number(settingsShipping) || 0,
      free_shipping_min: settingsFreeMin ? Number(settingsFreeMin) : null,
      theme: settingsTheme,
      settings: { ...currentSettings, theme_overrides: themeOverrides } as any,
    }).eq('id', store.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStore({
        ...store,
        store_name: settingsStoreName.trim(),
        tagline: settingsTagline.trim() || null,
        description: settingsDesc.trim() || null,
        email: settingsEmail.trim() || null,
        whatsapp: settingsWhatsapp.trim() || null,
        shipping_flat_rate: Number(settingsShipping) || 0,
        free_shipping_min: settingsFreeMin ? Number(settingsFreeMin) : null,
        theme: settingsTheme,
      });
      toast({ title: "Settings saved!" });
    }
    setSavingSettings(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-col items-center py-10">
          <Store className="h-10 w-10 text-white/30 mb-3" />
          <p className="font-display text-base font-semibold text-white">No Store Yet</p>
          <p className="text-xs text-white/40 mt-1 text-center">Create your marketplace store to start selling</p>
          <Button className="mt-4 bg-secondary text-primary hover:bg-secondary/90" onClick={() => { if (selectedBranchId) setCreateBranch(selectedBranchId); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create Store
          </Button>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="bg-primary border-white/10 text-white">
              <DialogHeader><DialogTitle className="font-display">Create Store</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <Label className="text-white/60 text-xs">Store Name</Label>
                  <Input value={createName} onChange={e => setCreateName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Tagline</Label>
                  <Input value={createTagline} onChange={e => setCreateTagline(e.target.value)}
                    placeholder="Your store's catchy tagline"
                    className="bg-white/5 border-white/10 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Store URL Slug</Label>
                  <Input value={createSlug} onChange={e => setCreateSlug(e.target.value)}
                    placeholder="my-store" className="bg-white/5 border-white/10 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Branch</Label>
                  <Select value={createBranch} onValueChange={setCreateBranch}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-primary border-white/10 text-white">
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Logo Upload */}
                <div>
                  <Label className="text-white/60 text-xs">Store Logo</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="h-14 w-14 rounded-lg border border-white/10 overflow-hidden shrink-0">
                      {createLogoUrl ? (
                        <img src={createLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <Store className="h-5 w-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <Button type="button" size="sm" variant="outline" className="border-white/10 text-white/60 text-xs"
                      disabled={uploadingCreateLogo}
                      onClick={() => createLogoRef.current?.click()}>
                      {uploadingCreateLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                      {createLogoUrl ? "Change" : "Upload"}
                    </Button>
                    {createLogoUrl && (
                      <Button type="button" size="sm" variant="ghost" className="text-white/40 h-8 w-8 p-0" onClick={() => setCreateLogoUrl("")}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <input ref={createLogoRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) uploadCreateImage(e.target.files[0], 'logo'); e.target.value = ''; }} />
                  </div>
                </div>

                {/* Banner Upload */}
                <div>
                  <Label className="text-white/60 text-xs">Store Banner</Label>
                  <div className="mt-1.5">
                    <div className="h-20 w-full rounded-lg border border-white/10 overflow-hidden">
                      {createBannerUrl ? (
                        <img src={createBannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <p className="text-[10px] text-white/20">No banner</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Button type="button" size="sm" variant="outline" className="border-white/10 text-white/60 text-xs"
                        disabled={uploadingCreateBanner}
                        onClick={() => createBannerRef.current?.click()}>
                        {uploadingCreateBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                        {createBannerUrl ? "Change" : "Upload"}
                      </Button>
                      {createBannerUrl && (
                        <Button type="button" size="sm" variant="ghost" className="text-white/40 h-8 w-8 p-0" onClick={() => setCreateBannerUrl("")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <input ref={createBannerRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) uploadCreateImage(e.target.files[0], 'banner'); e.target.value = ''; }} />
                  </div>
                </div>

                <Button className="w-full bg-secondary text-primary" onClick={createStore} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Store"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = { draft: "text-yellow-400", live: "text-green-400" };

  return (
    <div className="space-y-4">
      {/* Store Header */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Store className="h-5 w-5 text-secondary" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{store.store_name}</p>
              <p className={`text-[10px] font-medium ${statusColors[store.status] || "text-white/40"}`}>
                {store.status === "live" ? "● Live" : "● Draft"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={toggleStoreLive}
            className={`text-xs ${store.status === "live" ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"}`}>
            {store.status === "live" ? "Take Offline" : "Go Live"}
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-white/5 border border-white/10 flex-wrap h-auto gap-0">
          <TabsTrigger value="products" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Products</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Orders</TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Reviews</TabsTrigger>
          <TabsTrigger value="flash" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <Zap className="h-3 w-3 mr-0.5" />Flash
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Discounts</TabsTrigger>
          <TabsTrigger value="returns" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <RotateCcw className="h-3 w-3 mr-0.5" />Returns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <BarChart3 className="h-3 w-3 mr-0.5" />Stats
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <Layout className="h-3 w-3 mr-0.5" />Builder
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <FileText className="h-3 w-3 mr-0.5" />Pages
          </TabsTrigger>
          <TabsTrigger value="menus" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <Menu className="h-3 w-3 mr-0.5" />Menus
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            <Globe className="h-3 w-3 mr-0.5" />SEO
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Settings</TabsTrigger>
        </TabsList>

        {/* RETURNS TAB */}
        <TabsContent value="returns" className="mt-3">
          <MerchantReturns storeId={store.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-3">
          <StoreAnalytics storeId={store.id} />
        </TabsContent>

        {/* BUILDER TAB */}
        <TabsContent value="builder" className="mt-3">
          <StorePageBuilder storeId={store.id} />
        </TabsContent>

        {/* PAGES TAB */}
        <TabsContent value="pages" className="mt-3">
          <MerchantStorePages storeId={store.id} storeSlug={store.slug} />
        </TabsContent>

        {/* MENUS TAB */}
        <TabsContent value="menus" className="mt-3">
          <MerchantStoreMenus storeId={store.id} />
        </TabsContent>

        {/* SEO TAB */}
        <TabsContent value="seo" className="mt-3">
          <StoreSeoSettings storeId={store.id} />
        </TabsContent>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-3 mt-3">
          <BulkProductUpload storeId={store.id} onComplete={() => fetchProducts(store.id)} />
          <div className="flex justify-end">
            <Button size="sm" className="bg-secondary text-primary text-xs" onClick={() => { resetProductForm(); setShowProduct(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
            </Button>
          </div>
          {products.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center py-8 text-white/40">
                <Package className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No products yet</p>
              </CardContent>
            </Card>
          ) : (
            products.map(p => (
              <Card key={p.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-white/10 shrink-0 overflow-hidden">
                    {(p.images as string[])?.[0] ? (
                      <img src={(p.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-white/20" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-white/40">RM {p.price.toFixed(2)} · Stock: {p.stock_quantity} · {p.status}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditProduct(p)} className="p-1.5 text-white/40 hover:text-white">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-red-400/60 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-3 mt-3">
          {selectedOrderId ? (
            <MerchantOrderDetail
              orderId={selectedOrderId}
              onBack={() => setSelectedOrderId(null)}
              onStatusChange={() => { if (store) fetchOrders(store.id); }}
            />
          ) : orders.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center py-8 text-white/40">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No orders yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Bulk actions bar */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedOrderIds.size === orders.length && orders.length > 0}
                    onCheckedChange={toggleSelectAllOrders}
                  />
                  <span className="text-xs text-white/50">
                    {selectedOrderIds.size > 0
                      ? `${selectedOrderIds.size} selected`
                      : "Select all"}
                  </span>
                </label>
                {selectedOrderIds.size > 0 && (
                  <Button
                    size="sm"
                    className="bg-secondary text-primary text-xs h-8"
                    onClick={bulkPrintOrders}
                    disabled={bulkPrinting}
                  >
                    {bulkPrinting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Printer className="h-3.5 w-3.5 mr-1" />}
                    Print {selectedOrderIds.size} Order{selectedOrderIds.size > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
              {orders.map(o => (
                <Card key={o.id} className="border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOrderIds.has(o.id)}
                        onCheckedChange={() => toggleOrderSelection(o.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="flex items-center justify-between flex-1 cursor-pointer"
                        onClick={() => setSelectedOrderId(o.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">#{o.order_number}</p>
                          <p className="text-[10px] text-white/40">{o.buyer_name} · {new Date(o.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">RM {o.total_amount.toFixed(2)}</p>
                          <OrderStatusBadge status={o.status} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews" className="mt-3">
          <MerchantReviews storeId={store.id} />
        </TabsContent>

        {/* FLASH SALES TAB */}
        <TabsContent value="flash" className="mt-3">
          <MerchantFlashSales storeId={store.id} />
        </TabsContent>

        {/* DISCOUNTS TAB */}
        <TabsContent value="discounts" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" className="bg-secondary text-primary text-xs" onClick={() => setShowDiscount(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Code
            </Button>
          </div>
          {discounts.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center py-8 text-white/40">
                <Tag className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No discount codes yet</p>
              </CardContent>
            </Card>
          ) : (
            discounts.map(d => (
              <Card key={d.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-semibold text-secondary">{d.code}</p>
                    <p className="text-[10px] text-white/40">
                      {d.discount_type === "percentage" ? `${d.discount_value}% off` : `RM ${d.discount_value} off`}
                      {d.max_uses ? ` · ${d.used_count}/${d.max_uses} used` : ` · ${d.used_count} used`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toggleDiscount(d.id, d.is_active)}
                    className={`text-[10px] h-7 ${d.is_active ? "border-green-500/30 text-green-400" : "border-white/10 text-white/40"}`}>
                    {d.is_active ? "Active" : "Inactive"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4 mt-3">
          {/* Logo & Banner */}
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-display text-sm font-semibold text-white">Store Branding</h3>
              
              {/* Logo */}
              <div>
                <Label className="text-white/60 text-xs">Store Logo</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="h-16 w-16 rounded-lg border border-white/10 overflow-hidden shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <Store className="h-6 w-6 text-white/20" />
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="border-white/10 text-white/60 text-xs"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}>
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                    Upload Logo
                  </Button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) uploadStoreImage(e.target.files[0], 'logo'); e.target.value = ''; }} />
                </div>
              </div>

              {/* Banner */}
              <div>
                <Label className="text-white/60 text-xs">Store Banner</Label>
                <div className="mt-1.5">
                  <div className="h-24 w-full rounded-lg border border-white/10 overflow-hidden">
                    {store.banner_url ? (
                      <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <p className="text-xs text-white/20">No banner uploaded</p>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="border-white/10 text-white/60 text-xs mt-2"
                    disabled={uploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}>
                    {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                    Upload Banner
                  </Button>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) uploadStoreImage(e.target.files[0], 'banner'); e.target.value = ''; }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Info */}
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-white">Store Information</h3>
              <div>
                <Label className="text-white/60 text-xs">Store Name</Label>
                <Input value={settingsStoreName} onChange={e => setSettingsStoreName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Tagline</Label>
                <Input value={settingsTagline} onChange={e => setSettingsTagline(e.target.value)}
                  placeholder="Your store's catchy tagline"
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Description</Label>
                <Textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)}
                  placeholder="Tell customers about your store"
                  className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" />
              </div>
              <StoreThemePicker
                currentTheme={settingsTheme}
                overrides={themeOverrides}
                onThemeChange={setSettingsTheme}
                onOverridesChange={setThemeOverrides}
              />
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-secondary" /> Delivery Settings
              </h3>
              <div>
                <Label className="text-white/60 text-xs">Flat Shipping Rate (RM)</Label>
                <Input type="number" step="0.01" value={settingsShipping}
                  onChange={e => setSettingsShipping(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Free Shipping Minimum (RM)</Label>
                <Input type="number" step="0.01" value={settingsFreeMin}
                  onChange={e => setSettingsFreeMin(e.target.value)}
                  placeholder="Leave empty for no free shipping"
                  className="bg-white/5 border-white/10 text-white mt-1" />
                <p className="text-[10px] text-white/30 mt-1">Orders above this amount get free shipping</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-display text-sm font-semibold text-white">Contact Info</h3>
              <div>
                <Label className="text-white/60 text-xs">Email</Label>
                <Input type="email" value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)}
                  placeholder="store@example.com"
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">WhatsApp</Label>
                <Input value={settingsWhatsapp} onChange={e => setSettingsWhatsapp(e.target.value)}
                  placeholder="60123456789"
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold h-11"
            onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={showProduct} onOpenChange={setShowProduct}>
        <DialogContent className="bg-primary border-white/10 text-white">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {/* Image Upload */}
            <div>
              <Label className="text-white/60 text-xs">Product Images</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {prodImages.map((url, idx) => (
                  <div key={idx} className="relative h-16 w-16 rounded-lg overflow-hidden border border-white/10">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 bg-black/70 rounded-bl-lg p-0.5">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="h-16 w-16 rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 hover:text-white/60 hover:border-white/40 transition-colors"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span className="text-[8px] mt-0.5">Add</span>
                    </>
                  )}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
              <p className="text-[10px] text-white/30 mt-1">Max 5MB per image. First image is the cover.</p>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Product Name</Label>
              <Input value={prodName} onChange={e => setProdName(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Price (RM)</Label>
                <Input type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Stock</Label>
                <Input type="number" value={prodStock} onChange={e => setProdStock(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Description</Label>
              <Textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Status</Label>
              <Select value={prodStatus} onValueChange={setProdStatus}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10 text-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Variant Editor - only for existing products */}
            {editProduct && (
              <ProductVariantEditor productId={editProduct.id} />
            )}
            <Button className="w-full bg-secondary text-primary" onClick={saveProduct} disabled={savingProd}>
              {savingProd ? <Loader2 className="h-4 w-4 animate-spin" /> : editProduct ? "Save Changes" : "Add Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscount} onOpenChange={setShowDiscount}>
        <DialogContent className="bg-primary border-white/10 text-white">
          <DialogHeader><DialogTitle className="font-display">Create Discount Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/60 text-xs">Code</Label>
              <Input value={discCode} onChange={e => setDiscCode(e.target.value.toUpperCase())}
                placeholder="LAUNCH20" className="bg-white/5 border-white/10 text-white mt-1 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Type</Label>
                <Select value={discType} onValueChange={setDiscType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-primary border-white/10 text-white">
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Value</Label>
                <Input type="number" step="0.01" value={discValue} onChange={e => setDiscValue(e.target.value)}
                  placeholder={discType === "percentage" ? "20" : "5.00"}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Min Order (optional)</Label>
                <Input type="number" step="0.01" value={discMinOrder} onChange={e => setDiscMinOrder(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Max Uses (optional)</Label>
                <Input type="number" value={discMaxUses} onChange={e => setDiscMaxUses(e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
            <Button className="w-full bg-secondary text-primary" onClick={saveDiscount} disabled={savingDisc}>
              {savingDisc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
