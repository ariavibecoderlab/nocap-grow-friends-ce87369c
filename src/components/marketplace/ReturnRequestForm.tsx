import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  orderId: string;
  storeId: string;
  orderItemId?: string;
  totalAmount: number;
  onSubmitted?: () => void;
}

export default function ReturnRequestForm({ orderId, storeId, orderItemId, totalAmount, onSubmitted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);

    const { error } = await supabase.from("marketplace_return_requests" as any).insert({
      order_id: orderId,
      order_item_id: orderItemId || null,
      buyer_user_id: user.id,
      store_id: storeId,
      reason: reason.trim(),
      refund_amount: totalAmount,
    } as any);

    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Return request submitted", description: "The merchant will review your request." });
      setOpen(false);
      setReason("");
      onSubmitted?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Request Return/Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-primary border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-white">Return / Refund Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-xs text-white/50">
            Refund amount: <span className="text-secondary font-semibold">RM {totalAmount.toFixed(2)}</span>
          </p>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Reason for return</label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe why you'd like to return this order..."
              className="bg-white/5 border-white/10 text-white text-sm min-h-[80px]"
            />
          </div>
          <Button
            className="w-full bg-red-500 hover:bg-red-600 text-white"
            disabled={submitting || !reason.trim()}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
