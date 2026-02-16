import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Layers } from
"lucide-react";

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
  5: "Tier 5"
};

const tierColors: Record<number, string> = {
  1: "bg-secondary/15 text-secondary",
  2: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]",
  3: "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  4: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  5: "bg-muted text-muted-foreground"
};

const Referral = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<{full_name: string;referral_code: string;} | null>(null);
  const [referrals, setReferrals] = useState<ReferralMember[]>([]);
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
      supabase.
      from("profiles").
      select("full_name, referral_code").
      eq("user_id", user.id).
      maybeSingle(),
      supabase.
      from("referral_tree").
      select("user_id, tier").
      eq("ancestor_id", user.id).
      order("tier", { ascending: true }),
      supabase.
      from("transactions").
      select("id, amount, description, created_at, type").
      eq("user_id", user.id).
      in("type", ["cashback", "commission"]).
      eq("status", "completed").
      order("created_at", { ascending: false }).
      limit(20)]
      );

      if (profileRes.data) setProfile(profileRes.data);

      // Fetch names for referral members
      if (referralRes.data && referralRes.data.length > 0) {
        const userIds = referralRes.data.map((r) => r.user_id);
        const { data: profilesData } = await supabase.
        from("profiles").
        select("user_id, full_name").
        in("user_id", userIds);

        const nameMap = new Map(profilesData?.map((p) => [p.user_id, p.full_name]) || []);

        setReferrals(
          referralRes.data.map((r) => ({
            user_id: r.user_id,
            full_name: nameMap.get(r.user_id) || null,
            tier: r.tier
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

  const getShareUrl = () => `${window.location.origin}/auth?ref=${profile?.referral_code || ""}`;
  const getShareText = () => `Join NOcap and earn cashback! Use my referral code *${profile?.referral_code}* to sign up: ${getShareUrl()}`;

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText())}`, '_blank');
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(`Join NOcap! Use my code ${profile?.referral_code}`)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join NOcap and earn cashback! Use my referral code ${profile?.referral_code}`)}&url=${encodeURIComponent(getShareUrl())}`, '_blank');
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

  const referralsByTier = referrals.reduce<Record<number, ReferralMember[]>>((acc, r) => {
    if (!acc[r.tier]) acc[r.tier] = [];
    acc[r.tier].push(r);
    return acc;
  }, {});

  const tierCounts = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    count: referralsByTier[tier]?.length || 0
  }));

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pb-14 pt-8 text-primary-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-primary-foreground/10 transition-colors">
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
                <Users className="mx-auto h-5 w-5 text-secondary" />
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
        <Card className="mt-4 border-secondary/20 bg-secondary/5">
          <CardContent className="p-5">
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-card p-3 shadow-sm">
                <QRCodeSVG
                  value={`${window.location.origin}/auth?ref=${profile?.referral_code || ""}`}
                  size={140}
                  level="M"
                  fgColor="hsl(0, 0%, 5%)" />

              </div>
               <p className="mt-3 font-display text-2xl font-bold tracking-widest text-foreground">
                {profile?.referral_code || "—"}
              </p>
              <p className="mt-1 text-xs text-foreground">Share your code to grow your network</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={copyReferralCode} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy Code
                </Button>
                <Button size="sm" onClick={() => setShowShareDialog(true)} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Share
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
              {tierCounts.map(({ tier, count }) =>
              <div
                key={tier}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${tierColors[tier]}`}>

                  T{tier}: {count}
                </div>
              )}
            </div>

            {referrals.length === 0 ?
            <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No referrals yet</p>
                  <p className="mt-1 text-xs">Share your code to start building your network</p>
                </CardContent>
              </Card> :

            [1, 2, 3, 4, 5].map((tier) => {
              const members = referralsByTier[tier];
              if (!members || members.length === 0) return null;
              const isExpanded = expandedTiers[tier] ?? false;

              return (
                <Card key={tier} className="border-border/50 overflow-hidden">
                    <button
                    onClick={() => toggleTier(tier)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors">

                      <div className="flex items-center gap-2">
                        <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierColors[tier]}`}>
                          T{tier}
                        </div>
                        <span className="text-sm font-medium">{tierLabels[tier]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        {isExpanded ?
                      <ChevronDown className="h-4 w-4 text-muted-foreground" /> :

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                      </div>
                    </button>
                    {isExpanded &&
                  <div className="border-t border-border/50">
                        {members.map((member) =>
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                              {(member.full_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{member.full_name || "Member"}</span>
                          </div>
                    )}
                      </div>
                  }
                  </Card>);

            })
            }
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

            {commissions.length === 0 ?
            <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Gift className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No earnings yet</p>
                  <p className="mt-1 text-xs">Commissions from your network will appear here</p>
                </CardContent>
              </Card> :

            commissions.map((tx) =>
            <Card key={tx.id} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                     <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                       <Gift className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || (tx.type === "cashback" ? "Cashback" : "Commission")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-secondary tabular-nums">
                      +RM {Number(tx.amount).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
            )
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Share to</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {shareToWhatsApp();setShowShareDialog(false);}}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-muted transition-colors">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/10">
                <svg className="h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </div>
              <span className="text-xs font-medium">WhatsApp</span>
            </button>
            <button
              onClick={() => {shareToTelegram();setShowShareDialog(false);}}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-muted transition-colors">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0088cc]/10">
                <svg className="h-5 w-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              </div>
              <span className="text-xs font-medium">Telegram</span>
            </button>
            <button
              onClick={() => {shareToFacebook();setShowShareDialog(false);}}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-muted transition-colors">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2]/10">
                <svg className="h-5 w-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <span className="text-xs font-medium">Facebook</span>
            </button>
            <button
              onClick={() => {shareToTwitter();setShowShareDialog(false);}}
              className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:bg-muted transition-colors">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
                <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </div>
              <span className="text-xs font-medium">X</span>
            </button>
          </div>
          <button
            onClick={() => {copyShareLink();setShowShareDialog(false);}}
            className="flex items-center justify-center gap-2 rounded-xl border border-border p-3 hover:bg-muted transition-colors mt-1">

            <Copy className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Copy Link</span>
          </button>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>);

};

export default Referral;