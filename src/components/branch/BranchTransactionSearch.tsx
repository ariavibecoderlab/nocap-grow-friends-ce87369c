import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, CalendarIcon, ArrowDownLeft, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  metadata: unknown;
  reference_id: string | null;
}

interface BranchTransactionSearchProps {
  branchId: string;
  merchantUserId: string;
}

const PAGE_SIZE = 15;

const BranchTransactionSearch = ({ branchId, merchantUserId }: BranchTransactionSearchProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("transactions")
        .select("id, amount, description, created_at, metadata, reference_id")
        .eq("user_id", merchantUserId)
        .eq("type", "top_up")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);

      if (fromDate) query = query.gte("created_at", fromDate.toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data } = await query;

      // Filter by branch
      const branchTxns = (data || []).filter((t) => {
        const meta = t.metadata as Record<string, unknown> | null;
        return meta?.branch_id === branchId;
      });

      setTransactions(branchTxns as Transaction[]);
      setLoading(false);
    };
    fetch();
  }, [branchId, merchantUserId, fromDate, toDate]);

  // Client-side filtering
  useEffect(() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        (t.description || "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.reference_id || "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }

    if (minAmount) {
      result = result.filter((t) => Number(t.amount) >= Number(minAmount));
    }
    if (maxAmount) {
      result = result.filter((t) => Number(t.amount) <= Number(maxAmount));
    }

    setFiltered(result);
  }, [transactions, searchQuery, minAmount, maxAmount]);

  const clearAll = () => {
    setSearchQuery("");
    setFromDate(undefined);
    setToDate(undefined);
    setMinAmount("");
    setMaxAmount("");
  };

  const hasFilters = searchQuery || fromDate || toDate || minAmount || maxAmount;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Search by description, ID, or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 h-9 text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-white/40 hover:text-white" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="text-xs text-white/50 hover:text-white hover:bg-white/10 gap-1 h-7"
      >
        Filters <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
      </Button>

      {showFilters && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10", fromDate && "text-white")}>
                  <CalendarIcon className="h-3 w-3" />
                  {fromDate ? format(fromDate, "dd MMM") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={fromDate} onSelect={setFromDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10", toDate && "text-white")}>
                  <CalendarIcon className="h-3 w-3" />
                  {toDate ? format(toDate, "dd MMM") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={toDate} onSelect={setToDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min RM"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-8 text-xs border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
            <Input
              type="number"
              placeholder="Max RM"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-8 text-xs border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white h-7" onClick={clearAll}>
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <Search className="mx-auto h-8 w-8 text-white/20 mb-2" />
          <p className="text-xs text-white/40">{hasFilters ? "No transactions match your filters" : "No transactions found"}</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-white/30">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          <div className="space-y-2">
            {filtered.map((t) => (
              <Card key={t.id} className="border-white/10 bg-white/5">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-900/30">
                      <ArrowDownLeft className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.description || "Payment received"}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30 font-mono">{t.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(t.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}{" "}
                          {new Date(t.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-400 shrink-0">
                    +RM {Number(t.amount).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BranchTransactionSearch;
