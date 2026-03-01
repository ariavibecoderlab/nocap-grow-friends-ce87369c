import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, ArrowDownToLine, Share2, FileText } from "lucide-react";
import jsPDF from "jspdf";

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface Props {
  userId: string;
}

const generateWithdrawalReceiptPDF = (r: WithdrawalRequest): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const date = new Date(r.created_at);

  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, w, 40, "F");
  doc.setTextColor(255, 200, 0);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NOcap", w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Withdrawal Receipt", w / 2, 26, { align: "center" });

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(`RM ${Number(r.amount).toFixed(2)}`, w / 2, 58, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(r.status.toUpperCase(), w / 2, 66, { align: "center" });

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 74, w - 20, 74);

  const details: [string, string][] = [
    ["Date", date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })],
    ["Time", date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })],
    ["Bank", r.bank_name],
    ["Account No.", r.bank_account_no],
    ["Account Holder", r.bank_account_holder],
    ["Request ID", r.id.substring(0, 18) + "..."],
  ];
  if (r.rejection_reason) details.push(["Rejection Reason", r.rejection_reason]);

  let y = 84;
  doc.setFontSize(9);
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(label, 20, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(value, w - 65);
    doc.text(lines, w - 20, y, { align: "right" });
    y += lines.length * 5 + 3;
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(20, y + 4, w - 20, y + 4);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("This is a computer-generated receipt. No signature is required.", w / 2, y + 12, { align: "center" });
  doc.text(`Generated on ${new Date().toLocaleString("en-MY")}`, w / 2, y + 17, { align: "center" });

  return doc;
};

