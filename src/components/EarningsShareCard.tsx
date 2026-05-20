import { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import nocapIcon from "@/assets/nocap-icon-only.png";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: { full_name: string; referral_code: string } | null;
  thisMonthCommission: number;
  allTimeCommission: number;
  tierCounts: Record<number, number>;
  totalNetwork: number;
  shareUrl: string;
}

export default function EarningsShareCard({
  open, onClose, profile, thisMonthCommission, allTimeCommission,
  tierCounts, totalNetwork, shareUrl,
}: Props) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const monthName = new Date().toLocaleString("en-MY", { month: "long", year: "numeric" });
  const code = profile?.referral_code || "";

  const whatsappText =
    `*Bulan ini saya earned RM ${thisMonthCommission.toFixed(2)} dari nocap! 🎉*\n\n` +
    `Network saya dah ada *${totalNetwork} orang* merentasi 5 tier.\n\n` +
    `Join sekarang — setiap pembelian bagi cashback + 5-tier commission! 💰\n\n` +
    `Guna code saya: *${code}*\n` +
    `👉 ${shareUrl}`;

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      toast({ title: "Copied!", description: "Paste into WhatsApp to share." });
    } catch {
      toast({ title: "Copy failed", description: "Select the text manually.", variant: "destructive" });
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: whatsappText });
      } catch {
        // user dismissed
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm w-full">
        {/* Screenshot hint */}
        <p className="text-center text-xs text-white/50 mb-2 px-4">
          Screenshot this card and share it!
        </p>

        {/* The card itself — optimised for screenshot */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl mx-2"
          style={{
            background: "linear-gradient(135deg, #0a0a0f 0%, #111118 40%, #0f1c12 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Top accent line */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #c9f542 0%, #8bc34a 100%)" }} />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <img src={nocapIcon} alt="nocap" className="h-7 w-7 object-contain" />
                <span className="font-display font-bold text-white text-base tracking-wide">nocap</span>
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Affiliate Network</span>
            </div>

            {/* Hero earnings */}
            <div className="mb-5">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{monthName} earnings</p>
              <p className="font-display font-bold leading-none" style={{ fontSize: "clamp(2.5rem, 12vw, 3.5rem)", color: "#c9f542" }}>
                RM {thisMonthCommission.toFixed(2)}
              </p>
              <p className="text-sm text-white/50 mt-1">from my affiliate network</p>
            </div>

            {/* Tier badges */}
            <div className="grid grid-cols-5 gap-1.5 mb-5">
              {[1, 2, 3, 4, 5].map((t) => {
                const count = tierCounts[t] || 0;
                const colors = ["bg-[#c9f542]/15 text-[#c9f542]", "bg-blue-500/15 text-blue-300",
                  "bg-purple-500/15 text-purple-300", "bg-amber-500/15 text-amber-300", "bg-white/10 text-white/50"];
                return (
                  <div key={t} className={`rounded-lg p-2 text-center ${colors[t - 1]}`}>
                    <p className="text-[10px] font-bold">T{t}</p>
                    <p className="font-display text-sm font-bold">{count}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-white/30 mb-5">
              <span>{totalNetwork} people in my network</span>
              <span>all-time RM {allTimeCommission.toFixed(2)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 mb-5" />

            {/* CTA + QR */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-0.5">Join me on nocap</p>
                <p className="font-display text-xl font-bold text-white tracking-widest">{code}</p>
                <p className="text-[10px] text-white/30 mt-0.5 truncate">{shareUrl}</p>
                <p className="text-[10px] text-white/20 mt-3 leading-relaxed">
                  Shop → earn cashback + 5-tier commissions
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-white p-2.5">
                <QRCodeSVG
                  value={shareUrl}
                  size={80}
                  level="M"
                  fgColor="#0a0a0f"
                />
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="px-6 pb-4">
            <p className="text-center text-[9px] text-white/20 tracking-widest uppercase">
              Malaysia's No.1 Affiliate Marketplace
            </p>
          </div>
        </div>

        {/* Action buttons — outside card so they don't appear in screenshot */}
        <div className="flex gap-2 mt-3 px-2">
          {canNativeShare ? (
            <Button
              onClick={nativeShare}
              className="flex-1 gap-2 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          ) : (
            <Button
              onClick={copyText}
              className="flex-1 gap-2 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
            >
              <Copy className="h-4 w-4" /> Copy for WhatsApp
            </Button>
          )}
          <Button
            onClick={copyText}
            variant="outline"
            size="icon"
            className="border-white/15 text-white/50 hover:bg-white/10 hover:text-white"
            title="Copy message text"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-white/15 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
