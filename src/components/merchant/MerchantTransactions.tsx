import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, Loader2, ChevronDown, CalendarIcon, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

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

    if (fromDate) {
      query = query.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

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
  }, [userId, branchId, fromDate, toDate]);

  const loadMore = () => {
    fetchTransactions(transactions.length, true);
  };

  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  const exportCsv = () => {
    if (transactions.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const header = "Date,Time,Description,Branch,Amount (RM)\n";
    const rows = transactions.map((t) => {
      const d = new Date(t.created_at);
      const meta = t.metadata as Record<string, unknown> | null;
      const branch = (meta?.branch_name as string) || "";
      return `${format(d, "yyyy-MM-dd")},${format(d, "HH:mm")},${(t.description || "Payment received").replace(/,/g, ";")},${branch.replace(/,/g, ";")},${Number(t.amount).toFixed(2)}`;
    });

    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported!" });
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  };

  const hasFilters = fromDate || toDate;

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white", !fromDate && "text-white/40")}>
              <CalendarIcon className="h-3 w-3" />
              {fromDate ? format(fromDate, "dd MMM yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-primary border-white/10" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={setFromDate}
              disabled={(date) => date > new Date() || (toDate ? date > toDate : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto text-white [&_.rdp-day]:text-white [&_.rdp-head_cell]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-nav_button]:text-white/50 [&_.rdp-nav_button:hover]:text-white [&_.rdp-day_outside]:text-white/30 [&_.rdp-day_disabled]:text-white/20")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white", !toDate && "text-white/40")}>
              <CalendarIcon className="h-3 w-3" />
              {toDate ? format(toDate, "dd MMM yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-primary border-white/10" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={setToDate}
              disabled={(date) => date > new Date() || (fromDate ? date < fromDate : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto text-white [&_.rdp-day]:text-white [&_.rdp-head_cell]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-nav_button]:text-white/50 [&_.rdp-nav_button:hover]:text-white [&_.rdp-day_outside]:text-white/30 [&_.rdp-day_disabled]:text-white/20")}
            />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-white/40 hover:text-white hover:bg-white/10" onClick={clearFilters}>
            Clear
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white" onClick={exportCsv}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <ArrowDownLeft className="mx-auto h-8 w-8 text-white/20 mb-2" />
          <p className="text-sm text-white/40">{hasFilters ? "No transactions in this date range" : "No transactions yet"}</p>
          <p className="text-xs text-white/30 mt-1">
            {hasFilters ? "Try adjusting your date filters" : "Payments received will appear here"}
          </p>
        </div>
      ) : (
        <>
          {/* Grouped list */}
          {(() => {
            const grouped: Record<string, Transaction[]> = {};
            transactions.forEach((t) => {
              const key = formatDateLabel(t.created_at);
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(t);
            });

            return Object.entries(grouped).map(([date, txns]) => (
              <div key={date}>
                <p className="text-xs font-medium text-white/40 mb-2">{date}</p>
                <div className="space-y-2">
                  {txns.map((t) => {
                    const meta = t.metadata as Record<string, unknown> | null;
                    const branchName = meta?.branch_name as string | undefined;
                    return (
                      <Card key={t.id} className="border-white/10 bg-white/5">
                        <CardContent className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                              <ArrowDownLeft className="h-4 w-4 text-secondary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{t.description || "Payment received"}</p>
                              <div className="flex items-center gap-2">
                                {branchName && (
                                  <span className="text-[10px] text-white/40 truncate">{branchName}</span>
                                )}
                                <span className="text-[10px] text-white/40">{formatTime(t.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-secondary shrink-0">
                            +{formatRM(t.amount)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ));
          })()}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white/40 hover:text-white hover:bg-white/10"
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
        </>
      )}
    </div>
  );
};

export default MerchantTransactions;
