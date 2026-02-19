import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  product_id: string;
  store_id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock_quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  clearCart: (slug?: string) => void;
  getStoreItems: (slug: string) => CartItem[];
  totalItems: number;
  total: (slug?: string) => number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const CART_KEY = "nocap_marketplace_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === newItem.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === newItem.product_id
            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock_quantity) }
            : i
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  };

  const removeItem = (product_id: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== product_id));
  };

  const updateQuantity = (product_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(product_id);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === product_id
          ? { ...i, quantity: Math.min(quantity, i.stock_quantity) }
          : i
      )
    );
  };

  const clearCart = (slug?: string) => {
    if (slug) {
      setItems((prev) => prev.filter((i) => i.slug !== slug));
    } else {
      setItems([]);
    }
  };

  const getStoreItems = (slug: string) => items.filter((i) => i.slug === slug);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const total = (slug?: string) => {
    const storeItems = slug ? getStoreItems(slug) : items;
    return storeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, getStoreItems, totalItems, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
