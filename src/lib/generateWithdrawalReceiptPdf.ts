import jsPDF from "jspdf";
import { formatRM } from "@/lib/currency";

export interface WithdrawalReceiptData {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export function generateWithdrawalReceiptPDF(r: WithdrawalReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const date = new Date(r.created_at);

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, w, 40, "F");
  doc.setTextColor(255, 200, 0);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("NOcap", w / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Withdrawal Receipt", w / 2, 26, { align: "center" });

  // Amount
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(formatRM(r.amount), w / 2, 58, { align: "center" });

  // Status
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(r.status.toUpperCase(), w / 2, 66, { align: "center" });

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.line(20, 74, w - 20, 74);

  // Details
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

  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y + 4, w - 20, y + 4);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("This is a computer-generated receipt. No signature is required.", w / 2, y + 12, { align: "center" });
  doc.text(`Generated on ${new Date().toLocaleString("en-MY")}`, w / 2, y + 17, { align: "center" });

  return doc;
}

/** Share or download a withdrawal receipt PDF. Returns a promise. */
export async function shareWithdrawalReceipt(r: WithdrawalReceiptData): Promise<void> {
  const doc = generateWithdrawalReceiptPDF(r);
  const pdfBlob = doc.output("blob");
  const file = new File([pdfBlob], `NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`, { type: "application/pdf" });

  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "NOcap Withdrawal Receipt",
      text: `Withdrawal receipt for ${formatRM(r.amount)}`,
      files: [file],
    });
  } else {
    doc.save(`NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`);
  }
}

/** Download a withdrawal receipt PDF directly. */
export function downloadWithdrawalReceipt(r: WithdrawalReceiptData): void {
  const doc = generateWithdrawalReceiptPDF(r);
  doc.save(`NOcap-Withdrawal-${r.id.substring(0, 8)}.pdf`);
}
