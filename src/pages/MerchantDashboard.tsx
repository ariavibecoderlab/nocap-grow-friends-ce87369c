import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Plus,
  Store,
  QrCode,
  MapPin,
  BarChart3,
  Loader2,
  Trash2,
  Copy,
} from "lucide-react";

interface Branch {
  id: string;
  branch_name: string;
  branch_address: string | null;
  commission_percent: number;
  is_active: boolean;
  qr_code_id: string;
}

interface DynamicQr {
  id: string;
  amount: number;
  description: string | null;
  is_used: boolean;
  created_at: string;
}

const MerchantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [dynamicQrs, setDynamicQrs] = useState<DynamicQr[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);

  // Add branch dialog
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [addingBranch, setAddingBranch] = useState(false);

  // Dynamic QR dialog
  const [showAddQr, setShowAddQr] = useState(false);
  const [qrAmount, setQrAmount] = useState("");
  const [qrDescription, setQrDescription] = useState("");
  const [creatingQr, setCreatingQr] = useState(false);

  // QR display dialog
  const [showQrDisplay, setShowQrDisplay] = useState<{ type: "static" | "dynamic"; data: string; label: string } | null>(null);

  // Sales stats
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoadingData(true);

      // Check merchant role
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

      // Fetch branches
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

      // Sales totals
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

  useEffect(() => {
    if (!selectedBranch) return;
    supabase
      .from("merchant_qr_codes")
      .select("*")
      .eq("branch_id", selectedBranch.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setDynamicQrs(data as DynamicQr[]); });
  }, [selectedBranch]);

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
    const { data, error } = await supabase
      .from("merchant_qr_codes")
      .insert({
        branch_id: selectedBranch.id,
        amount: Number(qrAmount),
        description: qrDescription.trim() || null,
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
      // Show the QR immediately
      const qrData = JSON.stringify({ branch_id: selectedBranch.id, qr_id: (data as DynamicQr).id });
      setShowQrDisplay({ type: "dynamic", data: qrData, label: `RM ${Number(qrAmount).toFixed(2)}` });
    }
    setCreatingQr(false);
  };

  const showStaticQr = (branch: Branch) => {
    setShowQrDisplay({ type: "static", data: branch.qr_code_id, label: branch.branch_name });
  };

  const showDynamicQrCode = (qr: DynamicQr) => {
    if (!selectedBranch) return;
    const qrData = JSON.stringify({ branch_id: selectedBranch.id, qr_id: qr.id });
    setShowQrDisplay({ type: "dynamic", data: qrData, label: `RM ${Number(qr.amount).toFixed(2)}` });
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isMerchant) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary px-4 pb-6 pt-8 text-primary-foreground">
          <div className="mx-auto max-w-md flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">Merchant</h1>
          </div>
        </div>
        <div className="mx-auto max-w-md px-4 pt-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center py-12">
              <Store className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <p className="font-display text-lg font-semibold">Not a Merchant</p>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
                You need to apply and be approved as a merchant to access this dashboard. Contact admin for more info.
              </p>
              <Button className="mt-6" onClick={() => navigate("/dashboard")}>
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-6 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">Merchant Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
        {/* Sales Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <BarChart3 className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-1 font-display text-xl font-bold">RM {todaySales.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Today's Sales</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <BarChart3 className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-1 font-display text-xl font-bold">RM {totalSales.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
        </div>

        {/* Branches */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Branches</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddBranch(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {branches.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center py-8 text-muted-foreground">
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
                className={`border-border/50 cursor-pointer transition-all ${selectedBranch?.id === b.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedBranch(b)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.branch_name}</p>
                      {b.branch_address && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {b.branch_address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); showStaticQr(b); }}>
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
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="qr" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> QR Codes
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4 space-y-3">
              {/* Static QR */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Static QR Code</p>
                      <p className="text-[11px] text-muted-foreground">Customer enters the amount</p>
                    </div>
                    <Button size="sm" onClick={() => showStaticQr(selectedBranch)} className="gap-1.5">
                      <QrCode className="h-3.5 w-3.5" /> Show
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic QRs */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Dynamic QR Codes</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddQr(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
              </div>

              {dynamicQrs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No dynamic QR codes yet. Create one with a pre-filled amount.</p>
              ) : (
                dynamicQrs.map((qr) => (
                  <Card key={qr.id} className={`border-border/50 ${qr.is_used ? 'opacity-50' : ''}`}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-semibold">RM {Number(qr.amount).toFixed(2)}</p>
                        {qr.description && <p className="text-[10px] text-muted-foreground">{qr.description}</p>}
                        <p className="text-[10px] text-muted-foreground">{qr.is_used ? "Used" : "Active"}</p>
                      </div>
                      {!qr.is_used && (
                        <Button size="sm" variant="ghost" onClick={() => showDynamicQrCode(qr)}>
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-4 space-y-3">
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Branch Name</span>
                    <span className="font-medium">{selectedBranch.branch_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-medium">{selectedBranch.commission_percent}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${selectedBranch.is_active ? 'text-primary' : 'text-destructive'}`}>
                      {selectedBranch.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">QR Code ID</span>
                    <span className="font-mono text-xs">{selectedBranch.qr_code_id.slice(0, 8)}...</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Branch Name *</Label>
              <Input placeholder="e.g. Main Outlet" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input placeholder="Branch address" value={newBranchAddress} onChange={(e) => setNewBranchAddress(e.target.value)} />
            </div>
            <Button className="w-full" onClick={addBranch} disabled={addingBranch || !newBranchName.trim()}>
              {addingBranch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dynamic QR Dialog */}
      <Dialog open={showAddQr} onOpenChange={setShowAddQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Create Dynamic QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={qrAmount} onChange={(e) => setQrAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input placeholder="e.g. Table 5 order" value={qrDescription} onChange={(e) => setQrDescription(e.target.value)} />
            </div>
            <Button className="w-full" onClick={createDynamicQr} disabled={creatingQr || !qrAmount}>
              {creatingQr ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Display Dialog */}
      <Dialog open={!!showQrDisplay} onOpenChange={() => setShowQrDisplay(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-center">
              {showQrDisplay?.type === "static" ? "Static QR" : "Dynamic QR"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={showQrDisplay?.data || ""}
                size={200}
                level="M"
                fgColor="hsl(157, 72%, 40%)"
              />
            </div>
            <p className="mt-3 font-display text-lg font-bold text-primary">{showQrDisplay?.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {showQrDisplay?.type === "static" ? "Customer scans and enters amount" : "Amount is pre-filled for customer"}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MerchantDashboard;
