import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Wallet,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── types ────────────────────────────────────────────────────────────────────

interface PaymentLinkInfo {
  id: string;
  amount: number;
  currency: string;
  status: "active" | "paid" | "expired" | "cancelled";
  expires_at: string;
  description: string | null;
  paid_at: string | null;
  merchant_name: string | null;
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    payment_status: string;
    status: string;
  } | null;
}

// ─── PIN pad ──────────────────────────────────────────────────────────────────

function PinPad({
  onSubmit,
  loading,
  error,
  onCancel,
}: {
  onSubmit: (pin: string) => void;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const PIN_LENGTH = 6;

  const press = (d: string) => {
    if (loading) return;
    setDigits((prev) => {
      const next = [...prev, d].slice(0, PIN_LENGTH);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => onSubmit(next.join("")), 80);
      }
      return next;
    });
  };

  const del = () => setDigits((prev) => prev.slice(0, -1));

  useEffect(() => {
    if (error) setDigits([]);
  }, [error]);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          Enter your NOcap PIN
        </p>
        <p className="text-xs text-muted-foreground">
          6-digit PIN to authorise payment
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 w-3 rounded-full border-2 transition-colors",
              i < digits.length
                ? "bg-primary border-primary"
                : "border-muted-foreground/40"
            )}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
          (k, i) => (
            <button
              key={i}
              disabled={loading || k === ""}
              onClick={() => (k === "⌫" ? del() : k !== "" && press(k))}
              className={cn(
                "h-14 rounded-xl text-lg font-semibold transition-colors",
                k === ""
                  ? "cursor-default"
                  : k === "⌫"
                  ? "bg-muted hover:bg-muted/80 text-muted-foreground"
                  : "bg-muted hover:bg-primary/10 active:scale-95"
              )}
            >
              {loading && i === 10 ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                k
              )}
            </button>
          )
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={onCancel}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
      </Button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function HostedPay() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<PaymentLinkInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [phase, setPhase] = useState<"info" | "pin" | "success" | "failed">(
    "info"
  );
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [paidTxId, setPaidTxId] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Load link info
  useEffect(() => {
    if (!linkId || hasFetched.current) return;
    hasFetched.current = true;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(
      `https://${projectId}.supabase.co/functions/v1/payment-link-info?id=${linkId}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFetchError(data.error);
        else setLink(data);
      })
      .catch((e) => setFetchError(e?.message ?? "Failed to load payment link"))
      .finally(() => setLoading(false));
  }, [linkId]);

  // Load wallet balance when user is signed in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .eq("wallet_type", "member")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWalletBalance(Number(data.balance));
      });
  }, [user]);

  const handlePayClick = () => {
    if (!user) {
      toast.info("Sign in to complete payment");
      navigate(`/auth?redirect=/pay/${linkId}`);
      return;
    }
    // Linked to an existing marketplace order — navigate directly
    if (link?.order) {
      navigate(`/order/${link.order.id}`);
      return;
    }
    setPhase("pin");
    setPinError(null);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!linkId) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "process-link-payment",
        {
          body: { link_id: linkId, pin },
        }
      );
      if (error || data?.error) {
        setPinError(data?.error ?? error?.message ?? "Payment failed");
        return;
      }
      setPaidTxId(data.transaction_id ?? null);
      // Update local state
      setLink((prev) =>
        prev
          ? { ...prev, status: "paid", paid_at: new Date().toISOString() }
          : prev
      );
      if (data.new_balance !== undefined) setWalletBalance(data.new_balance);
      setPhase("success");
      toast.success("Payment successful!");
    } catch (e) {
      setPinError("Something went wrong. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  const insufficientBalance =
    user &&
    walletBalance !== null &&
    link &&
    walletBalance < Number(link.amount);

  // ── Render ──

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {phase === "success" ? "Payment Complete" : "Secure Payment"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Powered by NOcap</p>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          {/* ── Loading ── */}
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4 mx-auto" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}

          {/* ── Fetch error ── */}
          {!loading && fetchError && (
            <div className="text-center space-y-3 py-4">
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-sm text-destructive">{fetchError}</p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Go home
              </Button>
            </div>
          )}

          {/* ── Link loaded ── */}
          {!loading && link && phase !== "pin" && (
            <>
              {/* Success state */}
              {phase === "success" && (
                <div className="text-center space-y-3 py-2">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
                  <div>
                    <p className="font-semibold text-lg">
                      {link.currency} {Number(link.amount).toFixed(2)} paid
                    </p>
                    {link.merchant_name && (
                      <p className="text-sm text-muted-foreground">
                        to {link.merchant_name}
                      </p>
                    )}
                  </div>
                  {paidTxId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Ref: {paidTxId.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                  {walletBalance !== null && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2 text-sm">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Remaining balance:
                      </span>
                      <span className="font-semibold">
                        RM {walletBalance.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => navigate("/dashboard")}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              )}

              {/* Normal info state */}
              {phase === "info" && (
                <>
                  {link.merchant_name && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Pay to
                      </p>
                      <p className="font-semibold text-lg">
                        {link.merchant_name}
                      </p>
                    </div>
                  )}

                  {link.description && (
                    <p className="text-sm text-center text-muted-foreground">
                      {link.description}
                    </p>
                  )}

                  {/* Amount */}
                  <div className="rounded-xl border bg-muted/30 p-5 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      Amount due
                    </p>
                    <p className="text-4xl font-bold tabular-nums">
                      {link.currency}{" "}
                      <span>{Number(link.amount).toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Wallet balance */}
                  {user && walletBalance !== null && (
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm border",
                        insufficientBalance
                          ? "bg-destructive/10 border-destructive/20"
                          : "bg-muted/40 border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="h-4 w-4" />
                        <span>Your NOcap balance</span>
                      </div>
                      <span
                        className={cn(
                          "font-semibold",
                          insufficientBalance
                            ? "text-destructive"
                            : "text-foreground"
                        )}
                      >
                        RM {walletBalance.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {insufficientBalance && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Insufficient balance. Top up RM{" "}
                      {(Number(link.amount) - walletBalance!).toFixed(2)} more
                      to pay.
                    </div>
                  )}

                  {/* Order reference */}
                  {link.order && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span>Order</span>
                      <span className="font-mono">
                        {link.order.order_number}
                      </span>
                    </div>
                  )}

                  {/* Status row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status</span>
                    {link.status === "active" && (
                      <Badge variant="outline" className="text-xs">
                        Awaiting payment
                      </Badge>
                    )}
                    {link.status === "paid" && (
                      <Badge className="gap-1 text-xs bg-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </Badge>
                    )}
                    {link.status === "expired" && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Expired
                      </Badge>
                    )}
                    {link.status === "cancelled" && (
                      <Badge variant="destructive" className="text-xs">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {/* Expiry */}
                  {link.status === "active" && (
                    <p className="text-xs text-center text-muted-foreground">
                      Expires{" "}
                      {new Date(link.expires_at).toLocaleString("en-MY", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}

                  {/* CTA */}
                  {link.status === "active" && (
                    <>
                      {!user ? (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handlePayClick}
                        >
                          Sign in to Pay
                        </Button>
                      ) : insufficientBalance ? (
                        <Button
                          className="w-full"
                          size="lg"
                          variant="outline"
                          onClick={() => navigate("/top-up")}
                        >
                          Top Up Wallet
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={handlePayClick}
                        >
                          Pay RM {Number(link.amount).toFixed(2)}
                        </Button>
                      )}
                    </>
                  )}

                  <p className="text-[10px] text-center text-muted-foreground">
                    Your PIN is entered on nocap.life — never shared.
                  </p>
                </>
              )}
            </>
          )}

          {/* ── PIN entry ── */}
          {phase === "pin" && (
            <PinPad
              onSubmit={handlePinSubmit}
              loading={pinLoading}
              error={pinError}
              onCancel={() => {
                setPhase("info");
                setPinError(null);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
