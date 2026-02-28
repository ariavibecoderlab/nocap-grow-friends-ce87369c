import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { ReferralTreeNode, type TreeNode } from "@/components/referral/ReferralTreeNode";
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
  Coins,
  Network,
  Phone,
  MessageCircle,
} from "lucide-react";

interface ReferralMember {
  user_id: string;
  full_name: string | null;
  tier: number;
  phone: string | null;
  email: string | null;
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

const tierColors: Record<number, { bg: string; text: string; dot: string; line: string }> = {
  1: { bg: "bg-secondary/15", text: "text-secondary", dot: "bg-secondary", line: "border-secondary/40" },
  2: { bg: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400", line: "border-blue-400/40" },
  3: { bg: "bg-purple-500/15", text: "text-purple-400", dot: "bg-purple-400", line: "border-purple-400/40" },
  4: { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400", line: "border-amber-400/40" },
  5: { bg: "bg-white/10", text: "text-white/50", dot: "bg-white/40", line: "border-white/20" },
};

const tierCommissionLabels: Record<number, string> = {
  1: "~0.33%",
  2: "~0.33%",
  3: "~0.33%",
  4: "~0.33%",
  5: "~0.33%",
};

const Referral = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{ full_name: string; referral_code: string } | null>(null);
  const [referrals, setReferrals] = useState<ReferralMember[]>([]);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [commissions, setCommissions] = useState<CommissionTx[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({ 1: true });
  const [loadingData, setLoadingData] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);

      const [profileRes, referralRes, commissionRes] = await Promise.all([
        supabase.from("profiles").select("full_name, referral_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("referral_tree").select("user_id, tier, ancestor_id").eq("ancestor_id", user.id).order("tier", { ascending: true }),
        supabase.from("transactions").select("id, amount, description, created_at, type").eq("user_id", user.id).in("type", ["cashback", "commission"]).eq("status", "completed").order("created_at", { ascending: false }).limit(50),
      ]);

      if (profileRes.data) setProfile(profileRes.data);

      if (referralRes.data && referralRes.data.length > 0) {
        const allUserIds = referralRes.data.map((r) => r.user_id);
        
        // Fetch profiles, emails, AND parent→child (tier=1) relationships for all descendants
        const [profilesRes, emailsRes, parentChildRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", allUserIds),
          supabase.rpc("get_referral_emails", { referral_user_ids: allUserIds }),
          // Get tier=1 entries for all descendants to know who referred whom
          supabase.from("referral_tree").select("user_id, ancestor_id").eq("tier", 1).in("user_id", allUserIds),
        ]);
        
        const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, { full_name: p.full_name, phone: p.phone }]) || []);
        const emailMap = new Map((emailsRes.data as { user_id: string; email: string }[] || []).map((e) => [e.user_id, e.email]));
        
        // Build flat referrals list (for stats)
        const flatReferrals = referralRes.data.map((r) => ({
          user_id: r.user_id,
          full_name: profileMap.get(r.user_id)?.full_name || null,
          phone: r.tier === 1 ? (profileMap.get(r.user_id)?.phone || null) : null,
          email: r.tier === 1 ? (emailMap.get(r.user_id) || null) : null,
          tier: r.tier,
        }));
        setReferrals(flatReferrals);

        // Build parent→children map from tier=1 entries
        const childrenMap = new Map<string, string[]>();
        for (const entry of (parentChildRes.data || [])) {
          const parent = entry.ancestor_id;
          if (!childrenMap.has(parent)) childrenMap.set(parent, []);
          childrenMap.get(parent)!.push(entry.user_id);
        }

        // Recursive tree builder
        const buildNode = (userId: string, tier: number): TreeNode => {
          const profile = profileMap.get(userId);
          const childIds = childrenMap.get(userId) || [];
          return {
            user_id: userId,
            full_name: profile?.full_name || null,
            phone: tier === 1 ? (profile?.phone || null) : null,
            email: tier === 1 ? (emailMap.get(userId) || null) : null,
            tier,
            children: childIds.map((cid) => buildNode(cid, tier + 1)),
          };
        };

