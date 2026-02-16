import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, Loader2, ChevronDown } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  metadata: unknown;
  reference_id: string | null;
}

interface MerchantTransactionsProps {
  userId: string;
  branchId?: string;
}

const PAGE_SIZE = 15;

const MerchantTransactions = ({ userId, branchId }: MerchantTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTransactions = async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from("transactions")
      .select("id, amount, status, description, created_at, metadata, reference_id")
      .eq("user_id", userId)
      .eq("type", "top_up")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (!error && data) {
      const mapped: Transaction[] = data.map((t) => ({
        ...t,
        status: t.status as string,
        description: t.description ?? null,
        metadata: t.metadata,
        reference_id: t.reference_id ?? null,
      }));

      const filtered = branchId
        ? mapped.filter((t) => {
            const meta = t.metadata as Record<string, unknown> | null;
            return meta?.branch_id === branchId;
          })
        : mapped;

      if (append) {
        setTransactions((prev) => [...prev, ...filtered]);
      } else {
        setTransactions(filtered);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchTransactions(0, false);
  }, [userId, branchId]);

  const loadMore = () => {
    fetchTransactions(transactions.length, true);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <ArrowDownLeft className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">Payments received will appear here</p>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach((t) => {
    const key = formatDate(t.created_at);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, txns]) => (
        <div key={date}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
          <div className="space-y-2">
            {txns.map((t) => {
              const meta = t.metadata as Record<string, unknown> | null;
              const branchName = meta?.branch_name as string | undefined;
              return (
                <Card key={t.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || "Payment received"}</p>
                        <div className="flex items-center gap-2">
                          {branchName && (
                            <span className="text-[10px] text-muted-foreground truncate">{branchName}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{formatTime(t.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">
                      +RM {Number(t.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-1" />
          )}
          Load more
        </Button>
      )}
    </div>
  );
};

export default MerchantTransactions;
