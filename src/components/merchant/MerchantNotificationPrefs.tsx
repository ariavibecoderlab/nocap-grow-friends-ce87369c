import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2 } from "lucide-react";

interface MerchantNotificationPrefsProps {
  branchId: string;
  branchName: string;
}

const FREQ_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

const MerchantNotificationPrefs = ({ branchId, branchName }: MerchantNotificationPrefsProps) => {
  const { toast } = useToast();
  const [frequencies, setFrequencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("merchant_branches")
        .select("report_frequency")
        .eq("id", branchId)
        .single();
      if (!error && data) {
        setFrequencies(data.report_frequency || ["daily", "weekly", "monthly"]);
      }
      setLoading(false);
    };
    load();
  }, [branchId]);

  const toggle = async (freq: string) => {
    const newFreqs = frequencies.includes(freq)
      ? frequencies.filter((f) => f !== freq)
      : [...frequencies, freq];

    setUpdating(true);
    const { error } = await supabase
      .from("merchant_branches")
      .update({ report_frequency: newFreqs })
      .eq("id", branchId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFrequencies(newFreqs);
      toast({ title: "Email preferences updated" });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-secondary" />
          <p className="text-sm font-semibold text-white">Email Report Preferences</p>
        </div>
        <p className="text-xs text-white/40">
          Choose which sales summary emails you'd like to receive for {branchName}.
        </p>
        <div className="flex items-center gap-6">
          {FREQ_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={frequencies.includes(opt.key)}
                onCheckedChange={() => toggle(opt.key)}
                disabled={updating}
                className="border-white/30 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
              />
              <span className="text-sm text-white/70">{opt.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantNotificationPrefs;
