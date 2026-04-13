import { useEffect, useState } from "react";
import { addRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import CartDrawer from "@/components/marketplace/CartDrawer";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, ShoppingCart, Star, Minus, Plus, Zap } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import ProductChat from "@/components/marketplace/ProductChat";
import VariantSelector, { type Variant } from "@/components/marketplace/VariantSelector";
import ProductShareButton from "@/components/marketplace/ProductShareButton";
import RelatedProducts from "@/components/marketplace/RelatedProducts";
import ProductQA from "@/components/marketplace/ProductQA";

interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  images: Json;
  stock_quantity: number;
  sku: string | null;
  weight_kg: number | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  review_images: Json;
  merchant_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

const ProductDetail = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [storeName, setStoreName] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const cartItem = items.find(i => i.productId === productId);

  useEffect(() => {
    if (!productId) return;
    addRecentlyViewed(productId);
    const fetch = async () => {
      const [prodRes, revRes] = await Promise.all([
        supabase.from("marketplace_products")
          .select("id, store_id, name, description, price, images, stock_quantity, sku, weight_kg, category_id")
          .eq("id", productId)
          .maybeSingle(),
        supabase.from("marketplace_reviews")
          .select("id, rating, comment, review_images, merchant_reply, replied_at, created_at")
          .eq("product_id", productId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      setProduct(prodRes.data as Product | null);
      setReviews((revRes.data as Review[]) || []);
      if (prodRes.data?.store_id) {
        const { data: storeData } = await supabase
          .from("marketplace_stores")
          .select("store_name")
          .eq("id", prodRes.data.store_id)
          .maybeSingle();
        if (storeData) setStoreName(storeData.store_name);
      }
      setLoading(false);
    };
    fetch();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pt-8 mx-auto max-w-md">
          <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-white/10 text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center py-20 text-white/40">
            <p className="font-medium">Product not found</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const images = (product.images as string[]) || [];
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const effectivePrice = product.price + (selectedVariant?.price_adjustment || 0);
  const effectiveStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const variantLabel = selectedVariant ? ` (${selectedVariant.variant_value})` : "";

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      storeId: product.store_id,
      name: product.name + variantLabel,
      price: effectivePrice,
      image: images[0] || "",
      stock: effectiveStock,
    });
    toast({ title: "Added to cart", description: `${qty}× ${product.name}${variantLabel}` });
  };

  const handleBuyNow = () => {
    // Add to cart then navigate directly to checkout
    addItem({
      productId: product.id,
      storeId: product.store_id,
      name: product.name + variantLabel,
      price: effectivePrice,
      image: images[0] || "",
      stock: effectiveStock,
    });
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-primary pb-40">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-8">
        <button onClick={() => navigate(-1)} className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60 backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <ProductShareButton productName={product.name} />
          <CartDrawer />
        </div>
      </div>

      {/* Image Gallery */}
      <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
        {images.length > 0 ? (
          <img src={getOptimizedImageUrl(images[selectedImage], 800, 600)} alt={product.name} className="w-full h-full object-contain bg-white/5" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <ShoppingCart className="h-16 w-16" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                i === selectedImage ? "border-secondary" : "border-white/10"
              }`}
            >
              <img src={getOptimizedImageUrl(img, 120, 120)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-md px-4 mt-4">
        <h1 className="font-display text-2xl font-bold text-white">{product.name}</h1>

        <div className="flex items-center gap-3 mt-2">
          <p className="font-display text-2xl font-bold text-secondary">RM {effectivePrice.toFixed(2)}</p>
          {selectedVariant && selectedVariant.price_adjustment !== 0 && (
            <p className="text-sm text-white/30 line-through">RM {product.price.toFixed(2)}</p>
          )}
          {avgRating > 0 && (
            <div className="flex items-center gap-1 text-secondary">
              <Star className="h-4 w-4 fill-secondary" />
              <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-white/40">({reviews.length})</span>
            </div>
          )}
        </div>

        <p className="text-xs text-white/40 mt-1">
          {effectiveStock > 0 ? `${effectiveStock} in stock` : "Out of stock"}
        </p>

        {/* Variant Selector */}
        <VariantSelector productId={product.id} onVariantSelect={setSelectedVariant} />

        {product.description && (
          <p className="text-sm text-white/60 mt-4 leading-relaxed">{product.description}</p>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-sm font-semibold text-white mb-3">Reviews</h3>
            <div className="space-y-2">
              {reviews.map(r => {
                const reviewImgs = (r.review_images as string[]) || [];
                return (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-secondary text-secondary" : "text-white/20"}`} />
                      ))}
                    </div>
                    {r.comment && <p className="text-xs text-white/60">{r.comment}</p>}
                    {/* Review Photos */}
                    {reviewImgs.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto">
                        {reviewImgs.map((img, i) => (
                          <img
                            key={i}
                            src={getOptimizedImageUrl(img, 200, 200)}
                            alt="Review"
                            className="h-16 w-16 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        ))}
                      </div>
                    )}
                    {r.merchant_reply && (
                      <div className="ml-3 pl-3 border-l-2 border-secondary/30">
                        <p className="text-[10px] text-secondary font-medium mb-0.5">Merchant Reply</p>
                        <p className="text-xs text-white/60">{r.merchant_reply}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Q&A */}
        <ProductQA productId={product.id} />

        {/* Related Products */}
        <RelatedProducts
          productId={product.id}
          storeId={product.store_id}
          categoryId={(product as any).category_id || null}
          storeSlug={slug || ""}
        />
      </div>

      {/* Fixed bottom: Buy Now + Add to Cart */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-primary border-t border-white/10 px-4 py-3">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-white/10 rounded-full px-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1.5 text-white/60 hover:text-white">
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-white w-6 text-center">{qty}</span>
            <button onClick={() => setQty(Math.min(effectiveStock, qty + 1))} className="p-1.5 text-white/60 hover:text-white">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            className="flex-1 border-secondary/30 text-secondary hover:bg-secondary/10 font-semibold"
            disabled={effectiveStock <= 0}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Cart
          </Button>
          <Button
            className="flex-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
            disabled={effectiveStock <= 0}
            onClick={handleBuyNow}
          >
            <Zap className="h-4 w-4 mr-1" />
            Buy Now · RM {(effectivePrice * qty).toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Chat with seller */}
      {product && productId && (
        <ProductChat
          storeId={product.store_id}
          productId={productId}
          productName={product.name}
          storeName={storeName}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
