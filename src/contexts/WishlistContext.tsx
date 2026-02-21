import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "nocap_wishlist";

interface WishlistContextType {
  wishlist: Set<string>;
  toggle: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlist: new Set(),
  toggle: () => {},
  isWishlisted: () => false,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [synced, setSynced] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWishlist(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  // Persist to localStorage whenever wishlist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...wishlist]));
  }, [wishlist]);

  // Sync with DB when user logs in
  useEffect(() => {
    if (!user || synced) return;

    const syncWithDb = async () => {
      // Fetch existing DB wishlist
      const { data } = await supabase
        .from("marketplace_wishlists")
        .select("product_id")
        .eq("user_id", user.id);

      const dbIds = new Set((data || []).map((r: any) => r.product_id));
      const localIds = new Set(wishlist);

      // Merge: union of local + DB
      const merged = new Set([...dbIds, ...localIds]);

      // Insert any local-only items into DB
      const toInsert = [...localIds].filter((id) => !dbIds.has(id));
      if (toInsert.length > 0) {
        await supabase.from("marketplace_wishlists").insert(
          toInsert.map((product_id) => ({ user_id: user.id, product_id }))
        );
      }

      setWishlist(merged);
      setSynced(true);
    };

    syncWithDb();
  }, [user, synced]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!user) setSynced(false);
  }, [user]);

  const toggle = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const next = new Set(prev);
        const removing = next.has(productId);
        if (removing) {
          next.delete(productId);
        } else {
          next.add(productId);
        }

        // DB sync if logged in
        if (user) {
          if (removing) {
            supabase
              .from("marketplace_wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", productId)
              .then();
          } else {
            supabase
              .from("marketplace_wishlists")
              .insert({ user_id: user.id, product_id: productId })
              .then();
          }
        }

        return next;
      });
    },
    [user]
  );

  const isWishlisted = useCallback(
    (productId: string) => wishlist.has(productId),
    [wishlist]
  );

  return (
    <WishlistContext.Provider value={{ wishlist, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
