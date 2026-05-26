import { ShieldCheck } from "lucide-react";

interface BuyerProtectionBadgeProps {
  disputeRate: number;
}

export default function BuyerProtectionBadge({
  disputeRate,
}: BuyerProtectionBadgeProps) {
  if (disputeRate >= 0.02) return null;

  return (
    <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/10 border-green-500/20 rounded-full px-2 py-0.5 text-[10px] border">
      <ShieldCheck className="h-3 w-3 shrink-0" />
      Buyer Protected
    </span>
  );
}
