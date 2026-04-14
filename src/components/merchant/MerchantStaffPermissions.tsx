import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Shield, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

const ALL_PERMISSIONS = [
  { key: "view_products", label: "View Products", group: "Products" },
  { key: "manage_products", label: "Manage Products", group: "Products" },
  { key: "view_orders", label: "View Orders", group: "Orders" },
  { key: "manage_orders", label: "Manage Orders", group: "Orders" },
  { key: "view_analytics", label: "View Analytics", group: "Insights" },
  { key: "manage_settings", label: "Manage Settings", group: "Config" },
  { key: "manage_discounts", label: "Manage Discounts", group: "Marketing" },
  { key: "manage_reviews", label: "Manage Reviews", group: "Marketing" },
];

interface ManagerWithPerms {
  id: string;
  user_id: string;
  status: string;
  email: string;
  permissions: Set<string>;
}

const MerchantStaffPermissions = ({ storeId }: Props) => {
  const [managers, setManagers] = useState<ManagerWithPerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    const { data: mgrs } = await supabase
      .from("marketplace_store_managers")
      .select("id, user_id, status")
      .eq("store_id", storeId);

    if (!mgrs || mgrs.length === 0) {
      setManagers([]);
      setLoading(false);
      return;
    }

    // Get permissions
    const mgrIds = mgrs.map(m => m.id);
    const { data: perms } = await supabase
      .from("marketplace_manager_permissions")
      .select("manager_id, permission")
      .in("manager_id", mgrIds);

    // Get emails
    const userIds = mgrs.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || "Unknown"]));
    const permMap = new Map<string, Set<string>>();
    (perms || []).forEach((p: any) => {
      if (!permMap.has(p.manager_id)) permMap.set(p.manager_id, new Set());
      permMap.get(p.manager_id)!.add(p.permission);
    });

    setManagers(mgrs.map(m => ({
      ...m,
      email: profileMap.get(m.user_id) || "Unknown",
      permissions: permMap.get(m.id) || new Set(),
    })));
    setLoading(false);
  };

  const togglePermission = (managerId: string, perm: string) => {
    setManagers(prev => prev.map(m => {
      if (m.id !== managerId) return m;
      const newPerms = new Set(m.permissions);
      if (newPerms.has(perm)) newPerms.delete(perm);
      else newPerms.add(perm);
      return { ...m, permissions: newPerms };
    }));
  };

  const savePermissions = async (manager: ManagerWithPerms) => {
    setSaving(manager.id);

    // Delete all existing permissions then re-insert
    await supabase.from("marketplace_manager_permissions")
      .delete()
      .eq("manager_id", manager.id);

    if (manager.permissions.size > 0) {
      const rows = Array.from(manager.permissions).map(p => ({
        manager_id: manager.id,
        permission: p,
      }));
      await supabase.from("marketplace_manager_permissions").insert(rows);
    }

    setSaving(null);
    toast({ title: "Permissions saved" });
  };

  const grantAll = (managerId: string) => {
    setManagers(prev => prev.map(m =>
      m.id === managerId ? { ...m, permissions: new Set(ALL_PERMISSIONS.map(p => p.key)) } : m
    ));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  if (managers.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-white/30">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No staff members</p>
        <p className="text-[10px] mt-1">Invite managers in the Shop tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/40">Configure what each store manager can access and modify.</p>

      {managers.map(mgr => (
        <Card key={mgr.id} className="border-white/10 bg-white/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-secondary" />
                <div>
                  <p className="text-sm font-medium text-white">{mgr.email}</p>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${mgr.status === "accepted" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}`}>
                    {mgr.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => grantAll(mgr.id)}
                  className="h-6 text-[9px] text-white/40 hover:text-white">Grant All</Button>
                <Button size="sm" onClick={() => savePermissions(mgr)}
                  disabled={saving === mgr.id}
                  className="h-6 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
                  {saving === mgr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-0.5" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map(perm => (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={mgr.permissions.has(perm.key)}
                    onCheckedChange={() => togglePermission(mgr.id, perm.key)}
                  />
                  <div>
                    <p className="text-[11px] text-white">{perm.label}</p>
                    <p className="text-[9px] text-white/30">{perm.group}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MerchantStaffPermissions;
