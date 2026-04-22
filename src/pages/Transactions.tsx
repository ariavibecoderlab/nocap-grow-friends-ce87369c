import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BottomNav from "@/components/BottomNav";
import TransactionDetail from "@/components/TransactionDetail";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowUpDown, Gift, Wallet, Search, X, CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
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

type FilterType = "all" | "in" | "out";
type DatePreset = "all" | "today" | "week" | "month" | "custom";

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const Transactions = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const dateRange = useMemo((): { from: Date; to: Date } | null => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
      case "month":
        return { from: startOfMonth(now), to: endOfDay(now) };
      case "custom":
        if (customRange?.from) {
          return { from: startOfDay(customRange.from), to: endOfDay(customRange.to || customRange.from) };
        }
        return null;
      default:
        return null;
    }
  }, [datePreset, customRange]);

  const filtered = useMemo(() => {
    let result = transactions;

    if (filter === "in") {
      result = result.filter((tx) => isCredit(tx.type));
    } else if (filter === "out") {
      result = result.filter((tx) => !isCredit(tx.type));
    }

    if (dateRange) {
      result = result.filter((tx) => {
        const txDate = new Date(tx.created_at);
        return txDate >= dateRange.from && txDate <= dateRange.to;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (tx) =>
          (tx.description && tx.description.toLowerCase().includes(q)) ||
          transactionLabel(tx.type).toLowerCase().includes(q) ||
          toRMNumber(tx.amount).toFixed(2).includes(q)
      );
    }

    return result;
  }, [transactions, filter, search, dateRange]);

  const hasActiveFilters = search || filter !== "all" || datePreset !== "all";

  const activeDateLabel = datePresets.find((p) => p.value === datePreset)?.label || "All Time";

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pb-20">
      <div className="px-4 pt-8 pb-4">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-white">All Transactions</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Search by description or amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/10 bg-white/5 pl-9 pr-9 text-white placeholder:text-white/30 focus-visible:ring-secondary"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter tabs + Date filter row */}
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="flex-1">
            <TabsList className="w-full bg-white/5 border border-white/10">
              <TabsTrigger value="all" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/60">All</TabsTrigger>
              <TabsTrigger value="in" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/60">Money In</TabsTrigger>
              <TabsTrigger value="out" className="flex-1 text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/60">Money Out</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Date range presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {datePresets.filter((p) => p.value !== "custom").map((preset) => (
            <button
              key={preset.value}
              onClick={() => { setDatePreset(preset.value); setCustomRange(undefined); }}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors border",
                datePreset === preset.value
                  ? "bg-secondary text-primary border-secondary"
                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
              )}
            >
              {preset.label}
            </button>
          ))}

          {/* Custom date picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors border",
                  datePreset === "custom"
                    ? "bg-secondary text-primary border-secondary"
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {datePreset === "custom" && customRange?.from
                  ? `${format(customRange.from, "dd MMM")}${customRange.to ? ` – ${format(customRange.to, "dd MMM")}` : ""}`
                  : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-white/10 bg-primary" align="end">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  setDatePreset("custom");
                  if (range?.from && range?.to) {
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                numberOfMonths={1}
                className={cn("p-3 pointer-events-auto text-white [&_.rdp-day]:text-white [&_.rdp-head_cell]:text-white/50 [&_.rdp-caption_label]:text-white [&_.rdp-nav_button]:text-white/50 [&_.rdp-nav_button:hover]:text-white [&_.rdp-day_outside]:text-white/30 [&_.rdp-day_disabled]:text-white/20")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""} found</p>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(""); setFilter("all"); setDatePreset("all"); setCustomRange(undefined); }}
                className="text-xs text-secondary hover:text-secondary/80"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
              <Wallet className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">{transactions.length === 0 ? "No transactions yet" : "No matching transactions"}</p>
              <p className="mt-1 text-xs">{transactions.length === 0 ? "Your activity will appear here" : "Try a different search or filter"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => (
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
