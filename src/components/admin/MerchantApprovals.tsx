import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, CheckSquare } from "lucide-react";

const MerchantApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["merchant_applications", statusFilter],
    queryFn: async () => {
      let q = supabase.from("merchant_applications").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const pendingApps = applications?.filter((a) => a.status === "pending") || [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pendingApps.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingApps.map((a) => a.id)));
    }
  };

  const callAdmin = async (body: Record<string, unknown>) => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (!session?.access_token) throw new Error("Session expired. Please log in again.");

    const response = await supabase.functions.invoke("admin-actions", {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const fnError = response.error as { message?: string; context?: Response };
      if (fnError.context) {
        try {
          const payload = await fnError.context.clone().json() as { error?: string };
          if (payload?.error) throw new Error(payload.error === "Unauthorized" ? "Session expired or unauthorized." : payload.error);
        } catch (e) { if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e; }
      }
      throw new Error(fnError.message || "Unable to complete admin action.");
    }
    const functionError = (response.data as { error?: string } | null)?.error;
    if (functionError) throw new Error(functionError);
    return response.data;
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      return await callAdmin({ action: "approve_merchant", applicationId: id, applicationUserId: userId });
    },
    onSuccess: () => {
      toast({ title: "Merchant approved" });
      queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await callAdmin({ action: "reject_merchant", applicationId: id, reason });
    },
    onSuccess: () => {
      toast({ title: "Merchant rejected" });
      setRejectDialog({ open: false, id: "" });
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkApprove = async () => {
    setBulkProcessing(true);
    const selectedApps = pendingApps.filter((a) => selected.has(a.id));
    let success = 0;
    let failed = 0;
    for (const app of selectedApps) {
      try {
        await callAdmin({ action: "approve_merchant", applicationId: app.id, applicationUserId: app.user_id });
        success++;
      } catch { failed++; }
    }
    toast({ title: `Bulk approve: ${success} approved, ${failed} failed` });
    setSelected(new Set());
    setBulkProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
  };

  const bulkReject = async () => {
    setBulkProcessing(true);
    const selectedIds = [...selected];
    let success = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await callAdmin({ action: "reject_merchant", applicationId: id, reason: bulkRejectReason });
        success++;
      } catch { failed++; }
    }
    toast({ title: `Bulk reject: ${success} rejected, ${failed} failed` });
    setSelected(new Set());
    setBulkRejectOpen(false);
    setBulkRejectReason("");
    setBulkProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-36 border-border/50 bg-card text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {pendingApps.length > 0 && statusFilter === "pending" && (
          <Button variant="outline" size="sm" onClick={toggleSelectAll} className="ml-auto gap-1.5 border-border/50 text-xs">
            <CheckSquare className="h-3.5 w-3.5" />
            {selected.size === pendingApps.length ? "Deselect All" : `Select All (${pendingApps.length})`}
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
          <span className="text-sm font-medium text-secondary">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-1" disabled={bulkProcessing}>
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Approve All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Bulk Approve</AlertDialogTitle>
                  <AlertDialogDescription>
                    Approve {selected.size} merchant application{selected.size > 1 ? "s" : ""}? This grants merchant access to all selected applicants.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={bulkApprove}>
                    Approve {selected.size}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="destructive" onClick={() => setBulkRejectOpen(true)} disabled={bulkProcessing} className="gap-1">
              <XCircle className="h-3.5 w-3.5" /> Reject All
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : !applications?.length ? (
        <p className="text-muted-foreground text-sm">No applications found.</p>
      ) : (
        applications.map((app) => (
          <Card key={app.id} className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {app.status === "pending" && (
                  <Checkbox
                    checked={selected.has(app.id)}
                    onCheckedChange={() => toggleSelect(app.id)}
                    className="border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                  />
                )}
                <div className="flex-1 flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">{app.business_name}</CardTitle>
                  <Badge variant={statusColor(app.status)}>{app.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-foreground/70"><span className="text-muted-foreground">Type:</span> {app.business_type || "—"}</p>
              <p className="text-foreground/70"><span className="text-muted-foreground">Reg No:</span> {app.business_registration_no || "—"}</p>
              <p className="text-foreground/70"><span className="text-muted-foreground">Bank:</span> {app.bank_name} — {app.bank_account_no} ({app.bank_account_holder})</p>
              <p className="text-foreground/70"><span className="text-muted-foreground">Address:</span> {app.business_address || "—"}</p>
              {app.rejection_reason && (
                <p className="text-destructive"><span className="text-muted-foreground">Reason:</span> {app.rejection_reason}</p>
              )}
              {app.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" disabled={approveMutation.isPending}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to approve <span className="font-semibold text-foreground">{app.business_name}</span>? This will grant them merchant access.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => approveMutation.mutate({ id: app.id, userId: app.user_id })}>
                          Approve
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, id: app.id })} disabled={rejectMutation.isPending}>
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Single reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog({ open: false, id: "" })}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <Textarea placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="border-border/50 bg-muted/30" />
          <DialogFooter>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason })} disabled={!rejectReason || rejectMutation.isPending}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reject dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={(o) => { if (!o) { setBulkRejectOpen(false); setBulkRejectReason(""); } }}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader><DialogTitle>Bulk Reject ({selected.size} applications)</DialogTitle></DialogHeader>
          <Textarea placeholder="Rejection reason for all selected..." value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} className="border-border/50 bg-muted/30" />
          <DialogFooter>
            <Button variant="destructive" onClick={bulkReject} disabled={!bulkRejectReason || bulkProcessing}>
              {bulkProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject {selected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantApprovals;
