import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ProductShareButtonProps {
  productName: string;
  storeSlug: string;
  productId: string;
}

export default function ProductShareButton({
  productName,
  storeSlug,
  productId,
}: ProductShareButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const buildUrl = () => {
    const base = `${window.location.origin}/store/${storeSlug}/product/${productId}`;
    return user ? `${base}?ref=${user.id}` : base;
  };

  const handleShare = async () => {
    const url = buildUrl();
    const shareData = {
      title: productName,
      text: `Check out ${productName} on NoCap!`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          fallbackCopy(url);
        }
      }
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      if (user) {
        toast({
          title: "Link copied!",
          description: "Earn commission when friends buy via your link 🎯",
        });
      } else {
        toast({
          title: "Link copied!",
          description: "Sign in to earn referral commission",
        });
      }
    } catch {
      toast({ title: "Unable to share", variant: "destructive" });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm h-10 w-10"
      onClick={handleShare}
    >
      <Share2 className="h-5 w-5" />
    </Button>
  );
}
