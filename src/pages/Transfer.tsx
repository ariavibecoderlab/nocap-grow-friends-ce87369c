import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, QrCode, Search, Wallet, User, CheckCircle2, Loader2, Camera } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface RecipientInfo {
  user_id: string;
  full_name: string;
  referral_code: string;
}

type TransferStep = "select" | "amount" | "confirm" | "pin" | "success";

const Transfer = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<TransferStep>("select");
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecipientInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerContainerId = "qr-reader";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setBalance(Number(data.balance)); });
  }, [user]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanner = async () => {
    setScannerActive(true);
    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");
    
    // Wait for container to render
    await new Promise(r => setTimeout(r, 300));
    
    const scanner = new Html5Qrcode(scannerContainerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          setScannerActive(false);
          handleQRResult(decodedText);
        },
        () => {} // ignore errors during scanning
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setScannerActive(false);
      toast({ title: "Camera error", description: "Unable to access camera. Please use member search instead.", variant: "destructive" });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleQRResult = async (data: string) => {
    // QR format: nocap:USER_ID or just USER_ID
    const userId = data.startsWith("nocap:") ? data.replace("nocap:", "") : data;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, referral_code")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      setRecipient(profile);
      setStep("amount");
    } else {
      toast({ title: "User not found", description: "The scanned QR code is not valid.", variant: "destructive" });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);

    const query = searchQuery.trim().toUpperCase();
    
    // Search by referral code or name
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, referral_code")
      .or(`referral_code.eq.${query},full_name.ilike.%${searchQuery.trim()}%`)
      .neq("user_id", user?.id || "")
      .limit(10);

    setSearchResults(data || []);
    setSearching(false);
  };

  const selectRecipient = (r: RecipientInfo) => {
    setRecipient(r);
    setStep("amount");
  };

  const proceedToConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 0.01) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    if (numAmount > balance) {
      toast({ title: "Insufficient balance", description: "You don't have enough balance.", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 50) {
      setStep("pin");
    } else {
      executeTransfer();
    }
  };

  const executeTransfer = async (pinValue?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-transfer", {
        body: {
          recipient_user_id: recipient!.user_id,
          amount: parseFloat(amount),
          pin: pinValue || undefined,
        },
      });

      if (error) {
        toast({ title: "Transfer failed", description: error.message || "Please try again.", variant: "destructive" });
        if (step === "pin") setPin("");
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Transfer failed", description: data.error, variant: "destructive" });
        if (data.code === "PIN_NOT_SET") {
          navigate("/profile");
        }
        if (step === "pin") setPin("");
        setLoading(false);
        return;
      }

      setBalance(data.new_balance);
      setStep("success");
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
    setLoading(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => {
                if (step === "select") navigate(-1);
                else if (step === "amount") { setStep("select"); setRecipient(null); }
                else if (step === "confirm") setStep("amount");
                else if (step === "pin") setStep("confirm");
                else navigate("/dashboard");
              }} className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="font-display text-lg font-bold">Transfer</h1>
            </div>
            <button onClick={() => setShowMyQR(true)} className="rounded-full p-2 hover:bg-primary-foreground/10 transition-colors">
              <QrCode className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Step: Select Recipient */}
        {step === "select" && (
          <>
            {/* Balance */}
            <Card className="mt-4 border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Wallet className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="font-display text-xl font-bold">RM {balance.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="search" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="search" className="flex-1 gap-1.5">
                  <Search className="h-4 w-4" /> Search
                </TabsTrigger>
                <TabsTrigger value="scan" className="flex-1 gap-1.5">
                  <Camera className="h-4 w-4" /> Scan QR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Name or referral code"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching} size="sm" className="shrink-0">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {searchResults.map((r) => (
                    <button
                      key={r.user_id}
                      onClick={() => selectRecipient(r)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
                    >
                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                         <User className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.full_name || "Member"}</p>
                        <p className="text-xs text-muted-foreground">Code: {r.referral_code}</p>
                      </div>
                    </button>
                  ))}
                  {searchResults.length === 0 && searchQuery && !searching && (
                    <p className="text-center text-sm text-muted-foreground py-4">No members found</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="scan" className="mt-4">
                {!scannerActive ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                     <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10">
                       <Camera className="h-10 w-10 text-secondary" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Scan a member's QR code to transfer funds
                    </p>
                    <Button onClick={startScanner}>
                      <Camera className="mr-2 h-4 w-4" /> Open Scanner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div id={scannerContainerId} className="overflow-hidden rounded-xl" />
                    <Button variant="outline" className="w-full" onClick={stopScanner}>
                      Cancel Scan
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Step: Enter Amount */}
        {step === "amount" && recipient && (
          <>
             <Card className="mt-4 border-secondary/20 bg-secondary/5">
               <CardContent className="flex items-center gap-3 p-4">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                   <User className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sending to</p>
                  <p className="font-medium">{recipient.full_name || "Member"}</p>
                  <p className="text-xs text-muted-foreground">Code: {recipient.referral_code}</p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              <Label className="text-sm font-medium">Amount (RM)</Label>
              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">RM</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-14 text-2xl font-display font-bold h-14 text-right"
                  min={0.01}
                  max={balance}
                  step="0.01"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Balance: RM {balance.toFixed(2)}
                {parseFloat(amount) >= 50 && " · PIN required"}
              </p>
            </div>

            <Button className="mt-6 w-full h-12" onClick={proceedToConfirm} disabled={!amount || parseFloat(amount) < 0.01}>
              Continue
            </Button>
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && recipient && (
          <>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">You are sending</p>
              <p className="font-display text-4xl font-bold mt-2">RM {parseFloat(amount).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-2">
                to <span className="font-medium text-foreground">{recipient.full_name || "Member"}</span>
              </p>
            </div>

            <Card className="mt-6 border-border/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium">{recipient.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-medium">{recipient.referral_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">RM {parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Balance after</span>
                  <span className="font-bold">RM {(balance - parseFloat(amount)).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Button className="mt-6 w-full h-12 text-base font-semibold" onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Processing..." : "Confirm Transfer"}
            </Button>
          </>
        )}

        {/* Step: PIN */}
        {step === "pin" && (
          <div className="mt-8 flex flex-col items-center">
            <p className="font-display text-lg font-semibold">Enter PIN</p>
            <p className="text-sm text-muted-foreground mt-1">Required for transfers RM50 and above</p>
            <div className="mt-6">
              <InputOTP maxLength={6} value={pin} onChange={(val) => {
                setPin(val);
                if (val.length === 6) executeTransfer(val);
              }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
              </div>
            )}
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="mt-8 flex flex-col items-center text-center">
             <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 mb-4">
               <CheckCircle2 className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="font-display text-2xl font-bold">Transfer Successful!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              RM {parseFloat(amount).toFixed(2)} sent to {recipient?.full_name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              New balance: RM {balance.toFixed(2)}
            </p>
            <Button className="mt-8 w-full" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => {
              setStep("select");
              setRecipient(null);
              setAmount("");
              setPin("");
            }}>
              Make Another Transfer
            </Button>
          </div>
        )}
      </div>

      {/* My QR Dialog */}
      <Dialog open={showMyQR} onOpenChange={setShowMyQR}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center font-display">My QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-2xl border-2 border-primary/20 p-4 bg-white">
              <QRCodeSVG
                value={`nocap:${user?.id}`}
                size={200}
                level="H"
                fgColor="hsl(157, 72%, 40%)"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Share this QR code to receive transfers from other members
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Transfer;
