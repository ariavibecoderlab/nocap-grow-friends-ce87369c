import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, TrendingDown, Gift, Banknote, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

interface Transaction {
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description: string | null;
}

const CHART_COLORS = {
  spending: "hsl(0, 70%, 55%)",
  income: "hsl(48, 100%, 50%)",
  cashback: "hsl(142, 70%, 45%)",
};

const PIE_COLORS = ["#facc15", "#f87171", "#34d399", "#60a5fa", "#a78bfa", "#fb923c"];

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const sixMonthsAgo = subMonths(new Date(), 5);
      const { data } = await supabase
        .from("transactions")
        .select("type, amount, status, created_at, description")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("created_at", startOfMonth(sixMonthsAgo).toISOString())
        .order("created_at", { ascending: true });
      if (data) setTransactions(data as Transaction[]);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const monthlyData = useMemo(() => {
    const months: { month: string; spending: number; income: number; cashback: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      const start = startOfMonth(d);
      const end = endOfMonth(d);

      const monthTx = transactions.filter((tx) => {
        const txDate = parseISO(tx.created_at);
        return txDate >= start && txDate <= end;
      });

      const spending = monthTx
        .filter((tx) => ["payment", "transfer_out", "withdrawal"].includes(tx.type))
        .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

      const income = monthTx
        .filter((tx) => ["top_up", "transfer_in", "refund"].includes(tx.type))
        .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

      const cashback = monthTx
        .filter((tx) => ["cashback", "commission"].includes(tx.type))
        .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

      months.push({ month: label, spending, income, cashback });
    }
    return months;
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions
      .filter((tx) => ["payment", "transfer_out", "withdrawal"].includes(tx.type))
      .forEach((tx) => {
        // Extract merchant/category from description or use type
        const label = tx.description
          ? tx.description.replace(/^Payment to /, "").replace(/^Transfer to /, "")
          : tx.type === "payment" ? "Payments" : tx.type === "transfer_out" ? "Transfers" : "Withdrawals";
        cats[label] = (cats[label] || 0) + Math.abs(Number(tx.amount));
      });

    return Object.entries(cats)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const totals = useMemo(() => {
    const currentMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    const thisMonthTx = transactions.filter((tx) => parseISO(tx.created_at) >= currentMonth);
    const lastMonthTx = transactions.filter((tx) => {
      const d = parseISO(tx.created_at);
      return d >= lastMonth && d <= lastMonthEnd;
    });

    const spendThis = thisMonthTx
      .filter((tx) => ["payment", "transfer_out", "withdrawal"].includes(tx.type))
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

    const spendLast = lastMonthTx
      .filter((tx) => ["payment", "transfer_out", "withdrawal"].includes(tx.type))
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

    const cashbackThis = thisMonthTx
      .filter((tx) => ["cashback", "commission"].includes(tx.type))
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

    const cashbackLast = lastMonthTx
      .filter((tx) => ["cashback", "commission"].includes(tx.type))
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0);

    const spendChange = spendLast > 0 ? ((spendThis - spendLast) / spendLast) * 100 : 0;
    const cashbackChange = cashbackLast > 0 ? ((cashbackThis - cashbackLast) / cashbackLast) * 100 : 0;

    return { spendThis, spendLast, cashbackThis, cashbackLast, spendChange, cashbackChange };
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-white/10 bg-primary/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="tabular-nums">
            {p.name}: RM {p.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  };

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
            <h1 className="font-display text-xl font-bold text-white">Spending Analytics</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Spent This Month</span>
              </div>
              <p className="mt-1.5 font-display text-xl font-bold text-white tabular-nums">
                RM {totals.spendThis.toFixed(2)}
              </p>
              {totals.spendLast > 0 && (
                <p className={`mt-0.5 text-[10px] tabular-nums ${totals.spendChange > 0 ? "text-red-400" : "text-green-400"}`}>
                  {totals.spendChange > 0 ? "↑" : "↓"} {Math.abs(totals.spendChange).toFixed(0)}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Gift className="h-3.5 w-3.5" />
                <span>Cashback Earned</span>
              </div>
              <p className="mt-1.5 font-display text-xl font-bold text-secondary tabular-nums">
                RM {totals.cashbackThis.toFixed(2)}
              </p>
              {totals.cashbackLast > 0 && (
                <p className={`mt-0.5 text-[10px] tabular-nums ${totals.cashbackChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totals.cashbackChange >= 0 ? "↑" : "↓"} {Math.abs(totals.cashbackChange).toFixed(0)}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Spending vs Income Bar Chart */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-secondary" />
              Monthly Overview
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Income" fill={CHART_COLORS.income} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="spending" name="Spending" fill={CHART_COLORS.spending} radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.income }} />
                <span className="text-[10px] text-white/40">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.spending }} />
                <span className="text-[10px] text-white/40">Spending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cashback Trend Area Chart */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Gift className="h-4 w-4 text-secondary" />
              Cashback Trend
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="cashbackGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.cashback} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.cashback} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cashback"
                  name="Cashback"
                  stroke={CHART_COLORS.cashback}
                  fill="url(#cashbackGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending Breakdown Pie Chart */}
        {spendingByCategory.length > 0 && (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-secondary" />
                Spending Breakdown
              </h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={spendingByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {spendingByCategory.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {spendingByCategory.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[11px] text-white/60 truncate">{cat.name}</span>
                      </div>
                      <span className="text-[11px] font-medium text-white tabular-nums shrink-0 ml-2">RM {cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Analytics;
