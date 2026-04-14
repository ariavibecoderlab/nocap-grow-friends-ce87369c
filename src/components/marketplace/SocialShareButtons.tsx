import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Facebook, Link2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  productName: string;
  productUrl: string;
  productImage?: string;
  variant?: "icon" | "full";
}

const SocialShareButtons = ({ productName, productUrl, variant = "full" }: Props) => {
  const { toast } = useToast();

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Check out ${productName}! ${productUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareFacebook = () => {
    const url = encodeURIComponent(productUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url: productUrl });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(productUrl);
    toast({ title: "Link copied!" });
  };

  if (variant === "icon") {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={shareWhatsApp} className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/10">
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={shareFacebook} className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-500/10">
          <Facebook className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={copyLink} className="h-7 w-7 p-0 text-white/50 hover:bg-white/10">
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={shareWhatsApp}
        className="flex-1 gap-1.5 border-green-500/20 text-green-400 hover:bg-green-500/10 text-[10px] h-8">
        <MessageCircle className="h-3 w-3" /> WhatsApp
      </Button>
      <Button size="sm" variant="outline" onClick={shareFacebook}
        className="flex-1 gap-1.5 border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-[10px] h-8">
        <Facebook className="h-3 w-3" /> Facebook
      </Button>
      <Button size="sm" variant="outline" onClick={shareNative}
        className="flex-1 gap-1.5 border-white/10 text-white/60 hover:bg-white/10 text-[10px] h-8">
        <Share2 className="h-3 w-3" /> Share
      </Button>
    </div>
  );
};

export default SocialShareButtons;
