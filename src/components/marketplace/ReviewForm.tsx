import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, CheckCircle2, Camera, X } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 3 - photos.length); // max 3 photos
    setPhotos((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);

    // Upload photos
    let imageUrls: string[] = [];
    for (const file of photos) {
      try {
        const compressed = await compressImage(file);
        const path = `reviews/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("marketplace-assets")
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      } catch {
        // skip failed uploads
      }
    }

    const { error } = await supabase.from("marketplace_reviews").insert({
      order_id: orderId,
      product_id: productId,
      buyer_user_id: user.id,
      rating,
      comment: comment.trim() || null,
      review_images: imageUrls,
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

      {/* Photo Upload */}
      <div className="flex items-center gap-2">
        {photoPreviews.map((src, i) => (
          <div key={i} className="relative h-12 w-12">
            <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover border border-white/10" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5 text-white" />
            </button>
          </div>
        ))}
        {photos.length < 3 && (
          <button
            onClick={() => fileRef.current?.click()}
            className="h-12 w-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/30 hover:text-white/50 hover:border-white/30"
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
      </div>

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
