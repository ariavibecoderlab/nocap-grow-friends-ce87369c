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
import MerchantTransactions from "@/components/merchant/MerchantTransactions";
import MerchantWithdrawals from "@/components/merchant/MerchantWithdrawals";
import BranchOwnerAssignment from "@/components/merchant/BranchOwnerAssignment";
import MerchantAnalytics from "@/components/merchant/MerchantAnalytics";
import MerchantSettlement from "@/components/merchant/MerchantSettlement";
import MerchantApiApps from "@/components/merchant/MerchantApiApps";
import MerchantApiLogs from "@/components/merchant/MerchantApiLogs";
import NotificationBell from "@/components/NotificationBell";
import NocapLogo from "@/components/NocapLogo";
import MerchantMarketplace from "@/components/merchant/MerchantMarketplace";
import MerchantChat from "@/components/merchant/MerchantChat";
import {
  ArrowLeft,
  Plus,
  Store,
  QrCode,
  MapPin,
  BarChart3,
  Loader2,
  Trash2,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";

const MerchantChatTab = ({ branchId }: { branchId: string }) => {
  const [storeId, setStoreId] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .from("marketplace_stores")
      .select("id")
      .eq("branch_id", branchId)
      .maybeSingle()
      .then(({ data }) => setStoreId(data?.id || null));
  }, [branchId]);

  if (!storeId) return <div className="text-center text-white/40 py-12 text-sm">No store found for this branch. Create a store in the Shop tab first.</div>;
  return <MerchantChat storeId={storeId} />;
};

interface Branch {
  id: string;
  branch_name: string;
  branch_address: string | null;
  commission_percent: number;
  is_active: boolean;
  qr_code_id: string;
  owner_user_id: string | null;
  balance: number;
}

interface DynamicQr {
  id: string;
  amount: number;
  description: string | null;
  is_used: boolean;
  created_at: string;
  expires_at: string | null;
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

const MerchantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [dynamicQrs, setDynamicQrs] = useState<DynamicQr[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // Add branch dialog
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [addingBranch, setAddingBranch] = useState(false);

  // Dynamic QR dialog
  const [showAddQr, setShowAddQr] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrDescription, setQrDescription] = useState("");
  const [qrExpiry, setQrExpiry] = useState("none");
  const [creatingQr, setCreatingQr] = useState(false);

  // QR display dialog
  const [showQrDisplay, setShowQrDisplay] = useState<{ type: "static" | "dynamic"; data: string; label: string } | null>(null);