const MerchantWithdrawals = ({ userId }: Props) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [sharing, setSharing] = useState(false);

  // Form fields
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [minWithdrawal, setMinWithdrawal] = useState(50);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: wr }, { data: wallet }, { data: app }, { data: globalSettings }] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("wallets").select("balance").eq("user_id", userId).eq("wallet_type", "merchant").single(),
      supabase
        .from("merchant_applications")
        .select("bank_name, bank_account_no, bank_account_holder, min_withdrawal_amount")
        .eq("user_id", userId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("system_settings")
        .select("value")
        .eq("key", "min_withdrawal_amount")
        .maybeSingle(),
    ]);
    if (wr) setRequests(wr as WithdrawalRequest[]);
    if (wallet) setWalletBalance(Number(wallet.balance));
    if (app) {
      setBankName(app.bank_name || "");
      setBankAccountNo(app.bank_account_no || "");
      setBankAccountHolder(app.bank_account_holder || "");
      // Per-merchant override takes priority over global default
      const merchantMin = app.min_withdrawal_amount != null ? Number(app.min_withdrawal_amount) : null;
      const globalMin = globalSettings?.value ? Number(globalSettings.value) : 50;
      setMinWithdrawal(merchantMin ?? globalMin);
    } else if (globalSettings?.value) {
      setMinWithdrawal(Number(globalSettings.value));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("withdrawal-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${userId}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const hasPending = requests.some((r) => r.status === "pending");

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (amt < minWithdrawal) {
      toast({ title: `Minimum withdrawal is RM ${minWithdrawal.toFixed(2)}`, variant: "destructive" });
      return;
    }
    if (amt > walletBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (!bankName.trim() || !bankAccountNo.trim() || !bankAccountHolder.trim()) {
      toast({ title: "Fill in all bank details", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: userId,
      amount: amt,
      bank_name: bankName.trim(),
      bank_account_no: bankAccountNo.trim(),
      bank_account_holder: bankAccountHolder.trim(),
      wallet_type: "merchant",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal requested", description: "Admin will review your request." });
      setAmount("");
      setShowForm(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle2 className="h-4 w-4 text-secondary" />;
    if (s === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Balance & request button */}
      <Card className="border-secondary/20 bg-secondary/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">Available Balance</p>
            <p className="text-xl font-bold font-display text-white">RM {walletBalance.toFixed(2)}</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} disabled={hasPending} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 font-semibold">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Withdraw
          </Button>
        </CardContent>
      </Card>

      {hasPending && (
        <p className="text-xs text-amber-500 text-center">You have a pending withdrawal request. Please wait for it to be processed.</p>
      )}

      {/* History */}
      {requests.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-6">No withdrawal requests yet.</p>
      ) : (
        requests.map((r) => (
          <Card key={r.id} className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSelectedRequest(r)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(r.status)}
                  <div>
                    <p className="text-sm font-semibold text-white">RM {Number(r.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-white/40">
                      {r.bank_name} • {r.bank_account_no}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-medium capitalize ${r.status === "approved" ? "text-secondary" : r.status === "rejected" ? "text-destructive" : "text-amber-500"}`}>
                    {r.status}
                  </span>
                  <p className="text-[10px] text-white/40">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {r.rejection_reason && (
                <p className="text-[10px] text-destructive mt-1.5 bg-destructive/10 rounded px-2 py-1">
                  {r.rejection_reason}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Withdrawal Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-white">
              <Wallet className="h-5 w-5" /> Request Withdrawal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-white/70">Amount (RM) *</Label>
              <Input type="number" inputMode="decimal" placeholder={minWithdrawal.toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} min={minWithdrawal} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
              <p className="text-[10px] text-white/40">Min: RM {minWithdrawal.toFixed(2)} • Available: RM {walletBalance.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Bank Name *</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent className="bg-primary border-white/10">
                  {[
                    "Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank",
                    "AmBank", "Bank Islam", "Bank Rakyat", "Bank Muamalat", "Affin Bank",
                    "Alliance Bank", "OCBC Bank", "HSBC Bank", "Standard Chartered", "UOB Bank",
                    "BSN (Bank Simpanan Nasional)", "Agrobank",
                  ].map((bank) => (
                    <SelectItem key={bank} value={bank} className="text-white focus:bg-white/10 focus:text-white">
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Account Number *</Label>
              <Input placeholder="e.g. 7778889990" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/70">Account Holder Name *</Label>
              <Input placeholder="Full name" value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
            </div>
            <Button className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(o) => { if (!o) setSelectedRequest(null); }}>
        <DialogContent className="border-white/10 bg-primary text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-white text-center">Withdrawal Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (() => {
            const r = selectedRequest;
            const date = new Date(r.created_at);
            const statusCfg = r.status === "approved"
              ? { icon: CheckCircle2, label: "Approved", className: "bg-green-500/20 text-green-400 border-green-500/30" }
              : r.status === "rejected"
              ? { icon: XCircle, label: "Rejected", className: "bg-red-500/20 text-red-400 border-red-500/30" }
              : { icon: Clock, label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
            const StatusIcon = statusCfg.icon;
            return (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                    <ArrowDownToLine className="h-6 w-6 text-secondary" />
                  </div>
                  <p className="font-display text-3xl font-bold tabular-nums text-white">
                    RM {Number(r.amount).toFixed(2)}
                  </p>
                  <Badge className={statusCfg.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-3">
                  <DetailRow label="Date" value={date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })} />
                  <DetailRow label="Time" value={date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })} />
                  <DetailRow label="Bank" value={r.bank_name} />
                  <DetailRow label="Account No." value={r.bank_account_no} />
                  <DetailRow label="Account Holder" value={r.bank_account_holder} />
                  <DetailRow label="Request ID" value={r.id} mono />
                  {r.rejection_reason && <DetailRow label="Rejection Reason" value={r.rejection_reason} />}
                </div>

                <Separator className="bg-white/10" />

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
                    onClick={async () => {
                      setSharing(true);
                      try {
                        const doc = generateWithdrawalReceiptPDF(r);
                        const pdfBlob = doc.output("blob");
                        const file = new File([pdfBlob], `NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`, { type: "application/pdf" });
                        if (navigator.share && navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            title: "NOcap Withdrawal Receipt",
                            text: `Withdrawal receipt for RM ${Number(r.amount).toFixed(2)}`,
                            files: [file],
                          });
                        } else {
                          doc.save(`NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`);
                        }
                      } catch (err) {
                        console.log("Share cancelled or failed", err);
                      }
                      setSharing(false);
                    }}
                    disabled={sharing}
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    {sharing ? "Sharing..." : "Share Receipt"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/10"
                    onClick={() => {
                      const doc = generateWithdrawalReceiptPDF(r);
                      doc.save(`NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-white/40 shrink-0">{label}</span>
    <span className={`text-xs text-white text-right break-all ${mono ? "font-mono text-[10px]" : ""}`}>
      {value}
    </span>
  </div>
);

export default MerchantWithdrawals;
