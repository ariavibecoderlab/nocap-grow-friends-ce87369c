import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type TxType = Database["public"]["Enums"]["transaction_type"];
type TxStatus = Database["public"]["Enums"]["transaction_status"];

const TransactionsList = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin_transactions", typeFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
      if (typeFilter !== "all") q = q.eq("type", typeFilter as TxType);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as TxStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const totalVolume = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
  const totalFees = transactions?.reduce((sum, t) => sum + Number(t.fee_amount ?? 0), 0) ?? 0;

  const statusColor = (s: string) => {
    if (s === "completed") return "default";
    if (s === "failed") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Constants.public.Enums.transaction_type.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Constants.public.Enums.transaction_status.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="py-3 text-center"><p className="text-xs text-muted-foreground">Volume</p><p className="font-bold text-lg">RM {totalVolume.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="py-3 text-center"><p className="text-xs text-muted-foreground">Fees</p><p className="font-bold text-lg">RM {totalFees.toFixed(2)}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : !transactions?.length ? (
        <p className="text-muted-foreground text-sm">No transactions found.</p>
      ) : (
        transactions.map((t) => (
          <Card key={t.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">RM {Number(t.amount).toFixed(2)}</p>
                <Badge variant={statusColor(t.status)} className="text-xs">{t.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default TransactionsList;
