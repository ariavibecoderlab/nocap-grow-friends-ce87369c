import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Unplug } from "lucide-react";

interface ConnectedApp {
  id: string;
  app_id: string;
  app_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  scopes: string[];
}

const ConnectedApps = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchConnectedApps();
  }, [user]);

  const fetchConnectedApps = async () => {
    setLoading(true);
    const { data: tokens } = await supabase
      .from("api_access_tokens")
      .select("id, app_id, is_active, created_at, last_used_at, expires_at, scopes")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!tokens || tokens.length === 0) {
      setApps([]);
      setLoading(false);
      return;
    }

    // Fetch app names
    const appIds = [...new Set(tokens.map((t: any) => t.app_id))];
    const { data: appData } = await supabase
      .from("api_applications")
      .select("id, name")
      .in("id", appIds);

    const appMap = new Map((appData || []).map((a: any) => [a.id, a.name]));

    setApps(
      tokens.map((t: any) => ({
        id: t.id,
        app_id: t.app_id,
        app_name: appMap.get(t.app_id) || "Unknown App",
        is_active: t.is_active,
        created_at: t.created_at,
        last_used_at: t.last_used_at,
        expires_at: t.expires_at,
        scopes: t.scopes as string[],
      }))
    );
    setLoading(false);
  };

  const revokeAccess = async (tokenId: string) => {
    setRevoking(tokenId);
    const { data, error } = await supabase.functions.invoke("api-revoke", {
      body: { token_id: tokenId },
    });

    if (error || !data?.success) {
      toast({ title: "Error", description: "Failed to revoke access", variant: "destructive" });
    } else {
      setApps((prev) => prev.filter((a) => a.id !== tokenId));
      toast({ title: "Access revoked" });
    }
    setRevoking(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (apps.length === 0) {
    return null; // Don't show section if no connected apps
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-white/40" />
        <h2 className="font-display text-sm font-semibold text-white/60">Connected Apps</h2>
      </div>
      <div className="space-y-2">
        {apps.map((app) => (
          <Card key={app.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{app.app_name}</p>
                  <p className="text-[10px] text-white/40">
                    Connected {new Date(app.created_at).toLocaleDateString()}
                    {app.last_used_at && ` · Last used ${new Date(app.last_used_at).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {app.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">{s}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => revokeAccess(app.id)}
                  disabled={revoking === app.id}
                >
                  {revoking === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ConnectedApps;
