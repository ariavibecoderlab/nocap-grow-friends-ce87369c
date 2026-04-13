import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StoreFollowButtonProps {
  storeId: string;
}

const StoreFollowButton = ({ storeId }: StoreFollowButtonProps) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch follower count
    supabase
      .from("marketplace_store_follows")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .then(({ count }) => {
        if (count !== null) setFollowerCount(count);
      });

    // Check if current user follows
    if (user) {
      supabase
        .from("marketplace_store_follows")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setFollowing(!!data);
        });
    }
  }, [storeId, user]);

  const handleToggle = async () => {
    if (!user) {
      toast({ title: "Please log in to follow stores" });
      return;
    }
    setLoading(true);

    if (following) {
      await supabase
        .from("marketplace_store_follows")
        .delete()
        .eq("store_id", storeId)
        .eq("user_id", user.id);
      setFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("marketplace_store_follows")
        .insert({ store_id: storeId, user_id: user.id });
      setFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={following ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className={`h-7 text-[11px] gap-1 rounded-full ${
          following
            ? "bg-secondary text-primary hover:bg-secondary/90"
            : "border-white/20 text-white/70 hover:bg-white/10"
        }`}
      >
        {following ? (
          <UserCheck className="h-3 w-3" />
        ) : (
          <UserPlus className="h-3 w-3" />
        )}
        {following ? "Following" : "Follow"}
      </Button>
      <span className="text-[10px] text-white/40">
        {followerCount} follower{followerCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
};

export default StoreFollowButton;
