import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Users,
  Copy,
  Share2,
  TrendingUp,
  Gift,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  UserPlus,
  Layers,
} from "lucide-react";

interface ReferralMember {
  user_id: string;
  full_name: string | null;
  tier: number;
}

interface CommissionTx {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  type: string;
}

const tierLabels: Record<number, string> = {
  1: "Tier 1 — Direct",
  2: "Tier 2",
  3: "Tier 3",
  4: "Tier 4",
  5: "Tier 5",
};

const tierColors: Record<number, string> = {
  1: "bg-primary/15 text-primary",
  2: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
  3: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  4: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  5: "bg-muted text-muted-foreground",
};

const Referral = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{ full_name: string; referral_code: string } | null>(null);
  const [referrals, setReferrals] = useState<ReferralMember[]>([]);
  const [commissions, setCommissions] = useState<CommissionTx[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({ 1: true });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);

      const [profileRes, referralRes, commissionRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, referral_code")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("referral_tree")
          .select("user_id, tier")
          .eq("ancestor_id", user.id)
          .order("tier", { ascending: true }),
        supabase
          .from("transactions")
          .select("id, amount, description, created_at, type")
          .eq("user_id", user.id)
          .in("type", ["cashback", "commission"])
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (profileRes.data) setProfile(profileRes.data);

      // Fetch names for referral members
      if (referralRes.data && referralRes.data.length > 0) {
        const userIds = referralRes.data.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const nameMap = new Map(profilesData?.map((p) => [p.user_id, p.full_name]) || []);

        setReferrals(
          referralRes.data.map((r) => ({
            user_id: r.user_id,
            full_name: nameMap.get(r.user_id) || null,
            tier: r.tier,
          }))
        );
      }

      if (commissionRes.data) {
        setCommissions(commissionRes.data as CommissionTx[]);
        setTotalEarnings(commissionRes.data.reduce((sum, t) => sum + Number(t.amount), 0));
      }

      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  const shareReferral = async () => {
    if (!profile?.referral_code) return;
    const shareUrl = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join NOcap",
          text: `Use my referral code ${profile.referral_code} to join NOcap!`,
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
    }
  };

  const toggleTier = (tier: number) => {
    setExpandedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const referralsByTier = referrals.reduce<Record<number, ReferralMember[]>>((acc, r) => {
    if (!acc[r.tier]) acc[r.tier] = [];
    acc[r.tier].push(r);
    return acc;
  }, {});

  const tierCounts = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    count: referralsByTier[tier]?.length || 0,
  }));

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-14 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold">My Network</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Stats Overview */}
        <Card className="-mt-10 border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Users className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 font-display text-2xl font-bold">{referrals.filter((r) => r.tier === 1).length}</p>
                <p className="text-[10px] text-muted-foreground">Direct</p>
              </div>
              <div>
                <TrendingUp className="mx-auto h-5 w-5 text-[hsl(var(--info))]" />
                <p className="mt-1 font-display text-2xl font-bold">{referrals.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Network</p>
              </div>
              <div>
                <Gift className="mx-auto h-5 w-5 text-[hsl(var(--accent))]" />
                <p className="mt-1 font-display text-2xl font-bold">RM {totalEarnings.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-card p-3 shadow-sm">
                <QRCodeSVG
                  value={`${window.location.origin}/auth?ref=${profile?.referral_code || ""}`}
                  size={140}
                  level="M"
                  fgColor="hsl(157, 72%, 40%)"
                />
              </div>
              <p className="mt-3 font-display text-2xl font-bold tracking-widest text-primary">
                {profile?.referral_code || "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Share your code to grow your network</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={copyReferralCode} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy Code
                </Button>
                <Button size="sm" onClick={shareReferral} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Share Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Tree & Earnings */}
        <Tabs defaultValue="tree" className="mt-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="tree" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Referral Tree
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5">
              <Gift className="h-3.5 w-3.5" /> Earnings
            </TabsTrigger>
          </TabsList>

          {/* Referral Tree Tab */}
          <TabsContent value="tree" className="mt-4 space-y-3">
            {/* Tier Summary Bar */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tierCounts.map(({ tier, count }) => (
                <div
                  key={tier}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${tierColors[tier]}`}
                >
                  T{tier}: {count}
                </div>
              ))}
            </div>

            {referrals.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No referrals yet</p>
                  <p className="mt-1 text-xs">Share your code to start building your network</p>
                </CardContent>
              </Card>
            ) : (
              [1, 2, 3, 4, 5].map((tier) => {
                const members = referralsByTier[tier];
                if (!members || members.length === 0) return null;
                const isExpanded = expandedTiers[tier] ?? false;

                return (
                  <Card key={tier} className="border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleTier(tier)}
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierColors[tier]}`}>
                          T{tier}
                        </div>
                        <span className="text-sm font-medium">{tierLabels[tier]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border/50">
                        {members.map((member) => (
                          <div
                            key={member.user_id}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                              {(member.full_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{member.full_name || "Member"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-4 space-y-3">
            {/* Commission Split Info */}
            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Commission Structure</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The commission pool is split equally into 6 parts: 1 part as buyer cashback and 5 parts
                  distributed across referral tiers. Unclaimed tier commissions are returned to the merchant.
                </p>
              </CardContent>
            </Card>

            {commissions.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Gift className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No earnings yet</p>
                  <p className="mt-1 text-xs">Commissions from your network will appear here</p>
                </CardContent>
              </Card>
            ) : (
              commissions.map((tx) => (
                <Card key={tx.id} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Gift className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || (tx.type === "cashback" ? "Cashback" : "Commission")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-primary tabular-nums">
                      +RM {Number(tx.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Referral;
