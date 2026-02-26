import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Globe } from "lucide-react";

interface ApiAppAdmin {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  merchant_user_id: string;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
}

const ApiAppsManagement = () => {
  const { toast } = useToast();
  const [apps, setApps] = useState<ApiAppAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_applications")
      .select("id, name, description, api_key, merchant_user_id, branch_id, is_active, created_at")
      .order("created_at", { ascending: false });
    if (data) setApps(data as ApiAppAdmin[]);
    setLoading(false);
  };

  const toggleApp = async (appId: string, active: boolean) => {
    const { error } = await supabase
      .from("api_applications")
      .update({ is_active: active })
      .eq("id", appId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, is_active: active } : a)));
      toast({ title: active ? "App activated" : "App deactivated" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <p className="text-sm text-white/40">{apps.length} registered API app(s)</p>

      {apps.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <Globe className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No API apps registered yet</p>
          </CardContent>
        </Card>
      ) : (
        apps.map((app) => (
          <Card key={app.id} className="border-white/10 bg-white/5">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{app.name}</p>
                  <p className="text-[10px] text-white/40">
                    Created {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={app.is_active ? "default" : "secondary"} className="text-[10px]">
                    {app.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch checked={app.is_active} onCheckedChange={(v) => toggleApp(app.id, v)} />
                </div>
              </div>
              <code className="text-[9px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded block truncate">{app.api_key}</code>
              {app.description && <p className="text-[10px] text-white/40">{app.description}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ApiAppsManagement;
