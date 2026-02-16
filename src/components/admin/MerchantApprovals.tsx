import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle } from "lucide-react";

const MerchantApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

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

  const approveMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "approve_merchant", applicationId: id, applicationUserId: userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Merchant approved" });
      queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "reject_merchant", applicationId: id, reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Merchant rejected" });
      setRejectDialog({ open: false, id: "" });
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["merchant_applications"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white/40">Filter:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-white/40 text-sm">Loading...</p>
      ) : !applications?.length ? (
        <p className="text-white/40 text-sm">No applications found.</p>
      ) : (
        applications.map((app) => (
          <Card key={app.id} className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">{app.business_name}</CardTitle>
                <Badge variant={statusColor(app.status)}>{app.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-white/70"><span className="text-white/40">Type:</span> {app.business_type || "—"}</p>
              <p className="text-white/70"><span className="text-white/40">Reg No:</span> {app.business_registration_no || "—"}</p>
              <p className="text-white/70"><span className="text-white/40">Bank:</span> {app.bank_name} — {app.bank_account_no} ({app.bank_account_holder})</p>
              <p className="text-white/70"><span className="text-white/40">Address:</span> {app.business_address || "—"}</p>
              {app.rejection_reason && (
                <p className="text-destructive"><span className="text-white/40">Reason:</span> {app.rejection_reason}</p>
              )}
              {app.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => approveMutation.mutate({ id: app.id, userId: app.user_id })} disabled={approveMutation.isPending}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, id: app.id })} disabled={rejectMutation.isPending}>
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog({ open: false, id: "" })}>
        <DialogContent className="bg-primary border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="text-white">Reject Application</DialogTitle></DialogHeader>
          <Textarea placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
          <DialogFooter>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason })} disabled={!rejectReason || rejectMutation.isPending}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantApprovals;
