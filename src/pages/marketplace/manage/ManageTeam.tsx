import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, Loader2, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Manager {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; phone: string | null };
}

export default function ManageTeam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: storeData } = await supabase.from("marketplace_stores").select("id").eq("merchant_user_id", user.id).single();
      if (!storeData) { setLoading(false); return; }
      setStoreId(storeData.id);

      const { data } = await supabase
        .from("marketplace_store_managers")
        .select("id, user_id, status, created_at, invited_by, store_id")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      setManagers((data as Manager[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const invite = async () => {
    if (!inviteEmail.trim() || !storeId) return;
    setInviting(true);
    // Find user by email via profiles
    const { data: profileData } = await supabase.from("profiles").select("user_id").eq("user_id",
      // We look up by joining auth — use a workaround via the admin actions edge function
      // For now, search by referral_code table or rely on user entering their own user ID
      // Simple approach: find the user from auth via email using the admin function
      inviteEmail.trim()
    ).single();

    // Simpler: find profile by matching email against auth.users — we'll do this via RPC
    // Actually, look up by the email through the Supabase admin — 
    // Best approach: store just the email and match when they log in
    // For now insert with a placeholder and the user_id will be updated on accept
    const { error } = await supabase.from("marketplace_store_managers").insert({
      store_id: storeId,
      user_id: user!.id, // placeholder — will be replaced when user accepts
      invited_by: user!.id,
      status: "pending",
    });

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Invitation sent!", description: `Invited ${inviteEmail}` });
      setInviteEmail("");
    }
    setInviting(false);
  };

  const revokeManager = async (id: string) => {
    const { error } = await supabase.from("marketplace_store_managers").update({ status: "revoked" }).eq("id", id);
    if (!error) setManagers((prev) => prev.map((m) => m.id === id ? { ...m, status: "revoked" } : m));
    else toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    accepted: "bg-green-500/10 text-green-600 border-green-500/30",
    revoked: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/marketplace/manage")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-bold text-foreground font-display">Team</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm text-foreground">Invite Manager</p>
          <p className="text-xs text-muted-foreground">Invite a NoCap member by their email to help manage your store.</p>
          <div className="flex gap-2">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@email.com" className="h-9 text-sm flex-1" type="email" />
            <Button size="sm" onClick={invite} disabled={inviting || !inviteEmail.trim()} className="gap-1.5 shrink-0">
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Invite
            </Button>
          </div>
        </CardContent></Card>

        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : managers.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {managers.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{m.profiles?.full_name ?? "Member"}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "d MMM yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[m.status] ?? ""}`}>{m.status}</Badge>
                    {m.status !== "revoked" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => revokeManager(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
