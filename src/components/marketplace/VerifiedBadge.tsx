import { CheckCircle2 } from "lucide-react";

export default function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 font-medium">
      <CheckCircle2 className="h-3 w-3" />
      Verified Buyer
    </span>
  );
}
