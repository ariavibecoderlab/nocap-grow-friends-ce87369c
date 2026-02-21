import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquare, Loader2, Send } from "lucide-react";

interface ReviewRow {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  merchant_reply: string | null;
  replied_at: string | null;
  created_at: string;
  product_name?: string;
}

interface Props {
  storeId: string;
}

export default function MerchantReviews({ storeId }: Props) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [storeId]);

  const fetchReviews = async () => {
    setLoading(true);
    // Get all products for this store, then reviews for those products
    const { data: products } = await supabase
      .from("marketplace_products")
      .select("id, name")
      .eq("store_id", storeId);

    if (!products || products.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const productIds = products.map(p => p.id);
    const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

    const { data: revData } = await supabase
      .from("marketplace_reviews")
      .select("id, product_id, rating, comment, merchant_reply, replied_at, created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    const mapped = (revData || []).map(r => ({
      ...r,
      product_name: productMap[r.product_id] || "Unknown Product",
    })) as ReviewRow[];

    setReviews(mapped);
    setLoading(false);
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("marketplace_reviews")
      .update({
        merchant_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply posted" });
      setReviews(prev =>
        prev.map(r =>
          r.id === reviewId
            ? { ...r, merchant_reply: replyText.trim(), replied_at: new Date().toISOString() }
            : r
        )
      );
      setReplyingId(null);
      setReplyText("");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-col items-center py-8 text-white/40">
          <Star className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
      {reviews.map(r => (
        <Card key={r.id} className="border-white/10 bg-white/5">
          <CardContent className="p-3 space-y-2">
            {/* Review header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white truncate">{r.product_name}</p>
              <p className="text-[10px] text-white/30 shrink-0">
                {new Date(r.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-secondary text-secondary" : "text-white/20"}`} />
              ))}
            </div>

            {/* Comment */}
            {r.comment && <p className="text-xs text-white/60">{r.comment}</p>}

            {/* Existing reply */}
            {r.merchant_reply && (
              <div className="ml-3 pl-3 border-l-2 border-secondary/30">
                <p className="text-[10px] text-secondary font-medium mb-0.5">Your Reply</p>
                <p className="text-xs text-white/60">{r.merchant_reply}</p>
                <p className="text-[10px] text-white/20 mt-0.5">
                  {r.replied_at && new Date(r.replied_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                </p>
              </div>
            )}

            {/* Reply form */}
            {!r.merchant_reply && replyingId !== r.id && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-white/40 hover:text-white h-7 px-2"
                onClick={() => { setReplyingId(r.id); setReplyText(""); }}
              >
                <MessageSquare className="h-3 w-3 mr-1" /> Reply
              </Button>
            )}

            {replyingId === r.id && (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-white/40 h-7"
                    onClick={() => { setReplyingId(null); setReplyText(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-secondary text-primary text-xs h-7"
                    disabled={!replyText.trim() || saving}
                    onClick={() => submitReply(r.id)}
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Post Reply</>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
