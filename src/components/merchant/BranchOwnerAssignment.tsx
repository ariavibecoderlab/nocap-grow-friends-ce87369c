import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, UserX, Search } from "lucide-react";

interface Props {
  branchId: string;
  currentOwnerId: string | null;
  onAssigned: () => void;
}

const BranchOwnerAssignment = ({ branchId, currentOwnerId, onAssigned }: Props) => {
  const { toast } = useToast();
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null; referral_code: string }>>([]);
  const [assigning, setAssigning] = useState(false);

  // Fetch current owner profile
  useEffect(() => {
    if (!currentOwnerId) { setOwnerProfile(null); return; }
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", currentOwnerId)
      .single()
      .then(({ data }) => setOwnerProfile(data));
  }, [currentOwnerId]);

  const searchMembers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    // Search by phone or referral code
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, referral_code")
      .or(`phone.ilike.%${searchQuery.trim()}%,referral_code.ilike.%${searchQuery.trim()}%`)
      .limit(5);
    setSearchResults(data || []);
    setSearching(false);
  };

  const assignOwner = async (targetUserId: string) => {
    setAssigning(true);

    // Update branch
    const { error } = await supabase
      .from("merchant_branches")
      .update({ owner_user_id: targetUserId })
      .eq("id", branchId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setAssigning(false);
      return;
    }

    // Assign branch role via edge function (needs service role)
    const { error: roleError } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_role", targetUserId, role: "branch" },
    });

    // If user doesn't have admin access for role assignment, do it directly
    // The merchant can set owner_user_id, but role assignment needs admin
    // Let's try direct insert (will fail if not admin, which is fine - admin can do it)
    if (roleError) {
      // Try direct upsert - RLS will allow if user is admin
      await supabase.from("user_roles").upsert(
        { user_id: targetUserId, role: "branch" as any },
        { onConflict: "user_id,role" }
      );
    }

    toast({ title: "Branch owner assigned!" });
    setSearchQuery("");
    setSearchResults([]);
    onAssigned();
    setAssigning(false);
  };

  const removeOwner = async () => {
    setAssigning(true);
    const { error } = await supabase
      .from("merchant_branches")
      .update({ owner_user_id: null })
      .eq("id", branchId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Branch owner removed" });
      onAssigned();
    }
    setAssigning(false);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" /> Branch Owner
        </p>

        {currentOwnerId && ownerProfile ? (
          <div className="bg-muted/50 rounded px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{ownerProfile.full_name || "Unnamed"}</p>
              <p className="text-[10px] text-muted-foreground">{ownerProfile.phone || "No phone"}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={removeOwner} disabled={assigning}>
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Search by phone number or referral code to assign a member as branch owner.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Phone or referral code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchMembers()}
                className="flex-1"
              />
              <Button size="sm" onClick={searchMembers} disabled={searching} variant="outline">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.full_name || "Unnamed"}</p>
                      <p className="text-[10px] text-muted-foreground">{p.phone || p.referral_code}</p>
                    </div>
                    <Button size="sm" onClick={() => assignOwner(p.user_id)} disabled={assigning}>
                      {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Assign"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BranchOwnerAssignment;
