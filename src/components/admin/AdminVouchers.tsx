import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Ticket } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlatformVoucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface VoucherForm {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  max_discount: string;
  max_uses: string;
  valid_from: string;
  expires_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return (
    "NOCAP" +
    Array.from(
      { length: 5 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("")
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

const AdminVouchers = () => {
  const { toast } = useToast();

  const [vouchers, setVouchers] = useState<PlatformVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState<VoucherForm>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    max_uses: "",
    valid_from: new Date().toISOString().slice(0, 10),
    expires_at: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Failed to load vouchers",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setVouchers((data ?? []) as PlatformVoucher[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openSheet = () => {
    setForm({
      code: randomCode(),
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount: "",
      max_uses: "",
      valid_from: new Date().toISOString().slice(0, 10),
      expires_at: "",
    });
    setShowSheet(true);
  };

  const saveVoucher = async () => {
    if (!form.code.trim() || !form.discount_value) return;

    const discountVal = Number(form.discount_value);
    if (
      form.discount_type === "percentage" &&
      (discountVal < 1 || discountVal > 100)
    ) {
      toast({ title: "Percentage must be 1–100", variant: "destructive" });
      return;
    }
    if (discountVal <= 0) {
      toast({
        title: "Discount value must be positive",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: discountVal,
      min_order_amount: form.min_order_amount
        ? Number(form.min_order_amount)
        : 0,
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_from: new Date(form.valid_from).toISOString(),
      expires_at: form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null,
      is_active: true,
    };

    const { error } = await supabase.from("platform_vouchers").insert(payload);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await load();
      setShowSheet(false);
      toast({ title: "Voucher created" });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, val: boolean) => {
    setToggling(id);
    const { error } = await supabase
      .from("platform_vouchers")
      .update({ is_active: val })
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, is_active: val } : v)),
      );
    }
    setToggling(null);
  };

  const deleteVoucher = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase
      .from("platform_vouchers")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      toast({ title: "Voucher deleted" });
    }
    setDeleting(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Platform Vouchers</h2>
          <p className="text-sm text-white/40 mt-0.5">
            Create discount vouchers redeemable by any buyer at checkout.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
          onClick={openSheet}
        >
          <Plus className="h-4 w-4" /> New Voucher
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : vouchers.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Ticket className="h-10 w-10 text-white/20 mb-3" />
            <p className="text-base font-semibold text-white">
              No vouchers yet
            </p>
            <p className="text-xs text-white/40 mt-1">
              Create platform-wide discount vouchers for your buyers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vouchers.map((v) => {
            const expired = v.expires_at
              ? new Date(v.expires_at) < new Date()
              : false;
            const effective = v.is_active && !expired;
            const isDimmed = deleting === v.id || toggling === v.id;

            return (
              <Card
                key={v.id}
                className={`border-white/10 bg-white/5 transition-opacity ${isDimmed ? "opacity-50 pointer-events-none" : ""}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm bg-white/10 text-secondary px-2 py-0.5 rounded">
                        {v.code}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          effective
                            ? "border-emerald-500 text-emerald-400 text-[10px] px-1.5 py-0"
                            : "border-white/20 text-white/40 text-[10px] px-1.5 py-0"
                        }
                      >
                        {expired
                          ? "Expired"
                          : effective
                            ? "Active"
                            : "Inactive"}
                      </Badge>
                    </div>

                    {v.description && (
                      <p className="text-xs text-white/60">{v.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/40">
                      <span>
                        {v.discount_type === "percentage"
                          ? `${v.discount_value}% off`
                          : `RM ${Number(v.discount_value).toFixed(2)} off`}
                      </span>
                      {v.min_order_amount > 0 && (
                        <span>
                          Min: RM {Number(v.min_order_amount).toFixed(2)}
                        </span>
                      )}
                      {v.max_discount != null && (
                        <span>Cap: RM {Number(v.max_discount).toFixed(2)}</span>
                      )}
                      <span>
                        {v.used_count} / {v.max_uses ?? "∞"} uses
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/40">
                      <span>From: {fmt(v.valid_from)}</span>
                      {v.expires_at && (
                        <span>Expires: {fmt(v.expires_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={(val) => toggleActive(v.id, val)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteVoucher(v.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Sheet: Create Voucher ──────────────────────────────────────────── */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent
          side="right"
          className="w-full max-w-sm bg-background border-l border-white/10 text-white overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-white">
              New Platform Voucher
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Code *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/30 font-mono uppercase"
                  placeholder="e.g. NOCAP20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  onClick={() => setForm((f) => ({ ...f, code: randomCode() }))}
                >
                  Random
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Description — optional
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="e.g. Ramadan special"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Discount Type *</Label>
              <Select
                value={form.discount_type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    discount_type: v as "percentage" | "fixed",
                    max_discount: "",
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
                  ({form.discount_type === "percentage" ? "%" : "RM"})
                </span>
              </Label>
              <Input
                type="number"
                min={0}
                value={form.discount_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_value: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder={
                  form.discount_type === "percentage" ? "e.g. 20" : "e.g. 10.00"
                }
              />
            </div>

            {form.discount_type === "percentage" && (
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">
                  Max Discount (RM) — optional cap
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_discount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_discount: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  placeholder="e.g. 30.00"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Min Order Amount (RM) — optional
              </Label>
              <Input
                type="number"
                min={0}
                value={form.min_order_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_order_amount: e.target.value }))
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
                value={form.max_uses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_uses: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                placeholder="Leave blank for unlimited"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Valid From *</Label>
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_from: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Expires At — optional
              </Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expires_at: e.target.value }))
                }
                className="border-white/10 bg-white/5 text-white"
              />
            </div>

            <Button
              className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold mt-2"
              onClick={saveVoucher}
              disabled={saving || !form.code.trim() || !form.discount_value}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Voucher
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminVouchers;
