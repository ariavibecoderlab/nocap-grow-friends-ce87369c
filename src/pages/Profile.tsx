import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import { LogOut, Mail, Phone, MapPin, Shield } from "lucide-react";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary px-4 pb-8 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="-mt-4 border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-lg">{profile?.full_name || "Member"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile?.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{profile.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>PIN: {profile?.has_pin ? "Set" : "Not set"}</span>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="mt-6 w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
