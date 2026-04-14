import { Package, Star, Truck, Users, ShieldCheck } from "lucide-react";

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
    { icon: ShieldCheck, label: "Verified Store" },
  ];

  return (
    <div
      className="flex items-center justify-center gap-3 md:gap-6 py-3.5 px-4 overflow-x-auto scrollbar-none"
      style={{
        borderTop: "1px solid var(--store-surface-border)",
        borderBottom: "1px solid var(--store-surface-border)",
        backgroundColor: "var(--store-surface)",
      }}
    >
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center justify-center h-6 w-6 rounded-full"
            style={{ backgroundColor: "var(--store-primary)", opacity: 0.15 }}
          />
          <item.icon
            className="h-3.5 w-3.5 absolute"
            style={{ color: "var(--store-accent)", marginLeft: "0.3125rem" }}
          />
          <span className="text-[11px] font-medium whitespace-nowrap ml-1" style={{ color: "var(--store-text-muted)" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
