import { Package, Star, Truck, Users } from "lucide-react";

interface StoreTrustStripProps {
  productCount: number;
  avgRating?: number;
  freeShippingMin?: number | null;
  followerCount?: number;
}

export default function StoreTrustStrip({ productCount, avgRating, freeShippingMin, followerCount }: StoreTrustStripProps) {
  const items = [
    { icon: Package, label: `${productCount}+ Products` },
    ...(avgRating && avgRating > 0 ? [{ icon: Star, label: `${avgRating.toFixed(1)}★ Rating` }] : []),
    ...(freeShippingMin ? [{ icon: Truck, label: `Free Ship >RM${freeShippingMin}` }] : []),
    ...(followerCount && followerCount > 0 ? [{ icon: Users, label: `${followerCount} Followers` }] : []),
  ];

  if (items.length === 0) return null;

  return (
    <div
      className="flex items-center justify-center gap-4 md:gap-8 py-3 px-4 overflow-x-auto scrollbar-none border-y"
      style={{
        borderColor: "var(--store-surface-border)",
        backgroundColor: "var(--store-surface)",
      }}
    >
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5 shrink-0">
          <item.icon className="h-3.5 w-3.5" style={{ color: "var(--store-accent)" }} />
          <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "var(--store-text-muted)" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
