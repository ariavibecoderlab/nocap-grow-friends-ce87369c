import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ALL_ROLES: AppRole[] = ["member", "merchant", "branch", "admin"];

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
      if (rErr) throw rErr;
      const { data: wallets, error: wErr } = await supabase.from("wallets").select("*");
      if (wErr) throw wErr;

      return profiles.map((p) => ({
        ...p,
        roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
        balance: wallets.find((w) => w.user_id === p.user_id)?.balance ?? 0,
      }));
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ targetUserId, role, remove }: { targetUserId: string; role: AppRole; remove: boolean }) => {
      const { error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "update_role", targetUserId, role, remove },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        users?.map((u) => (
          <Card key={u.id}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{u.full_name || "No name"}</p>
                <span className="text-xs text-muted-foreground">RM {Number(u.balance).toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{u.phone || "—"} · {u.referral_code}</p>
              <div className="flex flex-wrap gap-1">
                {ALL_ROLES.map((role) => {
                  const has = u.roles.includes(role);
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      className="h-6 text-xs px-2"
                      onClick={() => roleMutation.mutate({ targetUserId: u.user_id, role, remove: has })}
                      disabled={roleMutation.isPending}
                    >
                      {role}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default UserManagement;
