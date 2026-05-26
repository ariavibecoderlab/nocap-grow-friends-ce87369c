interface SellerTierBadgeProps {
  tier: "bronze" | "silver" | "gold" | "platinum";
  size?: "sm" | "md";
}

const tierConfig = {
  bronze: {
    label: "Bronze",
    className: "text-amber-700 bg-amber-900/20 border-amber-700/30",
  },
  silver: {
    label: "Silver",
    className: "text-slate-300 bg-slate-700/30 border-slate-400/30",
  },
  gold: {
    label: "Gold ⭐",
    className: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
  platinum: {
    label: "Platinum 💎",
    className: "text-purple-300 bg-purple-500/10 border-purple-400/30",
  },
} as const;

const sizeConfig = {
  sm: "text-[10px] px-1.5 py-0.5 rounded-full border",
  md: "text-xs px-2 py-1 rounded-full border font-semibold",
} as const;

export default function SellerTierBadge({
  tier,
  size = "md",
}: SellerTierBadgeProps) {
  const { label, className } = tierConfig[tier];
  return (
    <span
      className={`inline-flex items-center ${sizeConfig[size]} ${className}`}
    >
      {label}
    </span>
  );
}
