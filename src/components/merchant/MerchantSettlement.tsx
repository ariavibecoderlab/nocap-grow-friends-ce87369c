import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface Branch {
  id: string;
  branch_name: string;
}

interface MerchantSettlementProps {
  userId: string;
  branches: Branch[];
  businessName?: string;
}

const MerchantSettlement = ({ userId, branches, businessName }: MerchantSettlementProps) => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
    return { val, label };
  });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59, 999);

      const { data } = await supabase
        .from("transactions")
        .select("id, amount, fee_amount, commission_amount, net_amount, created_at, description, metadata")
        .eq("user_id", userId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });

      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId, month]);

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalFees = transactions.reduce((s, t) => s + Number(t.fee_amount || 0), 0);
  const totalCommission = transactions.reduce((s, t) => s + Number(t.commission_amount || 0), 0);
  const totalNet = totalRevenue - totalFees - totalCommission;

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const [year, m] = month.split("-").map(Number);
      const monthLabel = new Date(year, m - 1).toLocaleDateString("en-MY", { month: "long", year: "numeric" });

      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text("Settlement Report", 20, 25);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(businessName || "Merchant", 20, 35);
      doc.text(`Period: ${monthLabel}`, 20, 42);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`, 20, 49);

      // Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 56, 170, 36, 3, 3, "F");

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text("Gross Revenue", 30, 66);
      doc.text("Platform Fees", 80, 66);
      doc.text("Commission", 130, 66);

      doc.setFontSize(13);
      doc.setTextColor(33);
      doc.text(`RM ${totalRevenue.toFixed(2)}`, 30, 76);
      doc.text(`RM ${totalFees.toFixed(2)}`, 80, 76);
      doc.text(`RM ${totalCommission.toFixed(2)}`, 130, 76);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text("Net Settlement", 30, 86);
      doc.setFontSize(13);
      doc.setTextColor(22, 163, 74);
      doc.text(`RM ${totalNet.toFixed(2)}`, 80, 86);

      // Transaction table header
      let y = 100;
      doc.setFontSize(12);
      doc.setTextColor(33);
      doc.text("Transactions", 20, y);
      y += 8;

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text("Date", 20, y);
      doc.text("Description", 55, y);
      doc.text("Branch", 110, y);
      doc.text("Amount", 155, y);
      doc.text("Net", 175, y);
      y += 2;
      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setTextColor(50);
      transactions.forEach((t) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const meta = t.metadata as Record<string, unknown> | null;
        const branchName = (meta?.branch_name as string) || "-";
        const net = Number(t.amount) - Number(t.fee_amount || 0) - Number(t.commission_amount || 0);

        doc.text(format(new Date(t.created_at), "dd/MM HH:mm"), 20, y);
        doc.text((t.description || "Payment").substring(0, 30), 55, y);
        doc.text(branchName.substring(0, 20), 110, y);
        doc.text(`${Number(t.amount).toFixed(2)}`, 155, y);
        doc.text(`${net.toFixed(2)}`, 175, y);
        y += 6;
      });

      // Footer
      y += 5;
      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Total: ${transactions.length} transactions | Generated by NoCap Pay`, 20, y);

      doc.save(`settlement-${month}.pdf`);
      toast({ title: "Report downloaded!", description: `Settlement report for ${monthLabel}` });
    } catch (err) {
      toast({ title: "Error generating report", variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Settlement Reports</p>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[160px] h-8 text-xs border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.val} value={o.val}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <Card className="border-secondary/20 bg-secondary/10">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Gross Revenue</span>
                <span className="font-semibold text-white">RM {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Platform Fees</span>
                <span className="text-red-400">-RM {totalFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Commission</span>
                <span className="text-red-400">-RM {totalCommission.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                <span className="text-white/60 font-medium">Net Settlement</span>
                <span className="font-bold text-secondary">RM {totalNet.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-white/30">{transactions.length} transactions this period</p>
            </CardContent>
          </Card>

          {/* Branch Breakdown */}
          {branches.length > 1 && (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-white/70 mb-2">By Branch</p>
                <div className="space-y-1.5">
                  {branches.map((b) => {
                    const branchTxns = transactions.filter((t) => {
                      const meta = t.metadata as Record<string, unknown> | null;
                      return meta?.branch_id === b.id;
                    });
                    const branchTotal = branchTxns.reduce((s: number, t: any) => s + Number(t.amount), 0);
                    return (
                      <div key={b.id} className="flex justify-between text-xs">
                        <span className="text-white/50">{b.branch_name}</span>
                        <span className="text-white font-medium">RM {branchTotal.toFixed(2)} ({branchTxns.length})</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download Button */}
          <Button
            className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold gap-2"
            onClick={generatePdf}
            disabled={generating || transactions.length === 0}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF Report
          </Button>

          {transactions.length === 0 && (
            <div className="text-center py-6">
              <FileText className="mx-auto h-8 w-8 text-white/20 mb-2" />
              <p className="text-xs text-white/40">No transactions this month</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MerchantSettlement;
