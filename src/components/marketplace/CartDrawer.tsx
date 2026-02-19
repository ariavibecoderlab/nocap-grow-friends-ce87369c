import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  primaryColor: string;
  shippingFlatRate?: number;
  freeShippingMin?: number | null;
}

export function CartDrawer({ open, onClose, slug, primaryColor, shippingFlatRate = 0, freeShippingMin }: CartDrawerProps) {
  const { getStoreItems, updateQuantity, removeItem, total } = useCart();
  const navigate = useNavigate();
  const items = getStoreItems(slug);
  const subtotal = total(slug);
  const shippingFee = freeShippingMin && subtotal >= freeShippingMin ? 0 : shippingFlatRate;
  const grandTotal = subtotal + shippingFee;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-sm flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="h-5 w-5" style={{ color: primaryColor }} />
            Your Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">Your cart is empty</p>
            <Button variant="outline" size="sm" onClick={onClose}>Continue shopping</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex gap-3">
                  <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">RM {item.price.toFixed(2)} each</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock_quantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-semibold text-foreground ml-auto">
                        RM {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0
                    ? <span className="text-green-600 font-medium">Free</span>
                    : `RM ${shippingFee.toFixed(2)}`}
                </span>
              </div>
              {freeShippingMin && subtotal < freeShippingMin && (
                <p className="text-[10px] text-muted-foreground">
                  Add RM {(freeShippingMin - subtotal).toFixed(2)} more for free shipping
                </p>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-foreground">
                <span>Total</span>
                <span>RM {grandTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full mt-2 font-semibold"
                style={{ backgroundColor: primaryColor, color: "#000" }}
                onClick={() => { onClose(); navigate(`/marketplace/${slug}/checkout`); }}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
