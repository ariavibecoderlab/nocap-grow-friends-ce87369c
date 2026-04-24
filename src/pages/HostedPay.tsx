import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, XCircle, ShieldCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PaymentLinkInfo {
  id: string;
  amount: number;
  currency: string;
  status: "active" | "paid" | "expired" | "cancelled";
  expires_at: string;
  description: string | null;
  paid_at: string | null;
  merchant_name: string | null;
  order: { id: string; order_number: string; total_amount: number; payment_status: string; status: string } | null;
}

export default function HostedPay() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<PaymentLinkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkId) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    fetch(`https://${projectId}.supabase.co/functions/v1/payment-link-info?id=${linkId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setLink(data);
      })
      .catch((e) => setError(e?.message ?? "Failed to load payment link"))
      .finally(() => setLoading(false));
  }, [linkId]);

  const handlePay = () => {
    if (!user) {
      toast.info("Please sign in to complete payment");
      navigate(`/auth?redirect=/pay/${linkId}`);
      return;
    }
    // Route through the existing checkout / charge flow on the Nocap domain.
    if (link?.order) {
      navigate(`/order/${link.order.id}`);
    } else {
      toast.message("Direct payment-link checkout coming soon");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Secure Payment</CardTitle>
          <p className="text-sm text-muted-foreground">Powered by Nocap</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </>
          )}

          {error && (
            <div className="text-center space-y-2">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
            </div>
          )}

          {!loading && link && (
            <>
              {link.merchant_name && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pay to</p>
                  <p className="font-semibold">{link.merchant_name}</p>
                </div>
              )}

              {link.description && (
                <p className="text-sm text-center text-muted-foreground">{link.description}</p>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">Amount due</p>
                <p className="text-3xl font-bold tabular-nums">
                  {link.currency} {Number(link.amount).toFixed(2)}
                </p>
              </div>

              {link.order && (
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Order</span>
                  <span className="font-mono">{link.order.order_number}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Status</span>
                {link.status === "active" && <Badge variant="outline">Awaiting payment</Badge>}
                {link.status === "paid" && (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Paid</Badge>
                )}
                {link.status === "expired" && (
                  <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>
                )}
                {link.status === "cancelled" && (
                  <Badge variant="destructive">Cancelled</Badge>
                )}
              </div>

              {link.status === "active" && (
                <Button className="w-full" size="lg" onClick={handlePay}>
                  Pay now <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                Your PIN is entered on nocap.life — never in chat.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
