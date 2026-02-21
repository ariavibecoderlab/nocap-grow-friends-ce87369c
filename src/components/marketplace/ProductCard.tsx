import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Star, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  id: string;
  storeId: string;
  name: string;
  price: number;
  images: string[];
  stockQuantity: number;
  storeSlug: string;
  storeName?: string;
  rating?: number;
  compact?: boolean;
}

export default function ProductCard({ id, storeId, name, price, images, stockQuantity, storeSlug, storeName, rating, compact }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mainImage = images?.[0] || "";
  const wishlisted = isWishlisted(id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(id);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stockQuantity <= 0) return;
    addItem({ productId: id, storeId, name, price, image: mainImage, stock: stockQuantity });
    toast({ title: "Added to cart", description: name });
  };

  return (
    <Card
      className="border-white/10 bg-white/5 overflow-hidden cursor-pointer hover:bg-white/10 transition-all active:scale-[0.98]"
      onClick={() => navigate(`/store/${storeSlug}/product/${id}`)}
    >
      <div className={`${compact ? "aspect-[4/3]" : "aspect-square"} bg-white/5 relative overflow-hidden`}>
        {mainImage ? (
          <img src={mainImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <ShoppingCart className={compact ? "h-5 w-5" : "h-8 w-8"} />
          </div>
        )}
        {stockQuantity <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-white/80 bg-black/50 px-2 py-0.5 rounded-full">Out of Stock</span>
          </div>
        )}
        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          className="absolute top-1 right-1 rounded-full bg-black/30 p-1.5 hover:bg-black/50 transition-colors"
        >
          <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-white/70"}`} />
        </button>
        {/* Quick add button overlay */}
        {compact && stockQuantity > 0 && (
          <button
            onClick={handleAdd}
            className="absolute bottom-1 right-1 rounded-full bg-secondary/90 p-1.5 text-primary hover:bg-secondary transition-colors shadow-md"
          >
            <ShoppingCart className="h-3 w-3" />
          </button>
        )}
      </div>
      <CardContent className={compact ? "p-2" : "p-3"}>
        <p className={`font-medium text-white truncate ${compact ? "text-xs" : "text-sm"}`}>{name}</p>
        {storeName && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/store/${storeSlug}`); }}
            className="text-[10px] text-white/40 truncate mt-0.5 flex items-center gap-0.5 hover:text-secondary transition-colors"
          >
            <Store className="h-2.5 w-2.5 shrink-0" /> {storeName}
          </button>
        )}
        <div className={`flex items-center justify-between ${compact ? "mt-1" : "mt-1.5"}`}>
          <p className={`font-display font-bold text-secondary ${compact ? "text-sm" : "text-base"}`}>RM {price.toFixed(2)}</p>
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-0.5 text-secondary">
              <Star className="h-3 w-3 fill-secondary" />
              <span className="text-[10px] font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {!compact && (
          <button
            onClick={handleAdd}
            disabled={stockQuantity <= 0}
            className="w-full mt-2 bg-secondary/20 text-secondary hover:bg-secondary/30 text-xs h-8 rounded-md flex items-center justify-center gap-1 font-medium disabled:opacity-50 transition-colors"
          >
            <ShoppingCart className="h-3 w-3" /> Add to Cart
          </button>
        )}
      </CardContent>
    </Card>
  );
}
