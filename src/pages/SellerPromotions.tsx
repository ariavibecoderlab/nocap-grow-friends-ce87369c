import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Trash2, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Store {
  id: string;
  store_name: string;
}

interface DiscountCode {
  id: string;
  store_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface FlashSale {
  id: string;
  store_id: string;
  name: string;
  start_time: string;
  end_time: string;
  discount_percentage: number;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function flashSaleStatus(sale: FlashSale): "Scheduled" | "Active" | "Ended" {
  const now = Date.now();
  const start = new Date(sale.start_time).getTime();
  const end = new Date(sale.end_time).getTime();
  if (now < start) return "Scheduled";
  if (now > end) return "Ended";
  return "Active";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiscountCodeCard({
  code,
  onToggle,
  onDelete,
}: {
  code: DiscountCode;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const isExpired = code.expires_at
    ? new Date(code.expires_at) < new Date()
    : false;
  const active = code.is_active && !isExpired;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm bg-white/10 text-secondary px-2 py-0.5 rounded">
              {code.code}
            </span>
            <span className="text-xs text-white/60">
              {code.discount_type === "percentage"
                ? `${code.discount_value}% off`
                : `RM ${Number(code.discount_value).toFixed(2)} off`}
            </span>
          </div>
          {code.min_order_amount != null && (
            <p className="text-xs text-white/40">
              Min order: RM {Number(code.min_order_amount).toFixed(2)}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40">
              {code.used_count} / {code.max_uses ?? "∞"} uses
            </span>
            {code.expires_at && (
              <Badge
                variant="outline"
                className={
                  isExpired
                    ? "border-destructive text-destructive text-[10px] px-1.5 py-0"
                    : "border-emerald-500 text-emerald-400 text-[10px] px-1.5 py-0"
                }
              >
                {isExpired
                  ? "Expired"
                  : `Expires ${formatDateTime(code.expires_at)}`}
              </Badge>
            )}
            {!code.expires_at && (
              <Badge
                variant="outline"
                className={
                  active
                    ? "border-emerald-500 text-emerald-400 text-[10px] px-1.5 py-0"
                    : "border-white/20 text-white/40 text-[10px] px-1.5 py-0"
                }
              >
                {active ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={code.is_active}
            onCheckedChange={(v) => onToggle(code.id, v)}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(code.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FlashSaleCard({
  sale,
  onDelete,
}: {
  sale: FlashSale;
  onDelete: (id: string) => void;
}) {
  const status = flashSaleStatus(sale);

  const statusClasses: Record<string, string> = {
    Scheduled: "border-amber-500 text-amber-400",
    Active: "border-emerald-500 text-emerald-400",
    Ended: "border-white/20 text-white/40",
  };

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">
              {sale.name}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${statusClasses[status]}`}
            >
              {status}
            </Badge>
          </div>
          <p className="text-xs text-secondary font-medium">
            {sale.discount_percentage}% off
          </p>
          <p className="text-xs text-white/40">
            {formatDateTime(sale.start_time)} — {formatDateTime(sale.end_time)}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(sale.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SellerPromotions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Stores
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(true);

  // Data
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  // Sheet: discount code form
  const [showCodeSheet, setShowCodeSheet] = useState(false);
  const [codeForm, setCodeForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_order_amount: "",
    max_uses: "",
    expires_at: "",
  });
  const [savingCode, setSavingCode] = useState(false);

  // Sheet: flash sale form
  const [showSaleSheet, setShowSaleSheet] = useState(false);
  const [saleForm, setSaleForm] = useState({
    name: "",
    discount_percentage: "",
    start_time: "",
    end_time: "",
  });
  const [savingSale, setSavingSale] = useState(false);

  // Deleting state
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [deletingSale, setDeletingSale] = useState<string | null>(null);

  // ─── Load stores ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    (async () => {
      setLoadingStores(true);
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, store_name")
        .eq("merchant_user_id", user.id)
        .order("store_name", { ascending: true });
      if (data && data.length > 0) {
        setStores(data as Store[]);
        setSelectedStoreId(data[0].id);
      }
      setLoadingStores(false);
    })();
  }, [user, authLoading, navigate]);

  // ─── Load discount codes ───────────────────────────────────────────────────

  const loadDiscountCodes = useCallback(async (storeId: string) => {
    setLoadingCodes(true);
    const { data } = await supabase
      .from("marketplace_discount_codes")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setDiscountCodes((data ?? []) as DiscountCode[]);
    setLoadingCodes(false);
  }, []);

  // ─── Load flash sales ──────────────────────────────────────────────────────

  const loadFlashSales = useCallback(async (storeId: string) => {
    setLoadingSales(true);
    const { data } = await supabase
      .from("marketplace_flash_sales")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setFlashSales((data ?? []) as FlashSale[]);
    setLoadingSales(false);
  }, []);

  useEffect(() => {
    if (!selectedStoreId) return;
    loadDiscountCodes(selectedStoreId);
    loadFlashSales(selectedStoreId);
  }, [selectedStoreId, loadDiscountCodes, loadFlashSales]);

  // ─── Handlers: discount codes ──────────────────────────────────────────────

  const openCodeSheet = () => {
    setCodeForm({
      code: randomCode(),
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_uses: "",
      expires_at: "",
    });
    setShowCodeSheet(true);
  };

  const saveDiscountCode = async () => {
    if (!selectedStoreId || !codeForm.code.trim() || !codeForm.discount_value)
      return;
    setSavingCode(true);

    const payload = {
      store_id: selectedStoreId,
      code: codeForm.code.trim().toUpperCase(),
      discount_type: codeForm.discount_type,
      discount_value: Number(codeForm.discount_value),
      min_order_amount: codeForm.min_order_amount
        ? Number(codeForm.min_order_amount)
        : null,
      max_uses: codeForm.max_uses ? Number(codeForm.max_uses) : null,
      expires_at: codeForm.expires_at
        ? new Date(codeForm.expires_at).toISOString()
        : null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("marketplace_discount_codes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDiscountCodes((prev) => [data as DiscountCode, ...prev]);
      setShowCodeSheet(false);
      toast({ title: "Discount code created" });
    }
    setSavingCode(false);
  };

  const toggleCodeActive = async (id: string, val: boolean) => {
    const { error } = await supabase
      .from("marketplace_discount_codes")
      .update({ is_active: val })
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setDiscountCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: val } : c))
    );
  };

  const deleteDiscountCode = async (id: string) => {
    setDeletingCode(id);
    const { error } = await supabase
      .from("marketplace_discount_codes")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDiscountCodes((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Code deleted" });
    }
    setDeletingCode(null);
  };

  // ─── Handlers: flash sales ─────────────────────────────────────────────────

  const openSaleSheet = () => {
    setSaleForm({
      name: "",
      discount_percentage: "",
      start_time: "",
      end_time: "",
    });
    setShowSaleSheet(true);
  };

  const saveFlashSale = async () => {
    if (
      !selectedStoreId ||
      !saleForm.name.trim() ||
      !saleForm.discount_percentage ||
      !saleForm.start_time ||
      !saleForm.end_time
    )
      return;
    setSavingSale(true);

    const pct = Number(saleForm.discount_percentage);
    if (pct < 1 || pct > 90) {
      toast({
        title: "Discount must be between 1% and 90%",
        variant: "destructive",
      });
      setSavingSale(false);
      return;
    }
    if (new Date(saleForm.start_time) >= new Date(saleForm.end_time)) {
      toast({
        title: "End time must be after start time",
        variant: "destructive",
      });
      setSavingSale(false);
      return;
    }

    const payload = {
      store_id: selectedStoreId,
      name: saleForm.name.trim(),
      discount_percentage: pct,
      start_time: new Date(saleForm.start_time).toISOString(),
      end_time: new Date(saleForm.end_time).toISOString(),
      status: "scheduled",
    };

    const { data, error } = await supabase
      .from("marketplace_flash_sales")
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFlashSales((prev) => [data as FlashSale, ...prev]);
      setShowSaleSheet(false);
      toast({ title: "Flash sale created" });
    }
    setSavingSale(false);
  };

  const deleteFlashSale = async (id: string) => {
    setDeletingSale(id);
    const { error } = await supabase
      .from("marketplace_flash_sales")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFlashSales((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Flash sale deleted" });
    }
    setDeletingSale(null);
  };

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (authLoading || loadingStores) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg font-bold text-white flex-1">
            Promotions
          </h1>

          {/* Store selector */}
          {stores.length > 1 && (
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-40 h-8 text-xs border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent className="bg-background border-white/10 text-white">
                {stores.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-white focus:bg-white/10 focus:text-white"
                  >
                    {s.store_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {stores.length === 1 && (
            <span className="text-xs text-white/40 truncate max-w-[120px]">
              {stores[0].store_name}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-4">
        {stores.length === 0 ? (
          <Card className="border-white/10 bg-white/5 mt-8">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Tag className="h-10 w-10 text-white/20 mb-3" />
              <p className="font-display text-base font-semibold text-white">
                No store found
              </p>
              <p className="text-xs text-white/40 mt-1 max-w-xs">
                Create a store from the merchant dashboard first.
              </p>
              <Button
                className="mt-4 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                onClick={() => navigate("/merchant")}
              >
                Go to Merchant Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="codes">
            <TabsList className="w-full bg-white/5 border border-white/10 mb-4">
              <TabsTrigger
                value="codes"
                className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/60"
              >
                <Tag className="h-3.5 w-3.5 mr-1.5" />
                Discount Codes
              </TabsTrigger>
              <TabsTrigger
                value="flash"
                className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/60"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Flash Sales
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Discount Codes ───────────────────────────────────── */}
            <TabsContent value="codes" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  {discountCodes.length} code
                  {discountCodes.length !== 1 ? "s" : ""}
                </p>
                <Button
                  size="sm"
                  className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                  onClick={openCodeSheet}
                >
                  <Plus className="h-3.5 w-3.5" /> Create Code
                </Button>
              </div>

              {loadingCodes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                </div>
              ) : discountCodes.length === 0 ? (
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="flex flex-col items-center py-10 text-center">
                    <Tag className="h-8 w-8 text-white/20 mb-2" />
                    <p className="text-sm text-white/40">
                      No discount codes yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                discountCodes.map((code) => (
                  <div
                    key={code.id}
                    className={
                      deletingCode === code.id
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }
                  >
                    <DiscountCodeCard
                      code={code}
                      onToggle={toggleCodeActive}
                      onDelete={deleteDiscountCode}
                    />
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Tab 2: Flash Sales ─────────────────────────────────────── */}
            <TabsContent value="flash" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">
                  {flashSales.length} sale{flashSales.length !== 1 ? "s" : ""}
                </p>
                <Button
                  size="sm"
                  className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                  onClick={openSaleSheet}
                >
                  <Plus className="h-3.5 w-3.5" /> Create Sale
                </Button>
              </div>

              {loadingSales ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                </div>
              ) : flashSales.length === 0 ? (
                <Card className="border-white/10 bg-white/5">
                  <CardContent className="flex flex-col items-center py-10 text-center">
                    <Zap className="h-8 w-8 text-white/20 mb-2" />
                    <p className="text-sm text-white/40">No flash sales yet</p>
                  </CardContent>
                </Card>
              ) : (
                flashSales.map((sale) => (
                  <div
                    key={sale.id}
                    className={
                      deletingSale === sale.id
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }
                  >
                    <FlashSaleCard sale={sale} onDelete={deleteFlashSale} />
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* ── Sheet: Create Discount Code ──────────────────────────────────────── */}
      <Sheet open={showCodeSheet} onOpenChange={setShowCodeSheet}>
        <SheetContent
          side="right"
          className="w-full max-w-sm bg-background border-l border-white/10 text-white overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-white">
              New Discount Code
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={codeForm.code}
                  onChange={(e) =>
                    setCodeForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/30 font-mono uppercase"
                  placeholder="e.g. SAVE20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() =>
                    setCodeForm((f) => ({ ...f, code: randomCode() }))
                  }
                >
                  Random
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Discount Type *</Label>
              <Select
                value={codeForm.discount_type}
                onValueChange={(v) =>
                  setCodeForm((f) => ({
                    ...f,
                    discount_type: v as "percentage" | "fixed",
                  }))
                }
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-white/10 text-white">
                  <SelectItem
                    value="percentage"
                    className="focus:bg-white/10 focus:text-white"
                  >
                    Percentage (%)
                  </SelectItem>
                  <SelectItem
                    value="fixed"
                    className="focus:bg-white/10 focus:text-white"
                  >
                    Fixed Amount (RM)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Discount Value *{" "}
                <span className="text-white/30">
                  ({codeForm.discount_type === "percentage" ? "%" : "RM"})
                </span>
              </Label>
              <Input
                type="number"
                min={0}
                value={codeForm.discount_value}
                onChange={(e) =>
                  setCodeForm((f) => ({ ...f, discount_value: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder={
                  codeForm.discount_type === "percentage"
                    ? "e.g. 15"
                    : "e.g. 5.00"
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Min Order Amount (RM) — optional
              </Label>
              <Input
                type="number"
                min={0}
                value={codeForm.min_order_amount}
                onChange={(e) =>
                  setCodeForm((f) => ({
                    ...f,
                    min_order_amount: e.target.value,
                  }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="e.g. 50.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Max Uses — optional
              </Label>
              <Input
                type="number"
                min={1}
                value={codeForm.max_uses}
                onChange={(e) =>
                  setCodeForm((f) => ({ ...f, max_uses: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="e.g. 100 (leave blank for unlimited)"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Expires At — optional
              </Label>
              <Input
                type="date"
                value={codeForm.expires_at}
                onChange={(e) =>
                  setCodeForm((f) => ({ ...f, expires_at: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>

            <Button
              className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold mt-2"
              onClick={saveDiscountCode}
              disabled={
                savingCode || !codeForm.code.trim() || !codeForm.discount_value
              }
            >
              {savingCode ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Code
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Create Flash Sale ─────────────────────────────────────────── */}
      <Sheet open={showSaleSheet} onOpenChange={setShowSaleSheet}>
        <SheetContent
          side="right"
          className="w-full max-w-sm bg-background border-l border-white/10 text-white overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-white">
              New Flash Sale
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Sale Name *</Label>
              <Input
                value={saleForm.name}
                onChange={(e) =>
                  setSaleForm((f) => ({ ...f, name: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="e.g. Weekend Sale"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Discount Percentage * (1–90%)
              </Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={saleForm.discount_percentage}
                onChange={(e) =>
                  setSaleForm((f) => ({
                    ...f,
                    discount_percentage: e.target.value,
                  }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="e.g. 30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Start Time *</Label>
              <Input
                type="datetime-local"
                value={saleForm.start_time}
                onChange={(e) =>
                  setSaleForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">End Time *</Label>
              <Input
                type="datetime-local"
                value={saleForm.end_time}
                onChange={(e) =>
                  setSaleForm((f) => ({ ...f, end_time: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>

            <Button
              className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold mt-2"
              onClick={saveFlashSale}
              disabled={
                savingSale ||
                !saleForm.name.trim() ||
                !saleForm.discount_percentage ||
                !saleForm.start_time ||
                !saleForm.end_time
              }
            >
              {savingSale ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Sale
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
