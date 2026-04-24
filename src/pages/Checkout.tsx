import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { invalidateOnDownlineImpact } from "@/lib/referralCache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, ShoppingCart, Tag, Loader2, CheckCircle2, Store } from "lucide-react";
import AddressSelector from "@/components/marketplace/AddressSelector";
import CourierSelector from "@/components/marketplace/CourierSelector";

const Checkout = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items, total, itemCount, clearStoreItems } = useCart();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; address: string | null } | null>(null);
  const [balance, setBalance] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [applyingCode, setApplyingCode] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState("");

  // Group items by store
  const storeGroups = items.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = [];
    acc[item.storeId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // For now, handle single-store checkout
  const storeIds = Object.keys(storeGroups);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [profileRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, address").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).eq("wallet_type", "member").maybeSingle(),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data);
        setName(profileRes.data.full_name || "");
        setPhone(profileRes.data.phone || "");
        setAddress(profileRes.data.address || "");
      }
      if (walletRes.data) setBalance(Number(walletRes.data.balance));
      setEmail(user.email || "");
    };
    fetch();
  }, [user]);

  const [storeShipping, setStoreShipping] = useState<Record<string, { flat: number; freeMin: number | null }>>({});
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (storeIds.length === 0) return;
    const fetchStores = async () => {
      const { data } = await supabase
        .from("marketplace_stores")
        .select("id, store_name, shipping_flat_rate, free_shipping_min")
        .in("id", storeIds);
      if (data) {
        const map: Record<string, { flat: number; freeMin: number | null }> = {};
        const names: Record<string, string> = {};
        data.forEach(s => {
          map[s.id] = { flat: s.shipping_flat_rate, freeMin: s.free_shipping_min };
          names[s.id] = s.store_name;
        });
        setStoreShipping(map);
        setStoreNames(names);
      }
    };
    fetchStores();
  }, [items.length]);

  const calcShipping = () => {
    let shipping = 0;
    Object.entries(storeGroups).forEach(([storeId, storeItems]) => {
      const storeTotal = storeItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const info = storeShipping[storeId];
      if (info) {
        if (info.freeMin && storeTotal >= info.freeMin) {
          // free shipping
        } else {
          shipping += info.flat;
        }
      }
    });
    return shipping;
  };

  const shipping = calcShipping();
  const grandTotal = total - discountAmount + shipping;

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingCode(true);
    // Look up discount code for any of the stores in cart
    const { data } = await supabase
      .from("marketplace_discount_codes")
      .select("*")
      .in("store_id", storeIds)
      .ilike("code", discountCode.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (!data) {
      toast({ title: "Invalid code", description: "This discount code is not valid.", variant: "destructive" });
      setApplyingCode(false);
      return;
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast({ title: "Code expired", variant: "destructive" });
      setApplyingCode(false);
      return;
    }

    // Check max uses
    if (data.max_uses && data.used_count >= data.max_uses) {
      toast({ title: "Code limit reached", variant: "destructive" });
      setApplyingCode(false);
      return;
    }

    // Check min order
    if (data.min_order_amount && total < Number(data.min_order_amount)) {
      toast({ title: "Minimum not met", description: `Minimum order: RM ${Number(data.min_order_amount).toFixed(2)}`, variant: "destructive" });
      setApplyingCode(false);
      return;
    }

    let discount = 0;
    if (data.discount_type === "percentage") {
      discount = total * (Number(data.discount_value) / 100);
    } else {
      discount = Number(data.discount_value);
    }
    discount = Math.min(discount, total);

    setDiscountAmount(discount);
    setAppliedCode(data.code);
    toast({ title: "Discount applied!", description: `RM ${discount.toFixed(2)} off` });
    setApplyingCode(false);
  };

  const handleCheckout = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !email.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (items.length === 0) return;
    if (balance < grandTotal) {
      toast({ title: "Insufficient balance", description: `You need RM ${grandTotal.toFixed(2)} but have RM ${balance.toFixed(2)}`, variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const res = await supabase.functions.invoke("process-marketplace-order", {
        body: {
          items: items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_phone: phone.trim(),
          shipping_address: address.trim(),
          notes: notes.trim() || null,
          discount_code: appliedCode || null,
          pin: pin || null,
        },
      });

      if (res.error) throw new Error(res.error.message);
      const data = res.data;

      if (data?.error) {
        toast({ title: "Order failed", description: data.error, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Clear cart for all stores that were checked out
      storeIds.forEach(id => clearStoreItems(id));
      // Marketplace order distributes cashback + 5-tier commissions — invalidate cached network snapshot.
      invalidateOnDownlineImpact(user?.id);
      toast({ title: "Order placed!", description: `Order #${data.order_number}` });
      navigate(`/order/${data.order_id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pt-8 mx-auto max-w-md">
          <button onClick={() => navigate("/marketplace")} className="rounded-full p-1 hover:bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center py-20 text-white/40">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">Your cart is empty</p>
            <Button className="mt-4 bg-secondary text-primary" onClick={() => navigate("/marketplace")}>
              Browse Marketplace
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Check if PIN needed (grandTotal >= threshold, default 100)
  const needsPin = grandTotal >= 100;

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-white/10 text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-white">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Order Summary - grouped by store */}
        {Object.entries(storeGroups).map(([storeId, storeItems]) => {
          const storeTotal = storeItems.reduce((s, i) => s + i.price * i.quantity, 0);
          const info = storeShipping[storeId];
          const storeName = storeNames[storeId] || "Store";
          return (
            <Card key={storeId} className="border-white/10 bg-white/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="h-3.5 w-3.5 text-secondary" />
                  <h3 className="font-display text-sm font-semibold text-white">{storeName}</h3>
                </div>
                {storeItems.map(item => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-white/70 truncate flex-1">{item.name} × {item.quantity}</span>
                    <span className="text-white font-medium ml-2">RM {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-1.5 flex justify-between text-xs">
                  <span className="text-white/40">Store subtotal</span>
                  <span className="text-white/60">RM {storeTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Totals Card */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Subtotal</span>
              <span className="text-white">RM {total.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Discount ({appliedCode})</span>
                <span className="text-green-400">-RM {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Shipping ({storeIds.length} store{storeIds.length > 1 ? "s" : ""})</span>
              <span className="text-white">{shipping === 0 ? "Free" : `RM ${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-secondary">RM {grandTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Discount Code */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="font-display text-sm font-semibold text-white mb-2">Discount Code</h3>
            {appliedCode ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">{appliedCode} applied</span>
                <button onClick={() => { setAppliedCode(null); setDiscountAmount(0); setDiscountCode(""); }}
                  className="text-xs text-white/40 hover:text-white ml-auto">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9 flex-1"
                />
                <Button size="sm" variant="outline" onClick={applyDiscount} disabled={applyingCode}
                  className="border-secondary/30 text-secondary hover:bg-secondary hover:text-primary h-9">
                  {applyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4 mr-1" />}
                  Apply
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-white">Delivery Details</h3>
              <AddressSelector onSelect={({ name: n, phone: p, address: a }) => { setName(n); setPhone(p); setAddress(a); }} />
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-white/60 text-xs">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Shipping Address</Label>
                <Textarea value={address} onChange={e => setAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-sm mt-1 min-h-[60px]" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-9 text-sm mt-1"
                  placeholder="Special instructions" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PIN if needed */}
        {needsPin && (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <h3 className="font-display text-sm font-semibold text-white mb-2">PIN Required</h3>
              <p className="text-xs text-white/40 mb-2">Enter your 6-digit PIN for transactions ≥ RM 100</p>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                className="bg-white/5 border-white/10 text-white h-9 text-sm tracking-[0.3em] text-center"
                placeholder="••••••"
              />
            </CardContent>
          </Card>
        )}

        {/* Wallet Balance */}
        <Card className="border-secondary/20 bg-secondary/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50">Wallet Balance</p>
              <p className="font-display text-lg font-bold text-secondary">RM {balance.toFixed(2)}</p>
            </div>
            {balance < grandTotal && (
              <Button size="sm" variant="outline" onClick={() => navigate("/top-up")}
                className="border-secondary/30 text-secondary text-xs">
                Top Up
              </Button>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold h-12 text-base"
          disabled={submitting || balance < grandTotal || (needsPin && pin.length < 6)}
          onClick={handleCheckout}
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          Pay RM {grandTotal.toFixed(2)}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Checkout;
