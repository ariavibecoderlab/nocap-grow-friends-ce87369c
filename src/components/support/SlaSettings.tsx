import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SlaSetting {
  id: string;
  priority: string;
  first_response_minutes: number;
  resolution_minutes: number;
}

const priorityOrder = ["urgent", "high", "medium", "low"];
const priorityColors: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

export default function SlaSettings() {
  const [settings, setSettings] = useState<SlaSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("sla_settings")
      .select("*")
      .then(({ data }) => {
        const sorted = (data || []).sort(
          (a: any, b: any) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
        );
        setSettings(sorted);
        setLoading(false);
      });
  }, []);

  const updateSetting = (id: string, field: string, value: number) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    return mins % 60 === 0 ? `${mins / 60}h` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of settings) {
        const { error } = await supabase
          .from("sla_settings")
          .update({
            first_response_minutes: s.first_response_minutes,
            resolution_minutes: s.resolution_minutes,
          })
          .eq("id", s.id);
        if (error) throw error;
      }
      toast({ title: "SLA settings saved" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-secondary" />
          SLA Response Targets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Priority</span>
            <span>First Response</span>
            <span>Resolution</span>
          </div>
          {settings.map((s) => (
            <div key={s.id} className="grid grid-cols-3 gap-2 items-center">
              <span className={`text-sm font-semibold capitalize ${priorityColors[s.priority] || ""}`}>
                {s.priority}
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  value={s.first_response_minutes}
                  onChange={(e) => updateSetting(s.id, "first_response_minutes", parseInt(e.target.value) || 1)}
                  className="h-8 text-xs w-20"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  min ({formatTime(s.first_response_minutes)})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  value={s.resolution_minutes}
                  onChange={(e) => updateSetting(s.id, "resolution_minutes", parseInt(e.target.value) || 1)}
                  className="h-8 text-xs w-20"
                />
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  min ({formatTime(s.resolution_minutes)})
                </span>
              </div>
            </div>
          ))}
          <Button size="sm" onClick={handleSave} disabled={saving} className="mt-2">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save SLA Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
