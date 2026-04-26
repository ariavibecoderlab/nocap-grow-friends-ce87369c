import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, ShieldCheck, AlertTriangle, Search, X, CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";

type VaAuditLog = {
  id: string;
  user_id: string;
  wallet_type: string;
  branch_id: string | null;
  old_balance: number;
  new_balance: number;
  delta: number;
  changed_at: string;
};

type VaDriftRow = {
  user_id: string;
  wallet_type: string;
  branch_id: string | null;
  va_balance: number;
  computed_balance: number;
  drift: number;
};

const WalletReconciliation = () => {
  const [auditSearch, setAuditSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Drift detection via reconcile_va_balances RPC
  const {
    data: driftData,
    isLoading: driftLoading,
    refetch: refetchDrift,
    isFetching: driftFetching,
  } = useQuery({
    queryKey: ["admin_reconciliation"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("reconcile_va_balances");
      if (error) throw error;
      return (data ?? []) as VaDriftRow[];
    },
  });

  // Audit log
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["admin_audit_log", dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("va_balance_audit" as any)
        .select("*")
        .order("changed_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("changed_at", startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte("changed_at", endOfDay(dateTo).toISOString());
      }
      if (!dateFrom && !dateTo) {
        query = query.limit(200);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as VaAuditLog[];
    },
  });

  const filteredAudit = auditLogs?.filter((a) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      a.user_id.toLowerCase().includes(q) ||
      a.wallet_type.toLowerCase().includes(q) ||
      Number(a.delta).toFixed(2).includes(q)
    );
  });

  const driftCount = driftData?.length ?? 0;
  const hasDateFilter = dateFrom || dateTo;

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const setPreset = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-3 text-center">
            {driftCount === 0 ? (
              <>
                <ShieldCheck className="h-5 w-5 text-secondary mx-auto mb-1" />
                <p className="text-xs text-white/40">Balance Integrity</p>
                <p className="font-bold text-sm text-secondary">All OK</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-1" />
                <p className="text-xs text-white/40">Balance Drift</p>
                <p className="font-bold text-sm text-red-400">{driftCount} wallet{driftCount !== 1 ? "s" : ""}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-white/40">Audit Entries</p>
            <p className="font-bold text-sm text-white">{auditLogs?.length ?? "..."}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="drift" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
          <TabsTrigger value="drift" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            Drift Detection
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Drift Detection Tab */}
        <TabsContent value="drift">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDrift()}
              disabled={driftFetching}
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${driftFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {driftLoading ? (
            <p className="text-white/40 text-sm">Checking balances...</p>
          ) : driftCount === 0 ? (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="py-6 text-center">
                <ShieldCheck className="h-8 w-8 text-secondary mx-auto mb-2" />
                <p className="text-white/70 text-sm">All member VA balances match transaction records.</p>
                <p className="text-white/30 text-xs mt-1">No drift detected</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">User ID</TableHead>
                    <TableHead className="text-white/50 text-xs">Type</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">VA Balance</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">Computed</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">Drift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driftData?.map((d, i) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell className="text-white/70 text-xs font-mono truncate max-w-[100px]">
                        {d.user_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-white/50 text-xs">{d.wallet_type}</TableCell>
                      <TableCell className="text-white text-xs text-right tabular-nums">
                        RM {Number(d.va_balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-white/70 text-xs text-right tabular-nums">
                        RM {Number(d.computed_balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-[10px]">
                          {Number(d.drift) > 0 ? "+" : ""}RM {Number(d.drift).toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search user ID, type, amount..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 pr-9 text-white placeholder:text-white/30 text-sm"
            />
            {auditSearch && (
              <button onClick={() => setAuditSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date Range Pickers */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-white/10 bg-white/5 text-xs justify-start min-w-[130px]",
                    !dateFrom && "text-white/30"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-white/10 bg-white/5 text-xs justify-start min-w-[130px]",
                    !dateTo && "text-white/30"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {dateTo ? format(dateTo, "dd MMM yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {hasDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDates}
                className="text-xs text-white/50 hover:text-white h-8 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(new Date(), new Date())}
              className="border-white/10 bg-white/5 text-[10px] h-7 px-2 text-white/50 hover:text-white"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(subDays(new Date(), 6), new Date())}
              className="border-white/10 bg-white/5 text-[10px] h-7 px-2 text-white/50 hover:text-white"
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset(subDays(new Date(), 29), new Date())}
              className="border-white/10 bg-white/5 text-[10px] h-7 px-2 text-white/50 hover:text-white"
            >
              Last 30 days
            </Button>
          </div>

          <p className="text-xs text-white/40 mb-2">
            {filteredAudit?.length ?? 0} entries
            {hasDateFilter ? " (filtered by date)" : " (latest 200)"}
          </p>

          {auditLoading ? (
            <p className="text-white/40 text-sm">Loading audit log...</p>
          ) : !filteredAudit?.length ? (
            <p className="text-white/40 text-sm">No audit entries found.</p>
          ) : (
            filteredAudit.map((a) => (
              <Card key={a.id} className="border-white/10 bg-white/5 mb-2">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">{a.user_id.slice(0, 8)}…</p>
                    <p className="text-[10px] text-white/40">
                      {a.wallet_type}
                      {a.branch_id ? ` · Branch: ${a.branch_id.slice(0, 8)}…` : ""}
                      {" · "}
                      {new Date(a.changed_at).toLocaleString("en-MY", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-white/50 tabular-nums">
                      RM {Number(a.old_balance).toFixed(2)} → RM {Number(a.new_balance).toFixed(2)}
                    </p>
                    <Badge
                      variant={Number(a.delta) >= 0 ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {Number(a.delta) >= 0 ? "+" : ""}RM {Number(a.delta).toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletReconciliation;
