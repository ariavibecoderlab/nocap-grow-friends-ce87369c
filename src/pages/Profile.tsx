import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import { LogOut, HelpCircle, FileText, Lock, Info, ChevronRight, KeyRound, Settings, User, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConnectedApps from "@/components/member/ConnectedApps";
import NocapLogo from "@/components/NocapLogo";
import { TERMINOLOGY } from "@/lib/constants";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = () => {
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setProfile(data));
    };
    fetchProfile();
    const handler = () => fetchProfile();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading) return null;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Profile Card - clickable */}
        <Card
          className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => navigate("/my-profile")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-12 w-12 border border-secondary/30">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || "Avatar"} />
              <AvatarFallback className="bg-white/10 text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.full_name || "Member"}</p>
              <p className="text-xs text-white/40">{user?.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-white/40" />
            <h2 className="font-display text-sm font-semibold text-white/60">General</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Set PIN", icon: ShieldCheck, path: "/set-pin" },
              { label: "Reset PIN", icon: KeyRound, path: "/reset-pin" },
              { label: "Set Password", icon: KeyRound, path: "/set-password" },
              { label: "Help & Support", icon: HelpCircle, path: "/help-support" },
              { label: "Terms & Conditions", icon: FileText, path: "/terms" },
              { label: "Privacy Policy", icon: Lock, path: "/privacy" },
              { label: "About NOcap", icon: Info, path: "/about" },
            ].map((item) => (
              <Card key={item.path} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate(item.path)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/70">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Terminology Glossary */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-white/40" />
            <h2 className="font-display text-sm font-semibold text-white/60">Terminology</h2>
          </div>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{TERMINOLOGY.vaBalance}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">Canonical label for your available app balance used in payments, checkout, withdrawals, and receipts.</p>
                </div>
                <span className="rounded-md border border-secondary/30 bg-secondary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">Official</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Apps */}
        <ConnectedApps />

        <Button className="mt-6 w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
