import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Store,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const PLATFORM_FEE_PERCENT = 1.5;
const DEFAULT_COMMISSION_PERCENT = 5; // fallback if not loaded

const Cart = () => {
  const navigate = useNavigate();
  const { items, itemCount, total, updateQuantity, removeItem } = useCart();
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [storeCommission, setStoreCommission] = useState<Record<string, number>>({});

  // Group items by store
  const storeGroups = items.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = [];
    acc[item.storeId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Fetch store names + commission for all stores in cart
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.storeId))];
    if (ids.length === 0) return;
    supabase
      .from("marketplace_stores")
      .select("id, store_name, merchant_branches(commission_percent)")
      .in("id", ids)
      .then(({ data }) => {
        if (data) {
          const nameMap: Record<string, string> = {};
          const commMap: Record<string, number> = {};
          (data as any[]).forEach((s) => {
            nameMap[s.id] = s.store_name;
            const branch = Array.isArray(s.merchant_branches)
              ? s.merchant_branches[0]
              : s.merchant_branches;
            commMap[s.id] = Number(branch?.commission_percent ?? DEFAULT_COMMISSION_PERCENT);
          });
          setStoreNames(nameMap);
          setStoreCommission(commMap);
        }
      });
  }, [items.length]);

  return (
    <div className="min-h-screen bg-primary pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-primary/95 backdrop-blur-sm border-b border-white/10">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-1.5 hover:bg-white/10 transition-colors text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold text-white flex-1">
            Shopping Cart
          </h1>
          {itemCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-bold text-primary">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-md px-4 py-4">
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-white/40">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-40" />
            <p className="text-lg font-semibold text-white/60">
              Your cart is empty
            </p>
            <p className="text-sm mt-1">
              Add items from the marketplace to get started
            </p>
            <Button
              className="mt-6 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
              onClick={() => navigate("/marketplace")}
            >
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(storeGroups).map(([storeId, storeItems]) => {
              const storeSubtotal = storeItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );

              return (
                <div
                  key={storeId}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Store header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-white/50" />
                      <span className="text-sm font-semibold text-white/80">
                        {storeNames[storeId] || "Store"}
                      </span>
                    </div>
                    <span className="text-xs text-white/40">
                      Subtotal:{" "}
                      <span className="text-secondary font-semibold">
                        RM {storeSubtotal.toFixed(2)}
                      </span>
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-white/5">
                    {storeItems.map((item) => (
                      <div key={item.productId} className="flex gap-3 p-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-18 w-18 rounded-xl object-cover shrink-0"
                            style={{ height: 72, width: 72 }}
                          />
                        ) : (
                          <div
                            className="h-18 w-18 rounded-xl bg-white/10 shrink-0"
                            style={{ height: 72, width: 72 }}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-snug line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-sm font-bold text-secondary mt-1">
                            RM {item.price.toFixed(2)}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity stepper */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity - 1
                                  )
                                }
                                className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3 text-white" />
                              </button>
                              <span className="text-sm font-semibold text-white w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity + 1
                                  )
                                }
                                disabled={item.quantity >= item.stock}
                                className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3 text-white" />
                              </button>
                            </div>

                            {/* Remove */}
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky summary footer */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-primary/95 backdrop-blur-sm border-t border-white/10">
          <div className="mx-auto max-w-md px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">
                Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
              <span className="font-display text-xl font-bold text-secondary">
                RM {total.toFixed(2)}
              </span>
            </div>
            {/* Cashback preview — calculated per store using their commission rate */}
            {(() => {
              const totalCashback = items.reduce((sum, item) => {
                const commPct = storeCommission[item.storeId] ?? DEFAULT_COMMISSION_PERCENT;
                const pool = Math.round(item.price * item.quantity * commPct) / 100;
                const share = Math.floor((pool / 6) * 100) / 100;
                return sum + Math.max(0.01, share);
              }, 0);
              if (totalCashback < 0.01) return null;
              return (
                <div className="flex items-center justify-between rounded-xl bg-secondary/10 border border-secondary/20 px-3 py-2">
                  <span className="text-xs text-secondary font-medium">💰 You'll earn cashback</span>
                  <span className="text-sm font-bold text-secondary">RM {totalCashback.toFixed(2)}</span>
                </div>
              );
            })()}
            <Button
              className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold h-12 text-base"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Cart;
