import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import TransactionDetail from "@/components/TransactionDetail";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowUpDown, Gift, Wallet } from "lucide-react";

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

const transactionIcon = (type: string) => {
  switch (type) {
    case "top_up":
    case "transfer_in":
      return <ArrowDownLeft className="h-4 w-4 text-secondary" />;
    case "cashback":
    case "commission":
      return <Gift className="h-4 w-4 text-secondary" />;
    case "transfer_out":
    case "payment":
    case "withdrawal":
      return <ArrowUpRight className="h-4 w-4 text-red-400" />;
    default:
      return <ArrowUpDown className="h-4 w-4 text-white/50" />;
  }
};

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

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transactions")
        .select("id, type, amount, status, description, created_at, fee_amount, net_amount, reference_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) setTransactions(data as Transaction[]);
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">All Transactions</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {transactions.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
              <Wallet className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="mt-1 text-xs">Your activity will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => setSelectedTx(tx)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                    {transactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {tx.description || transactionLabel(tx.type)}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {new Date(tx.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {new Date(tx.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${isCredit(tx.type) ? "text-secondary" : "text-white"}`}>
                    {isCredit(tx.type) ? "+" : "-"}RM {Math.abs(tx.amount).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TransactionDetail
        transaction={selectedTx}
        open={!!selectedTx}
        onOpenChange={(open) => { if (!open) setSelectedTx(null); }}
      />

      <BottomNav />
    </div>
  );
};

export default Transactions;
