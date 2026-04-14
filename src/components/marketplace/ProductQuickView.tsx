import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Star, Minus, Plus, ExternalLink } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface ProductQuickViewProps {
  productId: string | null;
  storeSlug: string;
  onClose: () => void;
}

interface ProductData {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  stock_quantity: number;
  sold_count: number;
}

export default function ProductQuickView({ productId, storeSlug, onClose }: ProductQuickViewProps) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [flashPrice, setFlashPrice] = useState<number | null>(null);
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!productId) return;
    setImgIdx(0);
    setQty(1);

    const load = async () => {
      const [{ data: prod }, { data: reviews }, { data: flash }] = await Promise.all([
        supabase
          .from("marketplace_products")
          .select("id, store_id, name, description, price, images, stock_quantity, sold_count")
          .eq("id", productId)
          .single(),
        supabase
          .from("marketplace_reviews")
          .select("rating")
          .eq("product_id", productId),
        supabase
          .from("marketplace_flash_sales")
          .select("flash_price")
          .eq("product_id", productId)
          .eq("is_active", true)
          .lte("starts_at", new Date().toISOString())
          .gte("ends_at", new Date().toISOString())
          .maybeSingle(),
      ]);

      if (prod) {
        setProduct({
          ...prod,
          images: (prod.images as string[]) || [],
        });
      }

      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setRating(avg);
        setReviewCount(reviews.length);
      } else {
        setRating(null);
        setReviewCount(0);
      }

      setFlashPrice(flash?.flash_price ?? null);
    };
    load();
  }, [productId]);

  if (!productId) return null;

  const images = product?.images || [];
  const displayPrice = flashPrice !== null && flashPrice < (product?.price ?? 0) ? flashPrice : product?.price ?? 0;
  const hasDiscount = flashPrice !== null && flashPrice < (product?.price ?? 0);
  const discountPct = hasDiscount ? Math.round((1 - flashPrice! / product!.price) * 100) : 0;

  const handleAdd = () => {
    if (!product || product.stock_quantity <= 0) return;
    for (let i = 0; i < qty; i++) {
      addItem({
        productId: product.id,
        storeId: product.store_id,
        name: product.name,
        price: displayPrice,
        image: images[0] || "",
        stock: product.stock_quantity,
      });
    }
    toast({ title: "Added to cart", description: `${qty}x ${product.name}` });
    onClose();
  };

  return (
    <Dialog open={!!productId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-primary border-white/10 gap-0">
        {product ? (
          <div className="flex flex-col md:flex-row">
            {/* Image gallery */}
            <div className="relative w-full md:w-1/2 aspect-square bg-white/5">
              {images.length > 0 ? (
                <img
                  src={getOptimizedImageUrl(images[imgIdx], 600, 600)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <ShoppingCart className="h-12 w-12" />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 backdrop-blur-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`h-2 rounded-full transition-all ${i === imgIdx ? "w-5 bg-secondary" : "w-2 bg-white/30"}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
                  -{discountPct}% OFF
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col w-full md:w-1/2 p-5 md:p-6 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white font-display">{product.name}</h2>
                {rating !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-secondary text-secondary" : "text-white/20"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-white/40">({reviewCount} reviews)</span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-secondary font-display">
                  RM {displayPrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-white/30 line-through">RM {product.price.toFixed(2)}</span>
                )}
              </div>

              {product.description && (
                <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{product.description}</p>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                {product.sold_count > 0 && <span>{product.sold_count} sold</span>}
                {product.sold_count > 0 && product.stock_quantity > 0 && <span>·</span>}
                {product.stock_quantity > 0 ? (
                  <span className="text-green-400/70">{product.stock_quantity} in stock</span>
                ) : (
                  <span className="text-red-400">Out of stock</span>
                )}
              </div>

              {/* Quantity */}
              {product.stock_quantity > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">Qty:</span>
                  <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="px-2.5 py-1.5 text-white/50 hover:bg-white/10 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 py-1.5 text-sm text-white font-medium min-w-[2rem] text-center">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                      className="px-2.5 py-1.5 text-white/50 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                <button
                  onClick={handleAdd}
                  disabled={product.stock_quantity <= 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary text-primary font-semibold text-sm py-3 rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </button>
                <button
                  onClick={() => toggle(product.id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    isWishlisted(product.id)
                      ? "border-red-500/50 bg-red-500/10 text-red-500"
                      : "border-white/10 text-white/50 hover:bg-white/5"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? "fill-red-500" : ""}`} />
                </button>
              </div>

              {/* View full details link */}
              <button
                onClick={() => { onClose(); navigate(`/store/${storeSlug}/product/${product.id}`); }}
                className="text-xs text-white/30 hover:text-secondary flex items-center justify-center gap-1 transition-colors"
              >
                View Full Details <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
