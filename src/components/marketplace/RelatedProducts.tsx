import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { Json } from "@/integrations/supabase/types";

interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  price: number;
  images: Json;
  stock_quantity: number;
  category_id: string | null;
  sold_count: number;
}

interface RelatedProductsProps {
  productId: string;
  storeId: string;
  categoryId: string | null;
  storeSlug: string;
}

const RelatedProducts = ({ productId, storeId, categoryId, storeSlug }: RelatedProductsProps) => {
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    const load = async () => {
      // Fetch products from same store or same category, excluding current
      let query = supabase
        .from("marketplace_products")
        .select("id, store_id, name, price, images, stock_quantity, category_id, sold_count")
        .eq("status", "active")
        .neq("id", productId)
        .limit(8);

      if (categoryId) {
        query = query.or(`store_id.eq.${storeId},category_id.eq.${categoryId}`);
      } else {
        query = query.eq("store_id", storeId);
      }

      const { data } = await query;
      if (data) setProducts(data as ProductRow[]);
    };
    load();
  }, [productId, storeId, categoryId]);

  if (products.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-sm font-semibold text-white mb-3">You May Also Like</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {products.map((p) => (
          <div key={p.id} className="shrink-0 w-32">
            <ProductCard
              id={p.id}
              storeId={p.store_id}
              name={p.name}
              price={p.price}
              images={(p.images as string[]) || []}
              stockQuantity={p.stock_quantity}
              storeSlug={storeSlug}
              soldCount={p.sold_count}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
