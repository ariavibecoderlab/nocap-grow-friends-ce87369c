import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  Store,
  Wallet,
  ShieldCheck,
  Gift,
} from "lucide-react";

type PayStep = "scan" | "confirm" | "pin" | "processing" | "success";

interface BranchInfo {
  id: string;
  branch_name: string;
  merchant_user_id: string;
  commission_percent: number;
  merchant_name?: string;
}

interface DynamicQr {
  id: string;
  amount: number;
  description: string | null;
}

const QrPay = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<PayStep>("scan");
  const [scanning, setScanning] = useState(false);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [dynamicQr, setDynamicQr] = useState<DynamicQr | null>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ transaction_id: string; cashback: number; new_balance: number; branch_name: string } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setBalance(Number(data.balance)); });
  }, [user]);

  const startScanner = async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          handleQrScanned(decodedText);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      toast({ title: "Camera Error", description: "Unable to access camera. Please check permissions.", variant: "destructive" });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const handleQrScanned = async (data: string) => {
    try {
      // Try parsing as JSON (dynamic QR: {branch_id, qr_id})
      // Or as plain branch qr_code_id (static QR)
      let branchId: string;
      let qrId: string | null = null;

      try {
        const parsed = JSON.parse(data);
        branchId = parsed.branch_id;
        qrId = parsed.qr_id || null;
      } catch {
        // Plain text — treat as branch qr_code_id
        branchId = data;
      }

      // Look up branch by id or qr_code_id
      let branchData;
      const { data: byId } = await supabase
        .from("merchant_branches")
        .select("id, branch_name, merchant_user_id, commission_percent")
        .eq("id", branchId)
        .eq("is_active", true)
        .maybeSingle();

      if (byId) {
        branchData = byId;
      } else {
        const { data: byQr } = await supabase
          .from("merchant_branches")
          .select("id, branch_name, merchant_user_id, commission_percent")
          .eq("qr_code_id", branchId)
          .eq("is_active", true)
          .maybeSingle();
        branchData = byQr;
      }

      if (!branchData) {
        toast({ title: "Invalid QR", description: "This merchant QR code is not recognized.", variant: "destructive" });
        setStep("scan");
        return;
      }

      // Get merchant name
      const { data: merchantProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", branchData.merchant_user_id)
        .maybeSingle();

      setBranch({
        ...branchData,
        merchant_name: merchantProfile?.full_name || "Merchant",
      });

      // If dynamic QR, fetch amount
      if (qrId) {
        const { data: qrData } = await supabase
          .from("merchant_qr_codes")
          .select("id, amount, description, is_used")
          .eq("id", qrId)
          .maybeSingle();

        if (qrData && !qrData.is_used) {
          setDynamicQr({ id: qrData.id, amount: Number(qrData.amount), description: qrData.description });
          setAmount(String(qrData.amount));
        }
      }

      setStep("confirm");
    } catch {
      toast({ title: "Error", description: "Failed to read QR code.", variant: "destructive" });
      setStep("scan");
    }
  };

  const handleConfirm = () => {
    const amt = Number(amount);
    if (!amt || amt < 0.01) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (amt > balance) {
      toast({ title: "Insufficient balance", description: `Your balance is RM ${balance.toFixed(2)}.`, variant: "destructive" });
      return;
    }
    if (amt >= 50) {
      setStep("pin");
    } else {
      processPayment(amt, "");
    }
  };

  const handlePinSubmit = () => {
    if (pin.length < 4) {
      toast({ title: "Invalid PIN", description: "Please enter your PIN.", variant: "destructive" });
      return;
    }
    processPayment(Number(amount), pin);
  };

  const processPayment = async (amt: number, pinValue: string) => {
    setStep("processing");
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("process-payment", {
      body: {
        branch_id: branch!.id,
        qr_code_id: dynamicQr?.id || null,
        amount: amt,
        pin: pinValue || undefined,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      toast({ title: "Payment Failed", description: data?.error || error?.message || "Something went wrong.", variant: "destructive" });
      setStep("confirm");
      return;
    }

    setResult(data);
    setStep("success");
  };

  const resetFlow = () => {
    setStep("scan");
    setBranch(null);
    setDynamicQr(null);
    setAmount("");
    setPin("");
    setResult(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-6 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => step === "scan" ? navigate("/dashboard") : resetFlow()} className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">QR Pay</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Scan Step */}
        {step === "scan" && (
          <div className="space-y-4">
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardContent className="p-0">
                <div id={scannerContainerId} className="w-full" style={{ minHeight: scanning ? 300 : 0 }} />
                {!scanning && (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                     <div className="rounded-full bg-secondary/10 p-4 mb-4">
                       <Camera className="h-8 w-8 text-secondary" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Scan a merchant's QR code to make a payment
                    </p>
                    <Button onClick={startScanner} className="gap-2">
                      <Camera className="h-4 w-4" /> Open Scanner
                    </Button>
                  </div>
                )}
                {scanning && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Point your camera at the merchant's QR code</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={stopScanner}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance */}
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="font-display text-lg font-bold">RM {balance.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirm Step */}
        {step === "confirm" && branch && (
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                     <Store className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold">{branch.branch_name}</p>
                    <p className="text-xs text-muted-foreground">{branch.merchant_name}</p>
                  </div>
                </div>

                {dynamicQr?.description && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm font-medium">{dynamicQr.description}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="payAmount">Payment Amount (RM)</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!!dynamicQr}
                    className="text-2xl font-bold text-center h-14"
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Your Balance</span>
                  <span className="font-semibold text-foreground">RM {balance.toFixed(2)}</span>
                </div>

                {Number(amount) > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>After Payment</span>
                    <span className={`font-semibold ${balance - Number(amount) < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      RM {(balance - Number(amount)).toFixed(2)}
                    </span>
                  </div>
                )}

                <Button className="w-full h-12 text-base" onClick={handleConfirm} disabled={!amount || Number(amount) <= 0}>
                  Pay RM {Number(amount || 0).toFixed(2)}
                </Button>
                <Button variant="ghost" className="w-full text-sm" onClick={resetFlow}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PIN Step */}
        {step === "pin" && (
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col items-center">
                   <div className="rounded-full bg-secondary/10 p-3 mb-3">
                     <ShieldCheck className="h-6 w-6 text-secondary" />
                  </div>
                  <p className="font-display text-lg font-bold">Enter PIN</p>
                  <p className="text-xs text-muted-foreground">Required for payments of RM50 and above</p>
                </div>

                <div className="space-y-2">
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="Enter your PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paying to</span>
                    <span className="font-medium">{branch?.branch_name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-secondary">RM {Number(amount).toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full h-12" onClick={handlePinSubmit} disabled={pin.length < 4}>
                  Confirm Payment
                </Button>
                <Button variant="ghost" className="w-full text-sm" onClick={() => setStep("confirm")}>
                  ← Back
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-secondary mb-4" />
            <p className="font-display text-lg font-semibold">Processing Payment...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && result && (
          <div className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col items-center py-4">
                   <div className="rounded-full bg-secondary/10 p-4 mb-3">
                     <CheckCircle2 className="h-10 w-10 text-secondary" />
                  </div>
                  <p className="font-display text-xl font-bold">Payment Successful!</p>
                  <p className="text-sm text-muted-foreground mt-1">RM {Number(amount).toFixed(2)} paid to {result.branch_name}</p>
                </div>

                {result.cashback > 0 && (
                   <div className="flex items-center gap-2 rounded-lg bg-secondary/5 border border-secondary/20 p-3">
                     <Gift className="h-5 w-5 text-secondary shrink-0" />
                     <div>
                       <p className="text-sm font-semibold text-secondary">Cashback earned!</p>
                      <p className="text-xs text-muted-foreground">RM {result.cashback.toFixed(2)} added to your wallet</p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Balance</span>
                    <span className="font-bold">RM {result.new_balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs">{result.transaction_id?.slice(0, 8)}...</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => navigate("/dashboard")}>
                  Back to Home
                </Button>
                <Button variant="outline" className="w-full" onClick={resetFlow}>
                  Make Another Payment
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default QrPay;
