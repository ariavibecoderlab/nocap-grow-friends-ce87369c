import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

interface ReviewFormProps {
  orderId: string;
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({ orderId, productId, productName, onReviewSubmitted }: ReviewFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("marketplace_reviews").insert({
      order_id: orderId,
      product_id: productId,
      buyer_user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "You've already reviewed this product", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      setSubmitted(true);
      toast({ title: "Review submitted!" });
      onReviewSubmitted?.();
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <p className="text-xs text-green-400">Review submitted for {productName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/60 font-medium truncate">{productName}</p>

      {/* Star Rating */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHoveredRating(i + 1)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(i + 1)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                i < (hoveredRating || rating)
                  ? "fill-secondary text-secondary"
                  : "text-white/20"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-white/40 ml-1">
            {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : "Excellent"}
          </span>
        )}
      </div>

      {/* Comment */}
      <Textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
        className="bg-white/5 border-white/10 text-white text-xs h-16 resize-none"
        maxLength={500}
      />

      <Button
        size="sm"
        className="bg-secondary text-primary hover:bg-secondary/90 text-xs h-8"
        disabled={rating === 0 || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Submit Review
      </Button>
    </div>
  );
}
