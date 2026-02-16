import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ALL_ROLES: AppRole[] = ["member", "merchant", "branch", "admin"];

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{
    targetUserId: string;
    role: AppRole;
    remove: boolean;
    userName: string;
  } | null>(null);

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

  const handleRoleClick = (targetUserId: string, role: AppRole, remove: boolean, userName: string) => {
    if (role === "admin") {
      setPendingAction({ targetUserId, role, remove, userName });
    } else {
      roleMutation.mutate({ targetUserId, role, remove });
    }
  };

  return (
    <>
      <div className="space-y-3 mt-4">
        {isLoading ? (
          <p className="text-white/40 text-sm">Loading...</p>
        ) : (
          users?.map((u) => (
            <Card key={u.id} className="border-white/10 bg-white/5">
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-white">{u.full_name || "No name"}</p>
                  <span className="text-xs text-white/40">RM {Number(u.balance).toFixed(2)}</span>
                </div>
                <p className="text-xs text-white/40">{u.phone || "—"} · {u.referral_code}</p>
                <div className="flex flex-wrap gap-1">
                  {ALL_ROLES.map((role) => {
                    const has = u.roles.includes(role);
                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        className={`h-6 text-xs px-2 ${has ? "bg-secondary text-primary hover:bg-secondary/90" : "border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                        onClick={() => handleRoleClick(u.user_id, role, has, u.full_name || "this user")}
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

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="bg-primary border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {pendingAction?.remove ? "Remove Admin Role" : "Grant Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              {pendingAction?.remove
                ? `Are you sure you want to remove admin privileges from "${pendingAction.userName}"? They will lose access to the admin panel.`
                : `Are you sure you want to grant admin privileges to "${pendingAction?.userName}"? They will have full access to the admin panel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-secondary text-primary hover:bg-secondary/90 font-semibold"
              onClick={() => {
                if (pendingAction) {
                  roleMutation.mutate({
                    targetUserId: pendingAction.targetUserId,
                    role: pendingAction.role,
                    remove: pendingAction.remove,
                  });
                  setPendingAction(null);
                }
              }}
            >
              {pendingAction?.remove ? "Remove Admin" : "Grant Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;