        // Root node is the current user; direct children are tier=1
        const myChildren = childrenMap.get(user.id) || [];
        setTreeRoot({
          user_id: user.id,
          full_name: profileRes.data?.full_name || "You",
          phone: null,
          email: null,
          tier: 0,
          children: myChildren.map((cid) => buildNode(cid, 1)),
        });
      } else {
        setTreeRoot(null);
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

  const getShareUrl = () => `https://nocap.life/auth?ref=${profile?.referral_code || ""}`;
  const getShareText = () => `Join NOcap and earn cashback! Use my referral code *${profile?.referral_code}* to sign up: ${getShareUrl()}`;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText())}`, "_blank");
  };
  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(`Join NOcap! Use my code ${profile?.referral_code}`)}`, "_blank");
  };
  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, "_blank");
  };
  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join NOcap and earn cashback! Use my referral code ${profile?.referral_code}`)}&url=${encodeURIComponent(getShareUrl())}`, "_blank");
  };
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
    } catch {
      toast({ title: "Your share link", description: getShareUrl(), duration: 10000 });
    }
  };

  const toggleTier = (tier: number) => {
    setExpandedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const referralsByTier = useMemo(() => {
    return referrals.reduce<Record<number, ReferralMember[]>>((acc, r) => {
      if (!acc[r.tier]) acc[r.tier] = [];
      acc[r.tier].push(r);
      return acc;
    }, {});
  }, [referrals]);

  const tierCounts = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    count: referralsByTier[tier]?.length || 0,
  }));

  // Per-tier earnings breakdown
  const earningsByType = useMemo(() => {
    const cashback = commissions.filter((c) => c.type === "cashback").reduce((s, c) => s + Number(c.amount), 0);
    const commission = commissions.filter((c) => c.type === "commission").reduce((s, c) => s + Number(c.amount), 0);
    return { cashback, commission };
  }, [commissions]);

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
      </div>
    );
  }

  const maxTierCount = Math.max(...tierCounts.map((t) => t.count), 1);

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="px-4 pb-14 pt-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <h1 className="font-display text-xl font-bold text-white">My Network</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        {/* Stats Overview */}
        <Card className="-mt-10 border-white/10 bg-white/5 shadow-2xl">
          <CardContent className="p-5">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <Users className="mx-auto h-4 w-4 text-secondary" />
                <p className="mt-1 font-display text-xl font-bold text-white">{referrals.filter((r) => r.tier === 1).length}</p>
                <p className="text-[10px] text-white/40">Direct</p>
              </div>
              <div>
                <Network className="mx-auto h-4 w-4 text-secondary" />
                <p className="mt-1 font-display text-xl font-bold text-white">{referrals.length}</p>
                <p className="text-[10px] text-white/40">Network</p>
              </div>
              <div>
                <Gift className="mx-auto h-4 w-4 text-secondary" />
                <p className="mt-1 font-display text-xl font-bold text-white">RM {earningsByType.cashback.toFixed(2)}</p>
                <p className="text-[10px] text-white/40">Cashback</p>
              </div>
              <div>
                <Coins className="mx-auto h-4 w-4 text-secondary" />
                <p className="mt-1 font-display text-xl font-bold text-white">RM {earningsByType.commission.toFixed(2)}</p>
                <p className="text-[10px] text-white/40">Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card className="mt-4 border-secondary/20 bg-secondary/10">
          <CardContent className="p-5">
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <QRCodeSVG
                  value={`https://nocap.life/auth?ref=${profile?.referral_code || ""}`}
                  size={140}
                  level="M"
                  fgColor="hsl(0, 0%, 5%)"
                />
              </div>
              <p className="mt-3 font-display text-2xl font-bold tracking-widest text-secondary">
                {profile?.referral_code || "—"}
              </p>
              <p className="mt-1 text-xs text-white/50">Share your code to grow your network</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={copyReferralCode} className="gap-1.5 border-secondary/30 text-secondary hover:bg-secondary hover:text-primary">
                  <Copy className="h-3.5 w-3.5" /> Copy Code
                </Button>
                <Button size="sm" onClick={() => setShowShareDialog(true)} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Tree & Earnings */}
        <Tabs defaultValue="tree" className="mt-6">
          <TabsList className="w-full grid grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger value="tree" className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
              <Layers className="h-3.5 w-3.5" /> Network Tree
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-primary text-white/50">
              <Gift className="h-3.5 w-3.5" /> Earnings
            </TabsTrigger>
          </TabsList>

          {/* Referral Tree Tab */}
          <TabsContent value="tree" className="mt-4 space-y-0">
            {/* Visual Tier Progress */}
            <Card className="border-white/10 bg-white/5 mb-4">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Tier Distribution</p>
                {tierCounts.map(({ tier, count }) => {
                  const colors = tierColors[tier];
                  const pct = maxTierCount > 0 ? (count / maxTierCount) * 100 : 0;
                  return (
                    <div key={tier} className="flex items-center gap-3">
                      <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                        T{tier}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors.dot} transition-all duration-500`}
                          style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-white/50 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {!treeRoot || treeRoot.children.length === 0 ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
                  <UserPlus className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No referrals yet</p>
                  <p className="mt-1 text-xs">Share your code to start building your network</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-4">
                  {/* Root node (You) */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary text-sm font-bold">
                      {(profile?.full_name || "Y").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{profile?.full_name || "You"}</p>
                      <p className="text-[10px] text-white/40">Root • {referrals.length} in network</p>
                    </div>
                  </div>

                  {/* Recursive tree */}
                  <div className="ml-3">
                    {treeRoot.children.map((child, idx) => (
                      <ReferralTreeNode
                        key={child.user_id}
                        node={child}
                        isLast={idx === treeRoot.children.length - 1}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-4 space-y-3">
            {/* Earnings Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 text-center">
                  <Gift className="mx-auto h-4 w-4 text-secondary mb-1" />
                  <p className="font-display text-lg font-bold text-secondary">RM {earningsByType.cashback.toFixed(2)}</p>
                  <p className="text-[10px] text-white/40">Cashback</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3 text-center">
                  <Coins className="mx-auto h-4 w-4 text-secondary mb-1" />
                  <p className="font-display text-lg font-bold text-secondary">RM {earningsByType.commission.toFixed(2)}</p>
                  <p className="text-[10px] text-white/40">Commission</p>
                </CardContent>
              </Card>
            </div>

            {/* Commission Structure */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-white mb-3">Commission Structure</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50">Platform Fee</span>
                    <span className="text-white/70 font-medium">1% per transaction</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50">Merchant Commission</span>
                    <span className="text-white/70 font-medium">Min 2% (merchant sets)</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <p className="text-[10px] text-white/40 mb-2">Distribution (from merchant commission pool):</p>
                    {[
                      { label: "Buyer Cashback", share: "1/6" },
                      { label: "Tier 1 (Direct)", share: "1/6" },
                      { label: "Tier 2", share: "1/6" },
                      { label: "Tier 3", share: "1/6" },
                      { label: "Tier 4", share: "1/6" },
                      { label: "Tier 5", share: "1/6" },
                    ].map((item, i) => {
                      const colors = i === 0 ? tierColors[1] : tierColors[Math.min(i, 5)];
                      return (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-secondary' : colors.dot}`} />
                            <span className="text-[11px] text-white/60">{item.label}</span>
                          </div>
                          <span className="text-[11px] text-white/40">{item.share}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
                    Unclaimed tier commissions (no referrer at that level) are returned to the merchant.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider pt-1">Recent Earnings</p>
            {commissions.length === 0 ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
                  <Gift className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No earnings yet</p>
                  <p className="mt-1 text-xs">Commissions from your network will appear here</p>
                </CardContent>
              </Card>
            ) : (
              commissions.map((tx) => (
                <Card key={tx.id} className="border-white/10 bg-white/5">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tx.type === "cashback" ? "bg-secondary/20" : "bg-blue-500/20"}`}>
                      {tx.type === "cashback" ? (
                        <Gift className="h-4 w-4 text-secondary" />
                      ) : (
                        <Coins className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {tx.description || (tx.type === "cashback" ? "Cashback" : "Commission")}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {new Date(tx.created_at).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        <span className={tx.type === "cashback" ? "text-secondary/60" : "text-blue-400/60"}>
                          {tx.type === "cashback" ? "Cashback" : "Commission"}
                        </span>
                      </p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${tx.type === "cashback" ? "text-secondary" : "text-blue-400"}`}>
                      +RM {Number(tx.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-xs bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="font-display text-center text-white">Share to</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => { shareToWhatsApp(); setShowShareDialog(false); }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/10">
                <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </div>
              <span className="text-xs font-medium text-white">WhatsApp</span>
            </button>
            <button
              onClick={() => { shareToTelegram(); setShowShareDialog(false); }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0088cc]/10">
                <svg className="h-5 w-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              </div>
              <span className="text-xs font-medium text-white">Telegram</span>
            </button>
            <button
              onClick={() => { shareToFacebook(); setShowShareDialog(false); }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10">
                <svg className="h-5 w-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <span className="text-xs font-medium text-white">Facebook</span>
            </button>
            <button
              onClick={() => { shareToTwitter(); setShowShareDialog(false); }}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </div>
              <span className="text-xs font-medium text-white">X</span>
            </button>
          </div>
          <button
            onClick={() => { copyShareLink(); setShowShareDialog(false); }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors mt-1"
          >
            <Copy className="h-4 w-4 text-white/50" />
            <span className="text-sm font-medium text-white">Copy Link</span>
          </button>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Referral;
