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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, CheckSquare, Eye, Building2, User, Landmark, FileText, ExternalLink, Download, Calendar, MapPin, Phone, Mail, GitBranch, Store, CircleDot } from "lucide-react";
import { format } from "date-fns";

interface MerchantApp {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string | null;
  business_registration_no: string | null;
  business_address: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_holder: string | null;
  bank_verified: boolean;
  document_urls: Array<{ name: string; path: string }> | null;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  min_withdrawal_amount: number | null;
}

interface ProfileInfo {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface BranchInfo {
  id: string;
  branch_name: string;
  branch_address: string | null;
  commission_percent: number;
  balance: number;
  is_active: boolean;
  created_at: string;
}

interface StoreInfo {
  id: string;
  store_name: string;
  slug: string;
  status: string;
  branch_id: string;
  created_at: string;
}

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
  const [detailApp, setDetailApp] = useState<MerchantApp | null>(null);
  const [detailProfile, setDetailProfile] = useState<ProfileInfo | null>(null);
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [docPreview, setDocPreview] = useState<{ url: string; name: string } | null>(null);
  const [detailBranches, setDetailBranches] = useState<BranchInfo[]>([]);
  const [detailStores, setDetailStores] = useState<StoreInfo[]>([]);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["merchant_applications", statusFilter],
    queryFn: async () => {
      let q = supabase.from("merchant_applications").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as MerchantApp[];
    },
  });

  const pendingApps = applications?.filter((a) => a.status === "pending") || [];

  const openDetail = async (app: MerchantApp) => {
    setDetailApp(app);
    setDetailLoading(true);
    setDetailProfile(null);
    setDetailEmail(null);
    setDetailBranches([]);
    setDetailStores([]);

    // Fetch profile, email, branches, stores in parallel
    const [profileRes, emailRes, branchesRes, storesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, avatar_url").eq("user_id", app.user_id).single(),
      supabase.rpc("get_all_user_emails").then(({ data }) => {
        const found = (data as Array<{ user_id: string; email: string }> | null)?.find((e) => e.user_id === app.user_id);
        return found?.email || null;
      }),
      supabase.from("merchant_branches").select("id, branch_name, branch_address, commission_percent, balance, is_active, created_at").eq("merchant_user_id", app.user_id).order("created_at", { ascending: false }),
      supabase.from("marketplace_stores").select("id, store_name, slug, status, branch_id, created_at").eq("merchant_user_id", app.user_id).order("created_at", { ascending: false }),
    ]);

    setDetailProfile(profileRes.data as ProfileInfo | null);
    setDetailEmail(emailRes);
    setDetailBranches((branchesRes.data as BranchInfo[]) || []);
    setDetailStores((storesRes.data as StoreInfo[]) || []);
    setDetailLoading(false);
  };

  const getDocumentUrl = (path: string) => {
    const { data } = supabase.storage.from("merchant-documents").getPublicUrl(path);
    return data?.publicUrl || "";
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("merchant-documents").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const handleViewDoc = async (doc: { name: string; path: string }) => {
    const url = await getSignedUrl(doc.path);
    if (url) setDocPreview({ url, name: doc.name });
  };

  const handleDownloadDoc = async (doc: { name: string; path: string }) => {
    const url = await getSignedUrl(doc.path);
    if (url) window.open(url, "_blank");
  };

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
      setDetailApp(null);
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
      setDetailApp(null);
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
    if (s === "approved") return "default" as const;
    if (s === "rejected") return "destructive" as const;
    return "secondary" as const;
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);

  const docs = (detailApp?.document_urls || []) as Array<{ name: string; path: string }>;

  return (
    <div className="space-y-4 mt-4">
      {/* Filter & select bar */}
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

      {/* Application cards */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : !applications?.length ? (
        <p className="text-muted-foreground text-sm">No applications found.</p>
      ) : (
        applications.map((app) => (
          <Card
            key={app.id}
            className="border-border/50 bg-card cursor-pointer hover:border-secondary/40 transition-colors group"
            onClick={() => openDetail(app)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {app.status === "pending" && (
                  <Checkbox
                    checked={selected.has(app.id)}
                    onCheckedChange={() => toggleSelect(app.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                  />
                )}
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-foreground group-hover:text-secondary transition-colors">{app.business_name}</CardTitle>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge variant={statusColor(app.status)}>{app.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-foreground/70"><span className="text-muted-foreground">Type:</span> {app.business_type || "—"}</p>
              <p className="text-foreground/70"><span className="text-muted-foreground">Reg No:</span> {app.business_registration_no || "—"}</p>
              <p className="text-foreground/70">
                <span className="text-muted-foreground">Applied:</span> {format(new Date(app.created_at), "dd MMM yyyy, HH:mm")}
              </p>
              {app.rejection_reason && (
                <p className="text-destructive"><span className="text-muted-foreground">Reason:</span> {app.rejection_reason}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* ═══════ DETAIL DIALOG ═══════ */}
      <Dialog open={!!detailApp} onOpenChange={(o) => { if (!o) { setDetailApp(null); setDocPreview(null); } }}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailApp && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-secondary" />
                    {detailApp.business_name}
                  </DialogTitle>
                  <Badge variant={statusColor(detailApp.status)} className="text-xs">{detailApp.status}</Badge>
                </div>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-secondary" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Applicant Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-1.5 mb-2">
                      <User className="h-4 w-4" /> Applicant
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-muted/20 rounded-lg p-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Name</span>
                        <p className="text-foreground font-medium">{detailProfile?.full_name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                        <p className="text-foreground font-medium">{detailEmail || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                        <p className="text-foreground font-medium">{detailProfile?.phone || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Applied</span>
                        <p className="text-foreground font-medium">{format(new Date(detailApp.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Business Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-1.5 mb-2">
                      <Building2 className="h-4 w-4" /> Business Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-muted/20 rounded-lg p-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Business Name</span>
                        <p className="text-foreground font-medium">{detailApp.business_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Business Type</span>
                        <p className="text-foreground font-medium">{detailApp.business_type || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Registration No</span>
                        <p className="text-foreground font-medium">{detailApp.business_registration_no || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</span>
                        <p className="text-foreground font-medium">{detailApp.business_address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Bank Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-1.5 mb-2">
                      <Landmark className="h-4 w-4" /> Bank Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-muted/20 rounded-lg p-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Bank Name</span>
                        <p className="text-foreground font-medium">{detailApp.bank_name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Account No</span>
                        <p className="text-foreground font-medium font-mono">{detailApp.bank_account_no || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Account Holder</span>
                        <p className="text-foreground font-medium">{detailApp.bank_account_holder || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Bank Verified</span>
                        <Badge variant={detailApp.bank_verified ? "default" : "secondary"} className="mt-0.5">
                          {detailApp.bank_verified ? "Verified" : "Not Verified"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Branches */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-1.5 mb-2">
                      <GitBranch className="h-4 w-4" /> Branches ({detailBranches.length})
                    </h4>
                    {detailBranches.length === 0 ? (
                      <p className="text-muted-foreground text-sm bg-muted/20 rounded-lg p-3">No branches created yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailBranches.map((branch) => (
                          <div key={branch.id} className="bg-muted/20 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground flex items-center gap-1.5">
                                <CircleDot className={`h-3 w-3 ${branch.is_active ? "text-green-500" : "text-muted-foreground"}`} />
                                {branch.branch_name}
                              </span>
                              <Badge variant={branch.is_active ? "default" : "secondary"} className="text-[10px]">
                                {branch.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1.5 text-xs text-muted-foreground">
                              <span>Commission: <span className="text-foreground font-medium">{branch.commission_percent}%</span></span>
                              <span>Balance: <span className="text-foreground font-medium">RM {Number(branch.balance).toFixed(2)}</span></span>
                              {branch.branch_address && (
                                <span className="col-span-2 sm:col-span-1 truncate" title={branch.branch_address}>
                                  <MapPin className="h-3 w-3 inline mr-0.5" />{branch.branch_address}
                                </span>
                              )}
                            </div>
                            {/* Stores under this branch */}
                            {detailStores.filter((s) => s.branch_id === branch.id).length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-secondary/30 space-y-1">
                                {detailStores.filter((s) => s.branch_id === branch.id).map((store) => (
                                  <div key={store.id} className="flex items-center justify-between text-xs">
                                    <span className="text-foreground flex items-center gap-1">
                                      <Store className="h-3 w-3 text-secondary" /> {store.store_name}
                                      <span className="text-muted-foreground">/{store.slug}</span>
                                    </span>
                                    <Badge variant={store.status === "live" ? "default" : "secondary"} className="text-[10px]">
                                      {store.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Documents */}
                  <div>
                    <h4 className="text-sm font-semibold text-secondary flex items-center gap-1.5 mb-2">
                      <FileText className="h-4 w-4" /> Uploaded Documents ({docs.length})
                    </h4>
                    {docs.length === 0 ? (
                      <p className="text-muted-foreground text-sm bg-muted/20 rounded-lg p-3">No documents uploaded.</p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map((doc, i) => (
                          <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3 group/doc">
                            <div className="shrink-0">
                              {isImageFile(doc.name) ? (
                                <div className="h-12 w-12 rounded border border-border/50 overflow-hidden bg-muted/30">
                                  <img
                                    src={getDocumentUrl(doc.path)}
                                    alt={doc.name}
                                    className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                    onClick={() => handleViewDoc(doc)}
                                  />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded border border-border/50 flex items-center justify-center bg-muted/30">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{isImageFile(doc.name) ? "Image" : "Document"}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-secondary"
                                onClick={() => handleViewDoc(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-secondary"
                                onClick={() => handleDownloadDoc(doc)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Document Preview */}
                  {docPreview && (
                    <>
                      <Separator className="bg-border/30" />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-secondary">Preview: {docPreview.name}</h4>
                          <Button size="sm" variant="ghost" onClick={() => setDocPreview(null)} className="text-xs text-muted-foreground">
                            Close Preview
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/10">
                          {isImageFile(docPreview.name) ? (
                            <img src={docPreview.url} alt={docPreview.name} className="w-full max-h-[400px] object-contain" />
                          ) : (
                            <iframe src={docPreview.url} className="w-full h-[400px]" title={docPreview.name} />
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Rejection reason (if rejected) */}
                  {detailApp.rejection_reason && (
                    <>
                      <Separator className="bg-border/30" />
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                        <p className="text-sm font-semibold text-destructive mb-1">Rejection Reason</p>
                        <p className="text-sm text-foreground/80">{detailApp.rejection_reason}</p>
                        {detailApp.reviewed_at && (
                          <p className="text-xs text-muted-foreground mt-1">Rejected on {format(new Date(detailApp.reviewed_at), "dd MMM yyyy, HH:mm")}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Action buttons */}
                  {detailApp.status === "pending" && (
                    <DialogFooter className="gap-2 sm:gap-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-1.5" disabled={approveMutation.isPending}>
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Approve Merchant
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border/50 max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to approve <span className="font-semibold text-foreground">{detailApp.business_name}</span>? This will grant them merchant access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                              onClick={() => approveMutation.mutate({ id: detailApp.id, userId: detailApp.user_id })}
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="destructive"
                        onClick={() => { setDetailApp(null); setRejectDialog({ open: true, id: detailApp.id }); }}
                        disabled={rejectMutation.isPending}
                        className="gap-1.5"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </DialogFooter>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

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
