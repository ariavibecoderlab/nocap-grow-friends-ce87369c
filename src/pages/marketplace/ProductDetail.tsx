import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartDrawer } from "@/components/marketplace/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShoppingCart, Package, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  images: string[];
  status: string;
  is_featured: boolean;
  description: string | null;
  sku: string | null;
  weight_kg: number | null;
}

interface StoreData {
  id: string;
  store_name: string;
  slug: string;
  primary_color: string;
  theme: "classic" | "bold" | "minimal";
  shipping_flat_rate: number;
  free_shipping_min: number | null;
}

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, getStoreItems, updateQuantity } = useCart();
  const [store, setStore] = useState<StoreData | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const cartItems = slug ? getStoreItems(slug) : [];
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartItem = product ? cartItems.find((i) => i.product_id === product.id) : null;

  useEffect(() => {
    if (!slug || !id) return;
    const fetchData = async () => {
      const [{ data: storeData }, { data: prodData }] = await Promise.all([
        supabase.from("marketplace_stores").select("id, store_name, slug, primary_color, theme, shipping_flat_rate, free_shipping_min").eq("slug", slug).single(),
        supabase.from("marketplace_products").select("*").eq("id", id).single(),
      ]);
      if (!storeData || !prodData) { navigate(`/marketplace/${slug}`); return; }
      setStore(storeData as StoreData);
      setProduct(prodData as Product);
      setLoading(false);
    };
    fetchData();
  }, [slug, id, navigate]);

  const handleAddToCart = () => {
    if (!product || !store || !slug) return;
    addItem({
      product_id: product.id,
      store_id: store.id,
      slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0] ?? "",
      stock_quantity: product.stock_quantity,
    });
    toast({ title: "Added to cart!", description: product.name });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-72 w-full" />
        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!store || !product) return null;
  const pc = store.primary_color;
  const isOutOfStock = product.status === "out_of_stock" || product.stock_quantity === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(`/marketplace/${slug}`)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm text-foreground truncate">{store.store_name}</span>
          <button onClick={() => setCartOpen(true)} className="relative text-muted-foreground hover:text-foreground">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: pc }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Image gallery */}
      <div className="relative bg-muted">
        <div className="max-w-xl mx-auto aspect-square overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>
        {product.images && product.images.length > 1 && (
          <>
            <button
              onClick={() => setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveImage((prev) => (prev + 1) % product.images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`rounded-full transition-all ${i === activeImage ? "w-5 h-1.5" : "w-1.5 h-1.5 bg-white/50"}`}
                  style={i === activeImage ? { backgroundColor: pc, height: "6px" } : {}}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {product.images && product.images.length > 1 && (
        <div className="max-w-xl mx-auto px-4 flex gap-2 py-2 overflow-x-auto no-scrollbar">
          {product.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === activeImage ? "opacity-100" : "border-transparent opacity-60"}`}
              style={i === activeImage ? { borderColor: pc } : {}}
            >
              <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product info */}
      <div className="max-w-xl mx-auto px-4 py-4 pb-28">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground font-display">{product.name}</h1>
          {product.is_featured && (
            <Badge className="shrink-0 text-[10px]" style={{ backgroundColor: pc + "33", color: pc, border: `1px solid ${pc}55` }}>
              Featured
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold mt-2" style={{ color: pc }}>RM {Number(product.price).toFixed(2)}</p>

        {isOutOfStock ? (
          <Badge variant="outline" className="mt-2 text-xs">Out of Stock</Badge>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">{product.stock_quantity} in stock</p>
        )}

        {product.description && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground mb-1">Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}

        {(product.sku || product.weight_kg) && (
          <div className="mt-4 space-y-1.5">
            {product.sku && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">SKU</span>
                <span className="text-foreground font-mono">{product.sku}</span>
              </div>
            )}
            {product.weight_kg && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Weight</span>
                <span className="text-foreground">{product.weight_kg} kg</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-10">
        <div className="max-w-xl mx-auto">
          {cartItem ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1">
                <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="p-1">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-semibold text-sm w-6 text-center">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} disabled={cartItem.quantity >= product.stock_quantity} className="p-1 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button className="flex-1 font-semibold" onClick={() => setCartOpen(true)} style={{ backgroundColor: pc, color: "#000" }}>
                View Cart ({cartCount})
              </Button>
            </div>
          ) : (
            <Button
              className="w-full font-semibold h-11"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={!isOutOfStock ? { backgroundColor: pc, color: "#000" } : {}}
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          )}
        </div>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} slug={store.slug} primaryColor={pc}
        shippingFlatRate={store.shipping_flat_rate} freeShippingMin={store.free_shipping_min} />
    </div>
  );
}
