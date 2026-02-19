import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    images: string[];
    status: string;
    is_featured: boolean;
    description?: string | null;
  };
  storeId: string;
  slug: string;
  primaryColor: string;
  theme: "classic" | "bold" | "minimal";
  onClick?: () => void;
}

export function ProductCard({ product, storeId, slug, primaryColor, theme, onClick }: ProductCardProps) {
  const { addItem, getStoreItems } = useCart();
  const { toast } = useToast();
  const cartItems = getStoreItems(slug);
  const cartItem = cartItems.find((i) => i.product_id === product.id);
  const isOutOfStock = product.status === "out_of_stock" || product.stock_quantity === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      product_id: product.id,
      store_id: storeId,
      slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0] ?? "",
      stock_quantity: product.stock_quantity,
    });
    toast({ title: "Added to cart", description: product.name });
  };

  if (theme === "minimal") {
    return (
      <div
        className="flex items-center gap-4 py-4 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded-lg transition-colors"
        onClick={onClick}
      >
        <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{product.name}</p>
          {product.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="font-bold text-foreground">RM {Number(product.price).toFixed(2)}</p>
          {!isOutOfStock ? (
            <Button
              size="sm"
              className="h-7 text-xs"
              style={{ backgroundColor: primaryColor, color: "#000" }}
              onClick={handleAddToCart}
            >
              {cartItem ? `In cart (${cartItem.quantity})` : "Add"}
            </Button>
          ) : (
            <Badge variant="outline" className="text-[10px]">Sold Out</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer group hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className={`relative overflow-hidden ${theme === "bold" ? "h-40" : "h-36"} bg-muted`}>
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className={`h-10 w-10 text-muted-foreground/40`} />
          </div>
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 text-[9px]" style={{ backgroundColor: primaryColor, color: "#000" }}>
            Featured
          </Badge>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="outline" className="text-xs font-semibold">Sold Out</Badge>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
        {product.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2 gap-2">
          <p className="font-bold text-foreground">RM {Number(product.price).toFixed(2)}</p>
          {!isOutOfStock ? (
            <Button
              size="sm"
              className="h-7 px-2 text-[11px] gap-1"
              style={{ backgroundColor: primaryColor, color: "#000" }}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-3 w-3" />
              {cartItem ? cartItem.quantity : "Add"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
