import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowDownLeft, ArrowUpRight, ArrowUpDown, Gift, Share2, FileText, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import jsPDF from "jspdf";
import { formatRM, toRMNumber } from "@/lib/currency";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  fee_amount?: number | null;
  net_amount?: number | null;
  reference_id?: string | null;
}

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const transactionLabel = (type: string) => {
  const labels: Record<string, string> = {
    top_up: "Top Up",
    payment: "Payment",
    transfer_in: "Received",
    transfer_out: "Transferred",
    cashback: "Cashback",
    commission: "Commission",
    withdrawal: "Withdrawal",
    refund: "Refund",
  };
  return labels[type] || type;
};

const isCredit = (type: string) =>
  ["top_up", "transfer_in", "cashback", "commission", "refund"].includes(type);

const statusConfig = (status: string) => {
  switch (status) {
    case "completed":
      return { icon: CheckCircle, label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    case "failed":
      return { icon: XCircle, label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    case "cancelled":
      return { icon: XCircle, label: "Cancelled", className: "bg-red-500/20 text-red-400 border-red-500/30" };
    default:
      return { icon: Clock, label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  }
};

const typeIcon = (type: string) => {
  switch (type) {
    case "top_up":
    case "transfer_in":
      return <ArrowDownLeft className="h-6 w-6 text-secondary" />;
    case "cashback":
    case "commission":
      return <Gift className="h-6 w-6 text-secondary" />;
    case "transfer_out":
    case "payment":
    case "withdrawal":
      return <ArrowUpRight className="h-6 w-6 text-red-400" />;
    default:
      return <ArrowUpDown className="h-6 w-6 text-white/50" />;
  }
};

const generateReceiptPDF = (tx: Transaction): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const credit = isCredit(tx.type);
  const date = new Date(tx.created_at);

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, w, 40, "F");
  doc.setTextColor(255, 200, 0);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NOcap", w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Transaction Receipt", w / 2, 26, { align: "center" });

  // Amount
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const sign = credit ? "+" : "-";
  doc.text(`${sign}${formatRM(Math.abs(toRMNumber(tx.amount)))}`, w / 2, 58, { align: "center" });

  // Status badge
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(tx.status.toUpperCase(), w / 2, 66, { align: "center" });

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 74, w - 20, 74);

  // Details
  const details = [
    ["Type", transactionLabel(tx.type)],
    ["Date", date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })],
    ["Time", date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })],
    ["Transaction ID", tx.id.substring(0, 18) + "..."],
  ];

  if (tx.description) details.push(["Description", tx.description]);
  if (tx.fee_amount) details.push(["Fee", formatRM(tx.fee_amount)]);
  if (tx.net_amount) details.push(["Net Amount", formatRM(tx.net_amount)]);
  if (tx.reference_id) details.push(["Reference", tx.reference_id.substring(0, 18) + "..."]);

  let y = 84;
  doc.setFontSize(9);
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(label, 20, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(value, w - 20, y, { align: "right" });
    y += 8;
  });

  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y + 4, w - 20, y + 4);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("This is a computer-generated receipt. No signature is required.", w / 2, y + 12, { align: "center" });
  doc.text(`Generated on ${new Date().toLocaleString("en-MY")}`, w / 2, y + 17, { align: "center" });

  return doc;
};

const TransactionDetail = ({ transaction, open, onOpenChange }: TransactionDetailProps) => {
  const [sharing, setSharing] = useState(false);

  if (!transaction) return null;

  const tx = transaction;
  const credit = isCredit(tx.type);
  const status = statusConfig(tx.status);
  const StatusIcon = status.icon;
  const date = new Date(tx.created_at);

  const handleDownloadPDF = () => {
    const doc = generateReceiptPDF(tx);
    doc.save(`NOcap-Receipt-${tx.id.substring(0, 8)}.pdf`);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const doc = generateReceiptPDF(tx);
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], `NOcap-Receipt-${tx.id.substring(0, 8)}.pdf`, { type: "application/pdf" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `NOcap Receipt - ${transactionLabel(tx.type)}`,
          text: `Transaction receipt for ${credit ? "+" : "-"}${formatRM(Math.abs(toRMNumber(tx.amount)))}`,
          files: [file],
        });
      } else {
        // Fallback: download the PDF
        handleDownloadPDF();
      }
    } catch (err) {
      // User cancelled share or error - silently fail
      console.log("Share cancelled or failed", err);
    }
    setSharing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-primary text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-white text-center">Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Icon & Amount */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              {typeIcon(tx.type)}
            </div>
            <p className={`font-display text-3xl font-bold tabular-nums ${credit ? "text-secondary" : "text-white"}`}>
              {credit ? "+" : "-"}RM {Math.abs(tx.amount).toFixed(2)}
            </p>
            <Badge className={status.className}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          <Separator className="bg-white/10" />

          {/* Detail Rows */}
          <div className="space-y-3">
            <DetailRow label="Type" value={transactionLabel(tx.type)} />
            <DetailRow
              label="Date"
              value={date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
            />
            <DetailRow
              label="Time"
              value={date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            />
            {tx.description && <DetailRow label="Description" value={tx.description} />}
            {tx.fee_amount != null && tx.fee_amount > 0 && (
              <DetailRow label="Fee" value={`RM ${tx.fee_amount.toFixed(2)}`} />
            )}
            {tx.net_amount != null && (
              <DetailRow label="Net Amount" value={`RM ${tx.net_amount.toFixed(2)}`} />
            )}
            <DetailRow label="Transaction ID" value={tx.id} mono />
            {tx.reference_id && <DetailRow label="Reference ID" value={tx.reference_id} mono />}
          </div>

          <Separator className="bg-white/10" />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
              onClick={handleShare}
              disabled={sharing}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              {sharing ? "Sharing..." : "Share Receipt"}
            </Button>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
              onClick={handleDownloadPDF}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

export default TransactionDetail;
