import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import NotificationBell from "@/components/NotificationBell";
import { formatRM } from "@/lib/currency";
import NocapLogo from "@/components/NocapLogo";
import BranchSalesSummary from "@/components/branch/BranchSalesSummary";
import BranchTransactionSearch from "@/components/branch/BranchTransactionSearch";
import {
  ArrowLeft, Plus, Store, QrCode, BarChart3, Loader2, Trash2, Download, Share2,
  Clock, CheckCircle2, XCircle, Wallet, ArrowDownToLine,
} from "lucide-react";

interface Branch {
  id: string;
  branch_name: string;
  branch_address: string | null;
  commission_percent: number;
  is_active: boolean;
  qr_code_id: string;
  balance: number;
  merchant_user_id: string;
}

interface DynamicQr {
  id: string;
  amount: number;
  description: string | null;
  is_used: boolean;
  created_at: string;
  expires_at: string | null;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

function getQrStatus(qr: DynamicQr): "used" | "expired" | "active" {
  if (qr.is_used) return "used";
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return "expired";
  return "active";
}

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m left`;
  return `${mins}m left`;
}

const BranchDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [dynamicQrs, setDynamicQrs] = useState<DynamicQr[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isBranchOwner, setIsBranchOwner] = useState(false);

  // QR dialog
  const [showAddQr, setShowAddQr] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrDescription, setQrDescription] = useState("");
  const [qrExpiry, setQrExpiry] = useState("none");
  const [creatingQr, setCreatingQr] = useState(false);
  const [showQrDisplay, setShowQrDisplay] = useState<{ type: "static" | "dynamic"; data: string; label: string } | null>(null);
  const [deletingQr, setDeletingQr] = useState<string | null>(null);

  // Sales stats
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingData(true);

      // Check branch role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "branch");

      if (!roles || roles.length === 0) {
        setIsBranchOwner(false);
        setLoadingData(false);
        return;
      }
      setIsBranchOwner(true);

      // Fetch branches owned by this user
      const { data: branchData } = await supabase
        .from("merchant_branches")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: true });

      if (branchData) {
        setBranches(branchData as Branch[]);
        if (branchData.length > 0 && !selectedBranch) {
          setSelectedBranch(branchData[0] as Branch);
        }
      }

      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  // Fetch branch-specific transactions for sales stats + branch wallet balance
  useEffect(() => {
    if (!selectedBranch || !user) return;
    const fetchSales = async () => {
      const [{ data: txns }, { data: branchWallet }] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount, created_at")
          .eq("user_id", selectedBranch.merchant_user_id)
          .eq("type", "top_up")
          .eq("status", "completed")
          .contains("metadata", { branch_id: selectedBranch.id }),
        supabase
          .from("wallets")
          .select("balance")
          .eq("wallet_type", "branch")
          .eq("branch_id", selectedBranch.id)
          .maybeSingle(),
      ]);

      if (txns) {
        setTotalSales(txns.reduce((s, t) => s + Number(t.amount), 0));
        const today = new Date().toISOString().split("T")[0];
        setTodaySales(
          txns.filter((t) => t.created_at.startsWith(today)).reduce((s, t) => s + Number(t.amount), 0)
        );
      }
      // Update branch balance from wallets table
      if (branchWallet && selectedBranch) {
        setSelectedBranch(prev => prev ? { ...prev, balance: Number(branchWallet.balance) } : prev);
      }
    };
    fetchSales();
  }, [selectedBranch?.id, user]);

  // Fetch withdrawals for selected branch
  useEffect(() => {
    if (!selectedBranch || !user) return;
    const fetchWithdrawals = async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id, amount, status, rejection_reason, created_at")
        .eq("user_id", user.id)
        .eq("branch_id", selectedBranch.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setWithdrawals(data);
    };
    fetchWithdrawals();
  }, [selectedBranch, user]);

  const fetchDynamicQrs = useCallback(async () => {
    if (!selectedBranch) return;
    const { data } = await supabase
      .from("merchant_qr_codes")
      .select("*")
      .eq("branch_id", selectedBranch.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setDynamicQrs(data as DynamicQr[]);
  }, [selectedBranch]);

  useEffect(() => { fetchDynamicQrs(); }, [fetchDynamicQrs]);

  // Realtime QR updates
  useEffect(() => {
    if (!selectedBranch) return;
    const channel = supabase
      .channel(`branch-qr-${selectedBranch.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "merchant_qr_codes", filter: `branch_id=eq.${selectedBranch.id}` },
        (payload) => {
          const updated = payload.new as DynamicQr;
          setDynamicQrs((prev) => prev.map((qr) => (qr.id === updated.id ? updated : qr)));
          if (updated.is_used) toast({ title: "Payment received!", description: `RM ${Number(updated.amount).toFixed(2)} paid` });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedBranch, toast]);

  const createDynamicQr = async () => {
    if (!qrAmount || !selectedBranch) return;
    setCreatingQr(true);
    let expiresAt: string | null = null;
    if (qrExpiry !== "none") expiresAt = new Date(Date.now() + parseInt(qrExpiry) * 60000).toISOString();

    const { data, error } = await supabase
      .from("merchant_qr_codes")
      .insert({ branch_id: selectedBranch.id, amount: Number(qrAmount), description: qrDescription.trim() || null, expires_at: expiresAt })
      .select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else if (data) {
      setDynamicQrs((prev) => [data as DynamicQr, ...prev]);
      setShowAddQr(false); setQrAmount(""); setQrDescription(""); setQrExpiry("none");
      const qrData = JSON.stringify({ branch_id: selectedBranch.id, qr_id: (data as DynamicQr).id });
      setShowQrDisplay({ type: "dynamic", data: qrData, label: `RM ${Number(qrAmount).toFixed(2)}` });
    }
    setCreatingQr(false);
  };

  const deleteQr = async (qrId: string) => {
    setDeletingQr(qrId);
    const { error } = await supabase.from("merchant_qr_codes").delete().eq("id", qrId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setDynamicQrs((prev) => prev.filter((q) => q.id !== qrId)); toast({ title: "QR code deleted" }); }
    setDeletingQr(null);
  };

  const showStaticQr = (branch: Branch) => {
    setShowQrDisplay({ type: "static", data: branch.qr_code_id, label: branch.branch_name });
  };

  const showDynamicQrCode = (qr: DynamicQr) => {
    if (!selectedBranch) return;
    setShowQrDisplay({ type: "dynamic", data: JSON.stringify({ branch_id: selectedBranch.id, qr_id: qr.id }), label: `RM ${Number(qr.amount).toFixed(2)}` });
  };

  const downloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 600; canvas.height = 700;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 600, 700);
      ctx.drawImage(img, 100, 40, 400, 400);
      ctx.fillStyle = "#16a34a"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(showQrDisplay?.label || "", 300, 500);
      ctx.fillStyle = "#666666"; ctx.font = "16px sans-serif";
      ctx.fillText(showQrDisplay?.type === "static" ? "Scan & enter amount" : "Amount pre-filled", 300, 540);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `qr-${showQrDisplay?.label || "code"}.png`; a.click(); URL.revokeObjectURL(a.href);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const submitWithdrawal = async () => {
    if (!selectedBranch || !user) return;
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (amt > selectedBranch.balance) { toast({ title: "Insufficient branch balance", variant: "destructive" }); return; }

    setSubmittingWithdraw(true);

    // Get bank details from merchant application
    const { data: app } = await supabase
      .from("merchant_applications")
      .select("bank_name, bank_account_no, bank_account_holder")
      .eq("user_id", selectedBranch.merchant_user_id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    // Get branch owner's profile for bank details (or use merchant's)
    const bankName = app?.bank_name || "N/A";
    const bankAccountNo = app?.bank_account_no || "N/A";
    const bankAccountHolder = app?.bank_account_holder || "N/A";

    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      amount: amt,
      bank_name: bankName,
      bank_account_no: bankAccountNo,
      bank_account_holder: bankAccountHolder,
      branch_id: selectedBranch.id,
      wallet_type: "branch",
    });

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Withdrawal requested", description: "Admin will review your request." });
      setWithdrawAmount(""); setShowWithdrawForm(false);
      // Refresh withdrawals
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id, amount, status, rejection_reason, created_at")
        .eq("user_id", user.id)
        .eq("branch_id", selectedBranch.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setWithdrawals(data);
    }
    setSubmittingWithdraw(false);
  };

  const hasPending = withdrawals.some((w) => w.status === "pending");

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!isBranchOwner) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pb-6 pt-8">
          <div className="mx-auto max-w-md flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-white">Branch</h1>
          </div>
        </div>
        <div className="mx-auto max-w-md px-4 pt-8">
          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardContent className="flex flex-col items-center py-12">
              <Store className="h-12 w-12 text-white/30 mb-4" />
              <p className="font-display text-lg font-semibold text-white">No Branch Assigned</p>
              <p className="mt-2 text-sm text-white/50 text-center max-w-xs">
                You haven't been assigned as a branch owner yet. Ask your merchant to assign you.
              </p>
              <Button variant="ghost" size="sm" className="mt-4 text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <NocapLogo size="sm" />
          <h1 className="font-display text-xl font-bold flex-1 text-white">Branch Dashboard</h1>
          <NotificationBell className="text-white" branchId={selectedBranch?.id} />
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Branch Selector */}
        {branches.length > 1 && (
          <div className="space-y-2">
            {branches.map((b) => (
              <Card key={b.id} className={`border-white/10 bg-white/5 cursor-pointer transition-all ${selectedBranch?.id === b.id ? 'ring-2 ring-secondary' : ''}`}
                onClick={() => setSelectedBranch(b)}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-secondary" />
                    <p className="text-sm font-medium text-white">{b.branch_name}</p>
                  </div>
                  <p className="text-xs text-white/40">{formatRM(b.balance)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedBranch && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 text-center">
                  <p className="font-display text-lg font-bold text-white">{formatRM(selectedBranch.balance)}</p>
                  <p className="text-[10px] text-white/40">Branch Balance</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 text-center">
                  <p className="font-display text-lg font-bold text-white">{formatRM(todaySales)}</p>
                  <p className="text-[10px] text-white/40">Today</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 text-center">
                  <p className="font-display text-lg font-bold text-white">{formatRM(totalSales)}</p>
                  <p className="text-[10px] text-white/40">Total</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="summary" className="mt-4">
              <TabsList className="w-full grid grid-cols-4 bg-white/5 border border-white/10">
                <TabsTrigger value="summary" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Summary</TabsTrigger>
                <TabsTrigger value="qr" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50"><QrCode className="h-3 w-3" /> QR</TabsTrigger>
                <TabsTrigger value="search" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">Search</TabsTrigger>
                <TabsTrigger value="withdraw" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50"><Wallet className="h-3 w-3" /> Withdraw</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <BranchSalesSummary branchId={selectedBranch.id} merchantUserId={selectedBranch.merchant_user_id} />
              </TabsContent>

              <TabsContent value="qr" className="mt-4 space-y-3">
                {/* Static QR */}
                <Card className="border-secondary/20 bg-secondary/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Static QR Code</p>
                      <p className="text-[11px] text-white/40">Customer enters amount</p>
                    </div>
                    <Button size="sm" onClick={() => showStaticQr(selectedBranch)} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold">
                      <QrCode className="h-3.5 w-3.5" /> Show
                    </Button>
                  </CardContent>
                </Card>

                {/* Dynamic QRs */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Dynamic QR Codes</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddQr(true)} className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"><Plus className="h-3.5 w-3.5" /> Create</Button>
                </div>
                {dynamicQrs.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">No dynamic QR codes yet.</p>
                ) : dynamicQrs.map((qr) => {
                  const status = getQrStatus(qr);
                  return (
                    <Card key={qr.id} className={`border-white/10 bg-white/5 ${status !== "active" ? 'opacity-60' : ''}`}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">RM {Number(qr.amount).toFixed(2)}</p>
                          {qr.description && <p className="text-[10px] text-white/40 truncate">{qr.description}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {status === "used" && <span className="text-[10px] text-secondary flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Paid</span>}
                            {status === "expired" && <span className="text-[10px] text-destructive flex items-center gap-0.5"><XCircle className="h-3 w-3" /> Expired</span>}
                            {status === "active" && qr.expires_at && <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><Clock className="h-3 w-3" /> {formatTimeLeft(qr.expires_at)}</span>}
                            {status === "active" && !qr.expires_at && <span className="text-[10px] text-white/40">Active</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {status === "active" && <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => showDynamicQrCode(qr)}><QrCode className="h-4 w-4" /></Button>}
                          {!qr.is_used && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-white/10" onClick={() => deleteQr(qr.id)} disabled={deletingQr === qr.id}>
                              {deletingQr === qr.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <BranchTransactionSearch branchId={selectedBranch.id} merchantUserId={selectedBranch.merchant_user_id} />
              </TabsContent>

              <TabsContent value="withdraw" className="mt-4 space-y-3">
                <Card className="border-secondary/20 bg-secondary/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40">Branch Balance</p>
                      <p className="text-xl font-bold font-display text-white">{formatRM(selectedBranch.balance)}</p>
                    </div>
                    <Button size="sm" onClick={() => setShowWithdrawForm(true)} disabled={hasPending} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold">
                      <ArrowDownToLine className="h-3.5 w-3.5" /> Withdraw
                    </Button>
                  </CardContent>
                </Card>

                {hasPending && <p className="text-xs text-amber-500 text-center">You have a pending withdrawal request.</p>}

                {withdrawals.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-6">No withdrawal requests yet.</p>
                ) : withdrawals.map((w) => (
                  <Card key={w.id} className="border-white/10 bg-white/5">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {w.status === "approved" ? <CheckCircle2 className="h-4 w-4 text-secondary" /> :
                         w.status === "rejected" ? <XCircle className="h-4 w-4 text-destructive" /> :
                         <Clock className="h-4 w-4 text-amber-500" />}
                        <p className="text-sm font-semibold text-white">RM {Number(w.amount).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-medium capitalize ${w.status === "approved" ? "text-secondary" : w.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>
                          {w.status}
                        </span>
                        <p className="text-[10px] text-white/40">{new Date(w.created_at).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                    {w.rejection_reason && <p className="text-[10px] text-destructive px-3 pb-2">{w.rejection_reason}</p>}
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Create QR Dialog */}
      <Dialog open={showAddQr} onOpenChange={setShowAddQr}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader><DialogTitle className="font-display text-white">Create Dynamic QR</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-white/70">Amount (RM) *</Label><Input type="number" inputMode="decimal" placeholder="0.00" value={qrAmount} onChange={(e) => setQrAmount(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" /></div>
            <div className="space-y-1"><Label className="text-white/70">Description</Label><Input placeholder="e.g. Table 5" value={qrDescription} onChange={(e) => setQrDescription(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" /></div>
            <div className="space-y-1">
              <Label className="text-white/70">Expiry</Label>
              <Select value={qrExpiry} onValueChange={setQrExpiry}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No expiry</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={createDynamicQr} disabled={creatingQr || !qrAmount}>
              {creatingQr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Display Dialog */}
      <Dialog open={!!showQrDisplay} onOpenChange={() => setShowQrDisplay(null)}>
        <DialogContent className="max-w-xs bg-primary border-white/10">
          <DialogHeader><DialogTitle className="font-display text-center text-white">{showQrDisplay?.type === "static" ? "Static QR" : "Dynamic QR"}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div ref={qrRef} className="rounded-xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={showQrDisplay?.data || ""} size={200} level="M" fgColor="hsl(157, 72%, 40%)" />
            </div>
            <p className="mt-3 font-display text-lg font-bold text-secondary">{showQrDisplay?.label}</p>
            <p className="text-xs text-white/40 mt-1">{showQrDisplay?.type === "static" ? "Customer scans and enters amount" : "Amount is pre-filled"}</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={downloadQr} className="gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"><Download className="h-3.5 w-3.5" /> Download</Button>
              <Button size="sm" variant="outline" onClick={async () => { try { await navigator.share({ title: `Payment QR - ${showQrDisplay?.label}`, text: `Pay via QR code` }); } catch {} }} className="gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"><Share2 className="h-3.5 w-3.5" /> Share</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Form Dialog */}
      <Dialog open={showWithdrawForm} onOpenChange={setShowWithdrawForm}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2 text-white"><Wallet className="h-5 w-5" /> Withdraw from Branch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
              <p className="text-[10px] text-white/40">Available: RM {Number(selectedBranch?.balance || 0).toFixed(2)}</p>
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={submitWithdrawal} disabled={submittingWithdraw}>
              {submittingWithdraw ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default BranchDashboard;