  // Sales stats
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);

  // Deleting state
  const [deletingQr, setDeletingQr] = useState<string | null>(null);

  // Timer tick for expiry countdowns
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

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "merchant");

      if (!roles || roles.length === 0) {
        setIsMerchant(false);
        setLoadingData(false);
        return;
      }
      setIsMerchant(true);

      const { data: branchData } = await supabase
        .from("merchant_branches")
        .select("*")
        .eq("merchant_user_id", user.id)
        .order("created_at", { ascending: true });

      if (branchData) {
        setBranches(branchData);
        if (branchData.length > 0 && !selectedBranch) {
          setSelectedBranch(branchData[0]);
        }
      }

      const { data: allSales } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .eq("user_id", user.id)
        .eq("type", "top_up")
        .eq("status", "completed");

      if (allSales) {
        setTotalSales(allSales.reduce((s, t) => s + Number(t.amount), 0));
        const today = new Date().toISOString().split("T")[0];
        setTodaySales(
          allSales
            .filter((t) => t.created_at.startsWith(today))
            .reduce((s, t) => s + Number(t.amount), 0)
        );
      }

      setLoadingData(false);
    };
    fetchData();
  }, [user]);

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

  useEffect(() => {
    fetchDynamicQrs();
  }, [fetchDynamicQrs]);

  // Eager load chat unread count at dashboard level
  useEffect(() => {
    if (!selectedBranch) return;
    let storeIdLocal: string | null = null;

    const loadUnread = async () => {
      const { data: store } = await supabase
        .from("marketplace_stores")
        .select("id")
        .eq("branch_id", selectedBranch.id)
        .maybeSingle();
      storeIdLocal = store?.id || null;
      if (!storeIdLocal) return;

      const { count } = await supabase
        .from("marketplace_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeIdLocal)
        .eq("sender_type", "buyer");
      setChatUnread(count || 0);
    };
    loadUnread();

    // Realtime listener for new buyer messages
    const channel = supabase
      .channel(`chat-unread-eager-${selectedBranch.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_chat_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_type === "buyer" && storeIdLocal && msg.store_id === storeIdLocal) {
            setChatUnread((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedBranch]);

  // Realtime payment tracking
  useEffect(() => {
    if (!selectedBranch) return;
    const channel = supabase
      .channel(`qr-payments-${selectedBranch.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "merchant_qr_codes",
          filter: `branch_id=eq.${selectedBranch.id}`,
        },
        (payload) => {
          const updated = payload.new as DynamicQr;
          setDynamicQrs((prev) =>
            prev.map((qr) => (qr.id === updated.id ? updated : qr))
          );
          if (updated.is_used) {
            toast({ title: "Payment received!", description: `RM ${Number(updated.amount).toFixed(2)} paid` });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedBranch, toast]);

  const addBranch = async () => {
    if (!newBranchName.trim()) return;
    setAddingBranch(true);
    const { data, error } = await supabase
      .from("merchant_branches")
      .insert({
        merchant_user_id: user!.id,
        branch_name: newBranchName.trim(),
        branch_address: newBranchAddress.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setBranches((prev) => [...prev, data as Branch]);
      if (!selectedBranch) setSelectedBranch(data as Branch);
      setShowAddBranch(false);
      setNewBranchName("");
      setNewBranchAddress("");
      toast({ title: "Branch added!" });
    }
    setAddingBranch(false);
  };

  const createDynamicQr = async () => {
    if (!qrAmount || !selectedBranch) return;
    setCreatingQr(true);

    let expiresAt: string | null = null;
    if (qrExpiry !== "none") {
      const mins = parseInt(qrExpiry);
      expiresAt = new Date(Date.now() + mins * 60000).toISOString();
    }

    const { data, error } = await supabase
      .from("merchant_qr_codes")
      .insert({
        branch_id: selectedBranch.id,
        amount: Number(qrAmount),
        description: qrDescription.trim() || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setDynamicQrs((prev) => [data as DynamicQr, ...prev]);
      setShowAddQr(false);
      setQrAmount("");
      setQrDescription("");
      setQrExpiry("none");
      const qrData = JSON.stringify({ branch_id: selectedBranch.id, qr_id: (data as DynamicQr).id });
      setShowQrDisplay({ type: "dynamic", data: qrData, label: `RM ${Number(qrAmount).toFixed(2)}` });
    }
    setCreatingQr(false);
  };

  const deleteQr = async (qrId: string) => {
    setDeletingQr(qrId);
    const { error } = await supabase
      .from("merchant_qr_codes")
      .delete()
      .eq("id", qrId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDynamicQrs((prev) => prev.filter((q) => q.id !== qrId));
      toast({ title: "QR code deleted" });
    }
    setDeletingQr(null);
  };

  const showStaticQr = (branch: Branch) => {
    setShowQrDisplay({ type: "static", data: branch.qr_code_id, label: branch.branch_name });
  };

  const showDynamicQrCode = (qr: DynamicQr) => {
    if (!selectedBranch) return;
    const qrData = JSON.stringify({ branch_id: selectedBranch.id, qr_id: qr.id });
    setShowQrDisplay({ type: "dynamic", data: qrData, label: `RM ${Number(qr.amount).toFixed(2)}` });
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
      canvas.width = 600;
      canvas.height = 700;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 700);
      ctx.drawImage(img, 100, 40, 400, 400);

      // Label
      ctx.fillStyle = "#16a34a";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(showQrDisplay?.label || "", 300, 500);

      ctx.fillStyle = "#666666";
      ctx.font = "16px sans-serif";
      ctx.fillText(
        showQrDisplay?.type === "static" ? "Scan & enter amount" : "Amount pre-filled",
        300, 540
      );

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `qr-${showQrDisplay?.label || "code"}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const shareQr = async () => {
    if (!navigator.share) {
      toast({ title: "Sharing not supported on this device" });
      return;
    }
    try {
      await navigator.share({
        title: `Payment QR - ${showQrDisplay?.label}`,
        text: showQrDisplay?.type === "static"
          ? `Scan this QR to pay ${showQrDisplay?.label}`
          : `Pay RM ${showQrDisplay?.label} via QR code`,
      });
    } catch {
      // User cancelled share
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  if (!isMerchant) {
    return (
      <div className="min-h-screen bg-primary pb-20">
        <div className="px-4 pb-6 pt-8">
          <div className="mx-auto max-w-md flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-white">Merchant</h1>
          </div>
        </div>
        <div className="mx-auto max-w-md px-4 pt-8">
          <Card className="border-white/10 bg-white/5 shadow-2xl backdrop-blur">
            <CardContent className="flex flex-col items-center py-12">
              <Store className="h-12 w-12 text-white/30 mb-4" />
              <p className="font-display text-lg font-semibold text-white">Not a Merchant Yet</p>
              <p className="mt-2 text-sm text-white/50 text-center max-w-xs">
                Register as a merchant to start accepting payments and manage your business.
              </p>
              <Button className="mt-6 bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={() => navigate("/merchant/register")}>
                Apply Now
              </Button>
              <Button variant="ghost" size="sm" className="mt-2 text-white/50 hover:text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
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
      {/* Header */}
      <div className="px-4 pb-6 pt-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <NocapLogo size="sm" />
            <h1 className="font-display text-xl font-bold flex-1 text-white">Merchant Dashboard</h1>
            <NotificationBell className="text-white" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* Sales Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 text-center">
              <BarChart3 className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-xl font-bold text-white">RM {todaySales.toFixed(0)}</p>
              <p className="text-[10px] text-white/40">Today's Sales</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4 text-center">
              <BarChart3 className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 font-display text-xl font-bold text-white">RM {totalSales.toFixed(0)}</p>
              <p className="text-[10px] text-white/40">Total Sales</p>
            </CardContent>
          </Card>
        </div>

        {/* Branches */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Branches</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddBranch(true)} className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {branches.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center py-8 text-white/40">
              <Store className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No branches yet</p>
              <p className="text-xs mt-1">Add your first branch to start receiving payments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {branches.map((b) => (
              <Card
                key={b.id}
                className={`border-white/10 bg-white/5 cursor-pointer transition-all ${selectedBranch?.id === b.id ? 'ring-2 ring-secondary' : ''}`}
                onClick={() => setSelectedBranch(b)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                      <Store className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{b.branch_name}</p>
                      {b.branch_address && (
                        <p className="text-[10px] text-white/40 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {b.branch_address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); showStaticQr(b); }}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Selected Branch Details */}
        {selectedBranch && (
          <Tabs defaultValue="qr" className="mt-4">
            <TabsList className="w-full grid grid-cols-10 bg-white/5 border border-white/10">
              <TabsTrigger value="qr" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                <QrCode className="h-3 w-3" /> QR
              </TabsTrigger>
              <TabsTrigger value="shop" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Shop
              </TabsTrigger>
              <TabsTrigger value="chat" className="relative gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Chat
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="txns" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Txns
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Reports
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                API
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Logs
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-[10px] data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4 space-y-3">
              {/* Static QR */}
              <Card className="border-secondary/20 bg-secondary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Static QR Code</p>
                      <p className="text-[11px] text-white/40">Customer enters the amount</p>
                    </div>
                    <Button size="sm" onClick={() => showStaticQr(selectedBranch)} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold">
                      <QrCode className="h-3.5 w-3.5" /> Show
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic QRs */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Dynamic QR Codes</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddQr(true)} className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
              </div>

              {dynamicQrs.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">No dynamic QR codes yet. Create one with a pre-filled amount.</p>
              ) : (
                dynamicQrs.map((qr) => {
                  const status = getQrStatus(qr);
                  return (
                    <Card key={qr.id} className={`border-white/10 bg-white/5 ${status !== "active" ? 'opacity-60' : ''}`}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">RM {Number(qr.amount).toFixed(2)}</p>
                          {qr.description && <p className="text-[10px] text-white/40 truncate">{qr.description}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {status === "used" && (
                              <span className="text-[10px] text-secondary flex items-center gap-0.5">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </span>
                            )}
                            {status === "expired" && (
                              <span className="text-[10px] text-destructive flex items-center gap-0.5">
                                <XCircle className="h-3 w-3" /> Expired
                              </span>
                            )}
                            {status === "active" && qr.expires_at && (
                              <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                <Clock className="h-3 w-3" /> {formatTimeLeft(qr.expires_at)}
                              </span>
                            )}
                            {status === "active" && !qr.expires_at && (
                              <span className="text-[10px] text-white/40">Active</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {status === "active" && (
                            <Button size="sm" variant="ghost" className="text-white/50 hover:text-white hover:bg-white/10" onClick={() => showDynamicQrCode(qr)}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                          {!qr.is_used && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteQr(qr.id)}
                              disabled={deletingQr === qr.id}
                            >
                              {deletingQr === qr.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="shop" className="mt-4">
              <MerchantMarketplace branches={branches.map(b => ({ id: b.id, branch_name: b.branch_name }))} selectedBranchId={selectedBranch?.id || null} />
            </TabsContent>

            <TabsContent value="chat" className="mt-4">
              <MerchantChatTab branchId={selectedBranch.id} />
            </TabsContent>

            <TabsContent value="txns" className="mt-4">
              <MerchantTransactions userId={user!.id} branchId={selectedBranch.id} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <MerchantAnalytics userId={user!.id} branches={branches} />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <MerchantSettlement userId={user!.id} branches={branches} />
            </TabsContent>

            <TabsContent value="withdraw" className="mt-4">
              <MerchantWithdrawals userId={user!.id} />
            </TabsContent>

            <TabsContent value="api" className="mt-4">
              <MerchantApiApps branches={branches} />
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <MerchantApiLogs />
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Branch Name</span>
                    <span className="font-medium text-white">{selectedBranch.branch_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Commission Rate</span>
                    <span className="font-medium text-white">{selectedBranch.commission_percent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Status</span>
                    <span className={`font-medium ${selectedBranch.is_active ? 'text-secondary' : 'text-destructive'}`}>
                      {selectedBranch.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Branch Balance</span>
                    <span className="font-medium text-white">RM {Number((selectedBranch as any).balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">QR Code ID</span>
                    <span className="font-mono text-xs text-white/70">{selectedBranch.qr_code_id.slice(0, 8)}...</span>
                  </div>
                </CardContent>
              </Card>

              {/* Branch Owner Assignment */}
              <BranchOwnerAssignment
                branchId={selectedBranch.id}
                currentOwnerId={(selectedBranch as any).owner_user_id}
                onAssigned={() => {
                  // Refresh branches
                  supabase
                    .from("merchant_branches")
                    .select("*")
                    .eq("merchant_user_id", user!.id)
                    .order("created_at", { ascending: true })
                    .then(({ data }) => {
                      if (data) {
                        setBranches(data as Branch[]);
                        const updated = data.find((b: any) => b.id === selectedBranch.id);
                        if (updated) setSelectedBranch(updated as Branch);
                      }
                    });
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Add Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Branch Name *</Label>
              <Input placeholder="e.g. Main Outlet" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Address</Label>
              <Input placeholder="Branch address" value={newBranchAddress} onChange={(e) => setNewBranchAddress(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={addBranch} disabled={addingBranch || !newBranchName.trim()}>
              {addingBranch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dynamic QR Dialog */}
      <Dialog open={showAddQr} onOpenChange={setShowAddQr}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Create Dynamic QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={qrAmount} onChange={(e) => setQrAmount(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Description</Label>
              <Input placeholder="e.g. Table 5 order" value={qrDescription} onChange={(e) => setQrDescription(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Expiry</Label>
              <Select value={qrExpiry} onValueChange={setQrExpiry}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10 text-white">
                  <SelectItem value="none">No expiry</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={createDynamicQr} disabled={creatingQr || !qrAmount}>
              {creatingQr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Display Dialog */}
      <Dialog open={!!showQrDisplay} onOpenChange={() => setShowQrDisplay(null)}>
        <DialogContent className="max-w-xs bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-center text-white">
              {showQrDisplay?.type === "static" ? "Static QR" : "Dynamic QR"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div ref={qrRef} className="rounded-xl bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={showQrDisplay?.data || ""}
                size={200}
                level="M"
                fgColor="hsl(157, 72%, 40%)"
              />
            </div>
            <p className="mt-3 font-display text-lg font-bold text-secondary">{showQrDisplay?.label}</p>
            <p className="text-xs text-white/40 mt-1">
              {showQrDisplay?.type === "static" ? "Customer scans and enters amount" : "Amount is pre-filled for customer"}
            </p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={downloadQr} className="gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" onClick={shareQr} className="gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MerchantDashboard;
