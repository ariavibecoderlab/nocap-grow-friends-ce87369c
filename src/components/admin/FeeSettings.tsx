import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Store, Loader2, ShieldCheck } from "lucide-react";

interface MerchantApp {
  id: string;
  user_id: string;
  business_name: string;
  min_withdrawal_amount: number | null;
}

const FeeSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [addDialog, setAddDialog] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", description: "" });
  const [merchantEdits, setMerchantEdits] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ["approved_merchants_min_wd"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_applications")
        .select("id, user_id, business_name, min_withdrawal_amount")
        .eq("status", "approved")
        .order("business_name");
      if (error) throw error;
      return data as MerchantApp[];
    },
  });

  const globalMinSetting = settings?.find((s) => s.key === "min_withdrawal_amount");
  const minPinSetting = settings?.find((s) => s.key === "min_pin_amount");
  const [pinEditValue, setPinEditValue] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "update_setting", settingId: id, value },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Setting updated" });
      queryClient.invalidateQueries({ queryKey: ["system_settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (s: typeof newSetting) => {
      const { error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "create_setting", ...s },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Setting created" });
      setAddDialog(false);
      setNewSetting({ key: "", value: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["system_settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const merchantMinMutation = useMutation({
    mutationFn: async ({ applicationId, value }: { applicationId: string; value: string }) => {
      const { error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "update_merchant_min_withdrawal",
          applicationId,
          minAmount: value === "" ? null : Number(value),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Merchant minimum updated" });
      queryClient.invalidateQueries({ queryKey: ["approved_merchants_min_wd"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddDialog(true)} className="bg-secondary text-primary hover:bg-secondary/90 font-semibold"><Plus className="mr-1 h-4 w-4" /> Add Setting</Button>
      </div>

      {isLoading ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : (
        settings?.map((s) => (
          <Card key={s.id} className="border-white/10 bg-white/5">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white">{s.key}</p>
                {s.description && <p className="text-xs text-white/40">{s.description}</p>}
              </div>
              <Input
                className="w-32 border-white/10 bg-white/5 text-white"
                defaultValue={s.value}
                onChange={(e) => setEditValues((p) => ({ ...p, [s.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                disabled={!editValues[s.id] || editValues[s.id] === s.value}
                onClick={() => updateMutation.mutate({ id: s.id, value: editValues[s.id] })}
              >
                <Save className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      {/* PIN Enforcement Limit */}
      <Separator className="my-4 bg-white/10" />
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
          <ShieldCheck className="h-4 w-4" /> PIN Enforcement Limit
        </h3>
        <p className="text-xs text-white/40">
          Transactions equal to or above this amount (RM) will require PIN verification before processing.
        </p>
        {minPinSetting ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white">Minimum PIN Amount</p>
                <p className="text-xs text-white/40">
                  Currently: RM {minPinSetting.value}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-white/40 shrink-0">RM</Label>
                <Input
                  className="w-24 border-white/10 bg-white/5 text-white"
                  type="number"
                  min="1"
                  defaultValue={minPinSetting.value}
                  onChange={(e) => setPinEditValue(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  disabled={!pinEditValue || pinEditValue === minPinSetting.value}
                  onClick={() => updateMutation.mutate({ id: minPinSetting.id, value: pinEditValue! })}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => createMutation.mutate({ key: "min_pin_amount", value: "100", description: "Minimum amount requiring PIN verification" })}
          >
            <Plus className="mr-1 h-4 w-4" /> Initialize PIN Limit (RM 100)
          </Button>
        )}
      </div>

      {/* Per-Merchant Min Withdrawal Section */}
      <Separator className="my-4 bg-white/10" />
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
          <Store className="h-4 w-4" /> Per-Merchant Minimum Withdrawal
        </h3>
        <p className="text-xs text-white/40">
          Override the default minimum (RM {globalMinSetting?.value || "50"}) for specific merchants. Leave blank to use the global default.
        </p>

        {merchantsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
        ) : merchants?.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-4">No approved merchants yet.</p>
        ) : (
          merchants?.map((m) => {
            const editKey = m.id;
            const currentVal = m.min_withdrawal_amount != null ? String(m.min_withdrawal_amount) : "";
            const editVal = merchantEdits[editKey];
            const hasChange = editVal !== undefined && editVal !== currentVal;

            return (
              <Card key={m.id} className="border-white/10 bg-white/5">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{m.business_name}</p>
                    <p className="text-[10px] text-white/40">
                      {m.min_withdrawal_amount != null
                        ? `Custom: RM ${m.min_withdrawal_amount}`
                        : `Using default: RM ${globalMinSetting?.value || "50"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-white/40 shrink-0">RM</Label>
                    <Input
                      className="w-24 border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      type="number"
                      placeholder={globalMinSetting?.value || "50"}
                      defaultValue={currentVal}
                      onChange={(e) => setMerchantEdits((p) => ({ ...p, [editKey]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      disabled={!hasChange || merchantMinMutation.isPending}
                      onClick={() => merchantMinMutation.mutate({ applicationId: m.id, value: editVal ?? "" })}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="bg-primary border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Add Setting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Key (e.g. platform_fee_percent)" value={newSetting.key} onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            <Input placeholder="Value" value={newSetting.value} onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            <Input placeholder="Description (optional)" value={newSetting.description} onChange={(e) => setNewSetting((p) => ({ ...p, description: e.target.value }))} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
          </div>
          <DialogFooter>
            <Button className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => createMutation.mutate(newSetting)} disabled={!newSetting.key || !newSetting.value || createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeSettings;
