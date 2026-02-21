import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function CartDrawer() {
  const { items, itemCount, total, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Group by store
  const storeGroups = items.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = [];
    acc[item.storeId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
          <ShoppingCart className="h-5 w-5 text-white" />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="bg-primary border-white/10 text-white w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-white font-display">Shopping Cart</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-xs mt-1">Browse the marketplace to add items</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-1">
              {Object.entries(storeGroups).map(([, storeItems]) => (
                <div key={storeItems[0].storeId} className="space-y-2">
                  {storeItems.map(item => (
                    <div key={item.productId} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-white/10 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-secondary font-semibold mt-0.5">RM {item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 disabled:opacity-30">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeItem(item.productId)}
                            className="ml-auto text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total ({itemCount} items)</span>
                <span className="font-display text-xl font-bold text-secondary">RM {total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                onClick={() => { setOpen(false); navigate("/checkout"); }}
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
