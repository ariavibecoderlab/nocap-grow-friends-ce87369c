import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
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
  rating?: number;
}

export default function ProductCard({ id, storeId, name, price, images, stockQuantity, storeSlug, rating }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mainImage = images?.[0] || "";

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
      <div className="aspect-square bg-white/5 relative overflow-hidden">
        {mainImage ? (
          <img src={mainImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
        {stockQuantity <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-white/80 bg-black/50 px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="font-display text-base font-bold text-secondary">RM {price.toFixed(2)}</p>
          {rating !== undefined && rating > 0 && (
            <div className="flex items-center gap-0.5 text-secondary">
              <Star className="h-3 w-3 fill-secondary" />
              <span className="text-[10px] font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <Button
          size="sm"
          className="w-full mt-2 bg-secondary/20 text-secondary hover:bg-secondary/30 text-xs h-8"
          onClick={handleAdd}
          disabled={stockQuantity <= 0}
        >
          <ShoppingCart className="h-3 w-3 mr-1" /> Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
