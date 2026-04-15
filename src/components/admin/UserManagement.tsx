import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Mail, Phone, Calendar, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ALL_ROLES: AppRole[] = ["member", "merchant", "branch", "admin"];

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pendingAction, setPendingAction] = useState<{
    targetUserId: string;
    role: AppRole;
    remove: boolean;
    userName: string;
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      // Batch-fetch all rows to avoid the 1000-row default limit
      const fetchAll = async (table: string, select: string) => {
        const PAGE = 1000;
        let all: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from(table as any).select(select).range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all = all.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return all;
      };

      const [profiles, roles, wallets, emailsRes] = await Promise.all([
        fetchAll("profiles", "*"),
        fetchAll("user_roles", "*"),
        fetchAll("wallets", "*"),
        supabase.rpc("get_all_user_emails"),
      ]);

      const emails = emailsRes.data || [];

      return profiles
        .map((p: any) => ({
          ...p,
          roles: roles.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
          balance: wallets.find((w: any) => w.user_id === p.user_id)?.balance ?? 0,
          email: (emails as any[]).find((e: any) => e.user_id === p.user_id)?.email || "—",
        }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

  const filtered = users?.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.referral_code || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  // Reset page when search changes
  const totalItems = filtered?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filtered?.slice((safePage - 1) * pageSize, safePage * pageSize);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Showing {totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)} of {totalItems}
        </span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          className="bg-muted border border-border text-foreground text-xs rounded px-2 py-1"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
          <option value={200}>200 / page</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} className="h-7 px-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2">{safePage} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} className="h-7 px-2">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or referral code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 bg-card border-border"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <>
            <PaginationControls />

            {/* Desktop table */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card/50">
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Referral</TableHead>
                    <TableHead className="text-xs">Registered</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs">Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers?.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="py-2">
                        <span className="font-medium text-sm">{u.full_name || "No name"}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{u.phone || "—"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{u.referral_code}</code>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{formatDate(u.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-xs font-medium">RM {Number(u.balance).toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {ALL_ROLES.map((role) => {
                            const has = u.roles.includes(role);
                            return (
                              <Button
                                key={role}
                                size="sm"
                                variant={has ? "default" : "outline"}
                                className={`h-6 text-xs px-2 ${has ? "bg-secondary text-primary hover:bg-secondary/90" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                                onClick={() => handleRoleClick(u.user_id, role, has, u.full_name || "this user")}
                                disabled={roleMutation.isPending}
                              >
                                {role}
                              </Button>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {paginatedUsers?.map((u) => (
                <Card key={u.id} className="border-border bg-card">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{u.full_name || "No name"}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        RM {Number(u.balance).toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{u.phone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{formatDate(u.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Referral: <code className="bg-muted px-1 py-0.5 rounded">{u.referral_code}</code>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ALL_ROLES.map((role) => {
                        const has = u.roles.includes(role);
                        return (
                          <Button
                            key={role}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            className={`h-6 text-xs px-2 ${has ? "bg-secondary text-primary hover:bg-secondary/90" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
              ))}
            </div>

            <PaginationControls />
          </>
        )}
      </div>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.remove ? "Remove Admin Role" : "Grant Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.remove
                ? `Remove admin privileges from "${pendingAction.userName}"?`
                : `Grant admin privileges to "${pendingAction?.userName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
