import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProductShareButtonProps {
  productName: string;
  productUrl?: string;
}

export default function ProductShareButton({ productName, productUrl }: ProductShareButtonProps) {
  const { toast } = useToast();
  const url = productUrl || window.location.href;

  const handleShare = async () => {
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
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Product link copied to clipboard" });
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
