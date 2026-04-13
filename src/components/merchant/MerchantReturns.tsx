import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

interface ReturnRequest {
  id: string;
  order_id: string;
  buyer_user_id: string;
  reason: string;
  status: string;
  refund_amount: number;
  merchant_note: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
}

export default function MerchantReturns({ storeId }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("marketplace_return_requests" as any)
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }) as any;
    
    const list = (data || []) as ReturnRequest[];
    setRequests(list);

    // Fetch order numbers
    if (list.length > 0) {
      const orderIds = [...new Set(list.map(r => r.order_id))];
      const { data: orders } = await supabase
        .from("marketplace_orders")
        .select("id, order_number")
        .in("id", orderIds);
      if (orders) {
        const map: Record<string, string> = {};
        orders.forEach((o: any) => { map[o.id] = o.order_number; });
        setOrderNumbers(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [storeId]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    const update: any = {
      status,
      reviewed_at: new Date().toISOString(),
      merchant_note: activeNote[id]?.trim() || null,
    };

    await supabase.from("marketplace_return_requests" as any).update(update).eq("id", id) as any;

    toast({ title: `Return ${status}` });
    setProcessing(null);
    fetchRequests();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      approved: { label: "Approved", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      rejected: { label: "Rejected", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const cfg = map[status] || { label: status, className: "bg-white/10 text-white/60" };
    return <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.className}`}>{cfg.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-white/40">
        <RotateCcw className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">No return requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <Card key={req.id} className="border-white/10 bg-white/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">
                Order #{orderNumbers[req.order_id] || req.order_id.slice(0, 8)}
              </p>
              {statusBadge(req.status)}
            </div>
            <p className="text-xs text-white/50">
              {new Date(req.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="bg-white/5 rounded-md p-2">
              <p className="text-[10px] text-white/40 mb-0.5">Reason</p>
              <p className="text-xs text-white/70">{req.reason}</p>
            </div>
            <p className="text-xs text-white/50">
              Refund: <span className="text-secondary font-semibold">RM {req.refund_amount.toFixed(2)}</span>
            </p>

            {req.status === "pending" && (
              <div className="space-y-2 pt-1">
                <Textarea
                  placeholder="Add a note (optional)"
                  value={activeNote[req.id] || ""}
                  onChange={e => setActiveNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-xs min-h-[50px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    disabled={processing === req.id}
                    onClick={() => handleAction(req.id, "approved")}
                  >
                    {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    disabled={processing === req.id}
                    onClick={() => handleAction(req.id, "rejected")}
                  >
                    {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {req.merchant_note && req.status !== "pending" && (
              <div className="bg-white/5 rounded-md p-2">
                <p className="text-[10px] text-white/40 mb-0.5">Merchant Note</p>
                <p className="text-xs text-white/70">{req.merchant_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
