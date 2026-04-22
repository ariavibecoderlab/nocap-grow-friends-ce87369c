import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, ArrowDownCircle, ChevronRight, Users, Coins, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface Distribution {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  metadata: {
    branch_id?: string;
    branch_name?: string;
    member_id?: string;
    sale_amount?: number;
    source?: string;
  } | null;
}

interface RelatedTx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  user_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface MerchantDistributionsProps {
  userId: string;
  branchId: string;
}

const MerchantDistributions = ({ userId, branchId }: MerchantDistributionsProps) => {
  const [search, setSearch] = useState("");
  const [selectedDist, setSelectedDist] = useState<Distribution | null>(null);

  // Fetch distribution transactions for this merchant
  const { data: distributions, isLoading } = useQuery({
    queryKey: ["merchant-distributions", userId, branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, description, created_at, metadata")
        .eq("user_id", userId)
        .eq("type", "distribution" as any)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filter by branch_id from metadata
      return (data || []).filter((d: any) => {
        const meta = d.metadata as Distribution["metadata"];
        return meta?.branch_id === branchId;
      }) as Distribution[];
    },
  });

  // Fetch breakdown for selected distribution
  const { data: breakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ["distribution-breakdown", selectedDist?.id],
    enabled: !!selectedDist,
    queryFn: async () => {
      if (!selectedDist) return null;

      // Get all cashback and commission transactions referencing this distribution
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, user_id, created_at, metadata")
        .eq("reference_id", selectedDist.id)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get member profile for cashback recipient
      const meta = selectedDist.metadata;
      let memberName = "Unknown";
      let memberCode = "";
      if (meta?.member_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, referral_code")
          .eq("user_id", meta.member_id)
          .single();
        if (profile) {
          memberName = profile.full_name || "Member";
          memberCode = profile.referral_code;
        }
      }

      // Separate cashback and commission
      const cashbackTx = (data || []).filter((t: any) => t.type === "cashback");
      const commissionTxs = (data || []).filter((t: any) => t.type === "commission");

      return {
        transactions: data as RelatedTx[],
        cashback: cashbackTx[0] || null,
        commissions: commissionTxs as RelatedTx[],
        memberName,
        memberCode,
      };
    },
  });

  const filtered = (distributions || []).filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const meta = d.metadata;
    return (
      d.description?.toLowerCase().includes(s) ||
      meta?.branch_name?.toLowerCase().includes(s) ||
      meta?.member_id?.toLowerCase().includes(s) ||
      d.id.toLowerCase().includes(s)
    );
  });

  // Summary stats
  const totalDistributed = filtered.reduce((s, d) => s + Number(d.amount), 0);
  const totalSaleAmount = filtered.reduce((s, d) => s + Number(d.metadata?.sale_amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <ArrowDownCircle className="mx-auto h-4 w-4 text-amber-500" />
            <p className="mt-1 font-display text-base font-bold text-white">{filtered.length}</p>
            <p className="text-[9px] text-white/40">Distributions</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <Coins className="mx-auto h-4 w-4 text-secondary" />
            <p className="mt-1 font-display text-base font-bold text-white">RM {totalSaleAmount.toFixed(2)}</p>
            <p className="text-[9px] text-white/40">Total Sales</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-3 text-center">
            <TrendingDown className="mx-auto h-4 w-4 text-destructive" />
            <p className="mt-1 font-display text-base font-bold text-white">RM {totalDistributed.toFixed(2)}</p>
            <p className="text-[9px] text-white/40">Total Debited</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search distributions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No distributions yet</p>
            <p className="text-xs mt-1">Distributions from 3rd-party API calls will appear here</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map((d) => {
          const meta = d.metadata;
          return (
            <Card
              key={d.id}
              className="border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => setSelectedDist(d)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      RM {Number(meta?.sale_amount || 0).toFixed(2)} sale
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                      -RM {Number(d.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {format(new Date(d.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedDist} onOpenChange={() => setSelectedDist(null)}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Distribution Breakdown</DialogTitle>
          </DialogHeader>
          {selectedDist && (
            <div className="space-y-4">
              {/* Sale Info */}
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Sale Amount</span>
                    <span className="font-semibold text-white">RM {Number(selectedDist.metadata?.sale_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Branch Debited</span>
                    <span className="font-semibold text-destructive">-RM {Number(selectedDist.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Branch</span>
                    <span className="text-white text-xs">{selectedDist.metadata?.branch_name || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Date</span>
                    <span className="text-white text-xs">{format(new Date(selectedDist.created_at), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown */}
              {loadingBreakdown ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : breakdown ? (
                <div className="space-y-3">
                  {/* Member Info */}
                  <div className="flex items-center gap-2 px-1">
                    <Users className="h-4 w-4 text-secondary" />
                    <span className="text-sm text-white">{breakdown.memberName}</span>
                    {breakdown.memberCode && (
                      <span className="text-[10px] font-mono text-white/40">{breakdown.memberCode}</span>
                    )}
                  </div>

                  {/* Cashback */}
                  {breakdown.cashback && (
                    <Card className="border-secondary/20 bg-secondary/10">
                      <CardContent className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-xs font-semibold text-secondary">Cashback</p>
                          <p className="text-[10px] text-white/40">Credited to member</p>
                        </div>
                        <p className="font-display text-sm font-bold text-secondary">
                          +RM {Number(breakdown.cashback.amount).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tier Commissions */}
                  {breakdown.commissions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-white/60 px-1">Tier Commissions</p>
                      {breakdown.commissions.map((c) => {
                        const tier = (c.metadata as any)?.tier || "?";
                        return (
                          <Card key={c.id} className="border-white/10 bg-white/5">
                            <CardContent className="flex items-center justify-between p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                                  {tier}
                                </span>
                                <p className="text-xs text-white/70">{c.description}</p>
                              </div>
                              <p className="text-xs font-semibold text-white">
                                +RM {Number(c.amount).toFixed(2)}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="border-t border-white/10 pt-2 px-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Total distributed</span>
                      <span className="font-semibold text-white">
                        RM {(
                          Number(breakdown.cashback?.amount || 0) +
                          breakdown.commissions.reduce((s, c) => s + Number(c.amount), 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setSelectedDist(null)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDistributions;
