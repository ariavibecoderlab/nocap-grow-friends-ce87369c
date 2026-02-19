import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Wallet, CreditCard, Package, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderStatusBadge } from "@/components/marketplace/OrderStatusBadge";

interface StoreData {
  id: string;
  store_name: string;
  slug: string;
  branch_id: string;
  primary_color: string;
  shipping_flat_rate: number;
  free_shipping_min: number | null;
  merchant_user_id: string;
}

interface WalletData {
  balance: number;
}

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getStoreItems, clearCart } = useCart();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"nocap_wallet" | "online">(user ? "nocap_wallet" : "online");
  const [processing, setProcessing] = useState(false);
  const [pin, setPin] = useState("");

  // Buyer info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const items = slug ? getStoreItems(slug) : [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const { data: storeData } = await supabase
        .from("marketplace_stores")
        .select("id, store_name, slug, branch_id, primary_color, shipping_flat_rate, free_shipping_min, merchant_user_id")
        .eq("slug", slug).eq("status", "live").single();

      if (!storeData) { navigate("/marketplace"); return; }
      setStore(storeData as StoreData);

      if (user) {
        // Pre-fill name/email
        const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).single();
        if (profile) {
          setName(profile.full_name ?? "");
          setPhone(profile.phone ?? "");
        }
        setEmail(user.email ?? "");

        // Fetch wallet balance
        const { data: walletData } = await supabase.from("wallets").select("balance").eq("user_id", user.id).eq("wallet_type", "member").single();
        if (walletData) setWallet(walletData as WalletData);
      }

      setLoading(false);
    };
    fetchData();
  }, [slug, user, navigate]);

  const shippingFee = store
    ? (store.free_shipping_min && subtotal >= store.free_shipping_min ? 0 : store.shipping_flat_rate)
    : 0;
  const total = subtotal + shippingFee;
  const needsPin = paymentMethod === "nocap_wallet" && total >= 100;

  const handleCheckout = async () => {
    if (!store || !slug || items.length === 0) return;
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (paymentMethod === "nocap_wallet" && !user) {
      toast({ title: "Please log in to pay with NoCap Wallet", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const body = {
        store_id: store.id,
        slug,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.price })),
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        buyer_phone: phone.trim(),
        shipping_address: address.trim(),
        notes: notes.trim() || null,
        payment_method: paymentMethod,
        pin: needsPin ? pin : undefined,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      };

      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      if (paymentMethod === "nocap_wallet") {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/process-marketplace-order`, { method: "POST", headers, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payment failed");
        clearCart(slug);
        navigate(`/marketplace/${slug}/order/${data.order_id}`);
      } else {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-marketplace-bill`, { method: "POST", headers, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create payment");
        clearCart(slug);
        if (data.payment_url) {
          window.location.href = data.payment_url;
        }
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!store || items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Package className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Your cart is empty</p>
        <Button variant="outline" onClick={() => navigate(`/marketplace/${slug}`)}>Back to Store</Button>
      </div>
    );
  }

  const pc = store.primary_color;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/marketplace/${slug}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-bold text-foreground font-display">Checkout</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Order Summary */}
        <Card>
          <CardContent className="p-4">
            <p className="font-semibold text-sm text-foreground mb-3">Order Summary</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  {item.image && (
                    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">RM {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <span className="text-green-600 font-medium">Free</span> : `RM ${shippingFee.toFixed(2)}`}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-foreground text-base">
                <span>Total</span><span>RM {total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm text-foreground">Delivery Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input placeholder="+60..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivery Address *</Label>
              <Textarea placeholder="Full address including postcode and city" value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-[80px] text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Order Notes (optional)</Label>
              <Input placeholder="Special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm text-foreground">Payment Method</p>
            {user && (
              <button
                onClick={() => setPaymentMethod("nocap_wallet")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${paymentMethod === "nocap_wallet" ? "border-primary" : "border-border"}`}
                style={paymentMethod === "nocap_wallet" ? { borderColor: pc } : {}}
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: pc + "22" }}>
                  <Wallet className="h-4 w-4" style={{ color: pc }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">NoCap Wallet</p>
                  <p className="text-xs text-muted-foreground">
                    Balance: RM {(wallet?.balance ?? 0).toFixed(2)}
                    {wallet && wallet.balance < total && <span className="text-destructive ml-1">(Insufficient)</span>}
                  </p>
                </div>
              </button>
            )}
            <button
              onClick={() => setPaymentMethod("online")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${paymentMethod === "online" ? "border-primary" : "border-border"}`}
              style={paymentMethod === "online" ? { borderColor: pc } : {}}
            >
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Online Payment</p>
                <p className="text-xs text-muted-foreground">FPX / Credit Card / Debit Card</p>
              </div>
            </button>

            {needsPin && (
              <div className="space-y-1 pt-1">
                <Label className="text-xs flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> PIN required (amount ≥ RM 100)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 font-bold text-base"
          onClick={handleCheckout}
          disabled={processing || (paymentMethod === "nocap_wallet" && wallet !== null && wallet.balance < total)}
          style={{ backgroundColor: pc, color: "#000" }}
        >
          {processing
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</>
            : `Pay RM ${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
