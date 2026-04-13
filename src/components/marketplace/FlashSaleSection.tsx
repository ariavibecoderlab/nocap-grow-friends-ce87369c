import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface FlashSaleItem {
  id: string;
  product_id: string;
  flash_price: number;
  original_price: number;
  ends_at: string;
  sold_quantity: number;
  max_quantity: number;
  product_name: string;
  product_image: string;
  store_slug: string;
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return <span className="font-mono text-xs font-bold">{timeLeft}</span>;
}

export default function FlashSaleSection() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const { data } = await supabase
        .from("marketplace_flash_sales")
        .select(`
          id, product_id, flash_price, original_price, ends_at, sold_quantity, max_quantity,
          marketplace_products!inner(name, images, marketplace_stores!inner(slug))
        `)
        .eq("is_active", true)
        .gte("ends_at", new Date().toISOString())
        .lte("starts_at", new Date().toISOString())
        .limit(10);

      if (data) {
        const items: FlashSaleItem[] = data.map((d: any) => ({
          id: d.id,
          product_id: d.product_id,
          flash_price: d.flash_price,
          original_price: d.original_price,
          ends_at: d.ends_at,
          sold_quantity: d.sold_quantity,
          max_quantity: d.max_quantity,
          product_name: d.marketplace_products.name,
          product_image: (d.marketplace_products.images as string[])?.[0] || "",
          store_slug: d.marketplace_products.marketplace_stores.slug,
        }));
        setSales(items);
      }
      setLoading(false);
    };
    fetchSales();
  }, []);

  if (loading || sales.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
          <Zap className="h-3 w-3 fill-red-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Flash Sale</span>
        </div>
        <CountdownTimer endsAt={sales[0].ends_at} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {sales.map((sale) => {
          const discount = Math.round(((sale.original_price - sale.flash_price) / sale.original_price) * 100);
          const soldPct = sale.max_quantity > 0 ? Math.min((sale.sold_quantity / sale.max_quantity) * 100, 100) : 0;

          return (
            <div
              key={sale.id}
              onClick={() => navigate(`/store/${sale.store_slug}/product/${sale.product_id}`)}
              className="shrink-0 w-32 rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden cursor-pointer hover:bg-red-500/10 transition-colors"
            >
              <div className="aspect-square relative overflow-hidden">
                {sale.product_image ? (
                  <img
                    src={getOptimizedImageUrl(sale.product_image, 256, 256)}
                    alt={sale.product_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5" />
                )}
                <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  -{discount}%
                </div>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-white truncate">{sale.product_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-bold text-red-400">RM {sale.flash_price.toFixed(2)}</span>
                  <span className="text-[10px] text-white/30 line-through">RM {sale.original_price.toFixed(2)}</span>
                </div>
                {sale.max_quantity > 0 && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
                        style={{ width: `${soldPct}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-white/30 mt-0.5">{sale.sold_quantity}/{sale.max_quantity} sold</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
