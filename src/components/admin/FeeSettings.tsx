import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus } from "lucide-react";

const FeeSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [addDialog, setAddDialog] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", description: "" });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("key");
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="mr-1 h-4 w-4" /> Add Setting</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        settings?.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.key}</p>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <Input
                className="w-32"
                defaultValue={s.value}
                onChange={(e) => setEditValues((p) => ({ ...p, [s.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!editValues[s.id] || editValues[s.id] === s.value}
                onClick={() => updateMutation.mutate({ id: s.id, value: editValues[s.id] })}
              >
                <Save className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Setting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Key (e.g. platform_fee_percent)" value={newSetting.key} onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))} />
            <Input placeholder="Value" value={newSetting.value} onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))} />
            <Input placeholder="Description (optional)" value={newSetting.description} onChange={(e) => setNewSetting((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button onClick={() => createMutation.mutate(newSetting)} disabled={!newSetting.key || !newSetting.value || createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeSettings;
