import { useEffect, useState, useRef } from "react";
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
import { Store, Plus, Package, ShoppingCart, Tag, Loader2, Trash2, Edit, Image as ImageIcon } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

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
}

export default function MerchantMarketplace({ branches }: MerchantMarketplaceProps) {
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
  const [creating, setCreating] = useState(false);

  // Product dialog
  const [showProduct, setShowProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodStatus, setProdStatus] = useState("active");
  const [savingProd, setSavingProd] = useState(false);

  // Order update
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Discount dialog
  const [showDiscount, setShowDiscount] = useState(false);
  const [discCode, setDiscCode] = useState("");
  const [discType, setDiscType] = useState("percentage");
  const [discValue, setDiscValue] = useState("");
  const [discMinOrder, setDiscMinOrder] = useState("");
  const [discMaxUses, setDiscMaxUses] = useState("");
  const [savingDisc, setSavingDisc] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchStore();
  }, [user]);

  const fetchStore = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_stores")
      .select("*")
      .eq("merchant_user_id", user!.id)
      .maybeSingle();

    if (data) {
      setStore(data as unknown as StoreData);
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
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStore(data as unknown as StoreData);
      setShowCreate(false);
      toast({ title: "Store created!" });
    }
    setCreating(false);
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
  };

  const openEditProduct = (p: ProductRow) => {
    setEditProduct(p);
    setProdName(p.name);
    setProdPrice(String(p.price));
    setProdStock(String(p.stock_quantity));
    setProdStatus(p.status);
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
          <Button className="mt-4 bg-secondary text-primary hover:bg-secondary/90" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Store
          </Button>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="bg-primary border-white/10 text-white">
              <DialogHeader><DialogTitle className="font-display">Create Store</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-white/60 text-xs">Store Name</Label>
                  <Input value={createName} onChange={e => setCreateName(e.target.value)}
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
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        <TabsList className="w-full bg-white/5 border border-white/10">
          <TabsTrigger value="products" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary">Products</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary">Orders</TabsTrigger>
          <TabsTrigger value="discounts" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary">Discounts</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-3 mt-3">
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
          {orders.length === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex flex-col items-center py-8 text-white/40">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No orders yet</p>
              </CardContent>
            </Card>
          ) : (
            orders.map(o => (
              <Card key={o.id} className="border-white/10 bg-white/5">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">#{o.order_number}</p>
                      <p className="text-[10px] text-white/40">{o.buyer_name} · {new Date(o.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">RM {o.total_amount.toFixed(2)}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </div>
                  {/* Status Actions */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {o.status === "pending" && (
                      <Button size="sm" className="text-[10px] h-7 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        disabled={updatingOrder === o.id} onClick={() => updateOrderStatus(o.id, "confirmed")}>Confirm</Button>
                    )}
                    {o.status === "confirmed" && (
                      <Button size="sm" className="text-[10px] h-7 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                        disabled={updatingOrder === o.id} onClick={() => updateOrderStatus(o.id, "processing")}>Process</Button>
                    )}
                    {o.status === "processing" && (
                      <Button size="sm" className="text-[10px] h-7 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        disabled={updatingOrder === o.id}
                        onClick={() => {
                          const tn = prompt("Enter tracking number (optional):");
                          updateOrderStatus(o.id, "shipped", tn || undefined);
                        }}>Ship</Button>
                    )}
                    {o.status === "shipped" && (
                      <Button size="sm" className="text-[10px] h-7 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        disabled={updatingOrder === o.id} onClick={() => updateOrderStatus(o.id, "delivered")}>Delivered</Button>
                    )}
                    {!["delivered", "cancelled"].includes(o.status) && (
                      <Button size="sm" className="text-[10px] h-7 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        disabled={updatingOrder === o.id} onClick={() => updateOrderStatus(o.id, "cancelled")}>Cancel</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={showProduct} onOpenChange={setShowProduct}>
        <DialogContent className="bg-primary border-white/10 text-white">
          <DialogHeader><DialogTitle className="font-display">{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <SelectContent>
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
