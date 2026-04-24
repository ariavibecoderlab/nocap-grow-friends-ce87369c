import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCached, setCached, invalidate as invalidateReferralCache } from "@/lib/referralCache";
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
  Coins,
  Network,
  Phone,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
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

  const [profile, setProfile] = useState<{ id: string; full_name: string; referral_code: string } | null>(null);
  const [referrals, setReferrals] = useState<ReferralMember[]>([]);
  const [commissions, setCommissions] = useState<CommissionTx[]>([]);
  const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({ 1: true });
  const [loadingData, setLoadingData] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [tierCountsFromRpc, setTierCountsFromRpc] = useState<Record<number, number>>({});
  const [beyondTier5Count, setBeyondTier5Count] = useState(0);
  const [recountLoading, setRecountLoading] = useState(false);
  const [recountResult, setRecountResult] = useState<{ direct: number; total: number; at: Date } | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [lastFreshAt, setLastFreshAt] = useState<Date | null>(null);
  const [servedFromCache, setServedFromCache] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchReferralsFromProfiles = useCallback(async (rootProfileId: string): Promise<ReferralMember[]> => {
    let currentParentIds = [rootProfileId];
    const collected: Array<{ id: string; user_id: string; full_name: string | null; phone: string | null; tier: number }> = [];

    for (let tier = 1; tier <= 5 && currentParentIds.length > 0; tier++) {
      const nextLevel: Array<{ id: string; user_id: string; full_name: string | null; phone: string | null; tier: number }> = [];

      // Batch parent IDs into chunks of 200 for the IN() clause
      const PARENT_BATCH = 200;
      const PAGE = 1000;
      for (let i = 0; i < currentParentIds.length; i += PARENT_BATCH) {
        const batch = currentParentIds.slice(i, i + PARENT_BATCH);

        // Paginate within each IN() query to bypass the 1000-row default cap
        let from = 0;
        while (true) {
          const to = from + PAGE - 1;
          const { data, error } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, phone")
            .in("referred_by", batch)
            .range(from, to);

          if (error) throw error;
          if (!data || data.length === 0) break;

          nextLevel.push(...data.map((row) => ({ ...row, tier })));
          if (data.length < PAGE) break;
          from += PAGE;
        }
      }

      collected.push(...nextLevel);
      currentParentIds = nextLevel.map((row) => row.id);
    }

    const tier1Ids = collected.filter((row) => row.tier === 1).map((row) => row.user_id);
    let emailMap = new Map<string, string>();
    if (tier1Ids.length > 0) {
      const { data: emailsData } = await supabase.rpc("get_referral_emails", { referral_user_ids: tier1Ids });
      emailMap = new Map(((emailsData as { user_id: string; email: string }[] | null) || []).map((entry) => [entry.user_id, entry.email]));
    }

    return collected.map((row) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      phone: row.tier === 1 ? row.phone : null,
      email: row.tier === 1 ? emailMap.get(row.user_id) || null : null,
      tier: row.tier,
    }));
  }, []);

  const fetchAllEarnings = useCallback(async (userId: string): Promise<CommissionTx[]> => {
    const allRows: CommissionTx[] = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, description, created_at, type")
        .eq("user_id", userId)
        .in("type", ["cashback", "commission"])
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!data?.length) break;

      allRows.push(...(data as CommissionTx[]));
      if (data.length < pageSize) break;
    }

    return allRows;
  }, []);

  const fetchData = useCallback(async (opts?: { forceRefresh?: boolean; silent?: boolean }) => {
    if (!user) return;

    const cached = !opts?.forceRefresh ? getCached(user.id) : null;
    if (cached) {
      // SWR: hydrate UI instantly from cache so the page renders without waiting on the network
      setReferrals(cached.referrals);
      setTierCountsFromRpc(cached.tierCounts);
      setBeyondTier5Count(cached.beyondTier5Count);
      setLoadingData(false);
      setServedFromCache(true);
    } else if (!opts?.silent) {
      setLoadingData(true);
      setServedFromCache(false);
    }

    // Always revalidate in the background — flag so UI can show a subtle indicator
    setIsRevalidating(true);

    try {
      const [profileRes, commissionRows, deepCountRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, referral_code").eq("user_id", user.id).maybeSingle(),
        fetchAllEarnings(user.id),
        supabase.rpc("get_deep_network_count", { p_user_id: user.id }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        const profileReferrals = await fetchReferralsFromProfiles(profileRes.data.id);

        const derivedTierCounts = profileReferrals.reduce<Record<number, number>>((acc, row) => {
          acc[row.tier] = (acc[row.tier] || 0) + 1;
          return acc;
        }, {});

        const beyond = (deepCountRes.data && Array.isArray(deepCountRes.data) && deepCountRes.data.length > 0)
          ? Number(deepCountRes.data[0].beyond_tier5) || 0
          : 0;

        // Diff against cached snapshot to decide whether to notify the user
        const prevDirect = cached?.tierCounts[1] || 0;
        const prevTotal = cached
          ? Object.values(cached.tierCounts).reduce((s, c) => s + c, 0) + cached.beyondTier5Count
          : null;
        const nextDirect = derivedTierCounts[1] || 0;
        const nextTotal = Object.values(derivedTierCounts).reduce((s, c) => s + c, 0) + beyond;
        const counts_changed = prevTotal !== null && (prevDirect !== nextDirect || prevTotal !== nextTotal);

        // Apply fresh data
        setReferrals(profileReferrals);
        setTierCountsFromRpc(derivedTierCounts);
        setBeyondTier5Count(beyond);
        setLastFreshAt(new Date());
        setServedFromCache(false);

        // Persist to cache for next visit / page refresh
        setCached(user.id, {
          referrals: profileReferrals,
          tierCounts: derivedTierCounts,
          beyondTier5Count: beyond,
        });

        if (counts_changed) {
          toast({
            title: "Network updated",
            description: `Direct: ${nextDirect} • Total: ${nextTotal}`,
          });
        }
      } else {
        setProfile(null);
        setReferrals([]);
        setTierCountsFromRpc({});
        setBeyondTier5Count(0);
        invalidateReferralCache(user.id);
      }

      setCommissions(commissionRows);
    } finally {
      setLoadingData(false);
      setIsRevalidating(false);
    }
  }, [fetchAllEarnings, fetchReferralsFromProfiles, user, toast]);

  const handleRecount = useCallback(async () => {
    if (!user || !profile) return;
    setRecountLoading(true);
    try {
      // Recount always bypasses cache
      invalidateReferralCache(user.id);

      const [rows, deepCountRes] = await Promise.all([
        fetchReferralsFromProfiles(profile.id),
        supabase.rpc("get_deep_network_count", { p_user_id: user.id }),
      ]);
      setReferrals(rows);
      const derived = rows.reduce<Record<number, number>>((acc, r) => {
        acc[r.tier] = (acc[r.tier] || 0) + 1;
        return acc;
      }, {});
      setTierCountsFromRpc(derived);

      let beyond = 0;
      if (deepCountRes.data && Array.isArray(deepCountRes.data) && deepCountRes.data.length > 0) {
        beyond = Number(deepCountRes.data[0].beyond_tier5) || 0;
        setBeyondTier5Count(beyond);
      }

      // Persist freshly-recounted values to cache
      setCached(user.id, {
        referrals: rows,
        tierCounts: derived,
        beyondTier5Count: beyond,
      });

      const direct = derived[1] || 0;
      const total = Object.values(derived).reduce((s, c) => s + c, 0) + beyond;
      setRecountResult({ direct, total, at: new Date() });
      toast({ title: "Recount complete", description: `Direct: ${direct} • Network: ${total}` });
    } catch (err) {
      console.error("Recount error:", err);
      toast({ title: "Recount failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setRecountLoading(false);
    }
  }, [user, profile, fetchReferralsFromProfiles, toast]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [fetchData, user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`referral-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Earnings change — keep network cache, just refresh in background
          fetchData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referral_tree",
          filter: `ancestor_id=eq.${user.id}`,
        },
        () => {
          // Network membership changed — invalidate then refetch
          invalidateReferralCache(user.id);
          fetchData({ forceRefresh: true });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, user]);

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  const getShareUrl = () => `https://nocap.life/auth?ref=${profile?.referral_code || ""}`;
  const getShareText = () => `Join NOcap and earn cashback! Use my referral code *${profile?.referral_code}* to sign up: ${getShareUrl()}`;

  const generateQrImage = async (): Promise<File | null> => {
    try {
      const svgEl = document.querySelector('#referral-qr-code svg') as SVGElement;
      if (!svgEl) return null;
      
      const canvas = document.createElement('canvas');
      const size = 512;
      const padding = 40;
      const totalSize = size + padding * 2;
      canvas.width = totalSize;
      canvas.height = totalSize + 80; // extra space for text
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR code
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(url);

      // Draw referral code text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Code: ${profile?.referral_code || ''}`, canvas.width / 2, size + padding + 40);

      // Draw link text
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('nocap.life', canvas.width / 2, size + padding + 68);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return null;
      return new File([blob], `nocap-referral-${profile?.referral_code || 'code'}.png`, { type: 'image/png' });
    } catch (e) {
      console.error('Error generating QR image:', e);
      return null;
    }
  };

  const handleShare = async () => {
    const shareText = `Join NOcap and earn cashback!\n\nUse my referral code: ${profile?.referral_code}\nSign up here: ${getShareUrl()}`;
    
    try {
      const qrFile = await generateQrImage();
      
      if (navigator.share) {
        const shareData: ShareData = {
          title: 'Join NOcap',
          text: shareText,
        };
        
        if (qrFile && navigator.canShare?.({ files: [qrFile] })) {
          shareData.files = [qrFile];
        }
        
        await navigator.share(shareData);
      } else {
        // Fallback: open share dialog
        setShowShareDialog(true);
      }
    } catch (err: any) {
      // User cancelled share - ignore AbortError
      if (err?.name !== 'AbortError') {
        setShowShareDialog(true);
      }
    }
  };

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
    count: tierCountsFromRpc[tier] || referralsByTier[tier]?.length || 0,
  }));

  const totalNetworkCount = (Object.values(tierCountsFromRpc).reduce((s, c) => s + c, 0) || referrals.length) + beyondTier5Count;

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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate("/dashboard")} className="rounded-full p-1 hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <h1 className="font-display text-xl font-bold text-white truncate">My Network</h1>
              {(isRevalidating || servedFromCache) && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70"
                  aria-live="polite"
                  title={servedFromCache ? "Showing cached data — checking for updates…" : "Updating in background…"}
                >
                  <RefreshCw className={`h-3 w-3 ${isRevalidating ? "animate-spin" : ""}`} />
                  {isRevalidating ? "Updating…" : "Cached"}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecount}
              disabled={recountLoading || isRevalidating}
              className="shrink-0 gap-1.5 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              aria-label="Refresh network — bypass cache and re-fetch latest counts"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recountLoading ? "animate-spin" : ""}`} />
              <span className="text-xs">{recountLoading ? "Refreshing..." : "Refresh"}</span>
            </Button>
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
                <p className="mt-1 font-display text-xl font-bold text-white">{tierCountsFromRpc[1] || referrals.filter((r) => r.tier === 1).length}</p>
                <p className="text-[10px] text-white/40">Direct</p>
              </div>
              <div>
                <Network className="mx-auto h-4 w-4 text-secondary" />
                <p className="mt-1 font-display text-xl font-bold text-white">{totalNetworkCount}</p>
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
              <div id="referral-qr-code" className="rounded-xl bg-white p-3 shadow-sm">
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
                <Button size="sm" onClick={handleShare} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90">
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
            {/* Network Recount Panel */}
            <Card className="border-secondary/20 bg-secondary/5 mb-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Network Recount</p>
                    <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
                      Re-tally direct &amp; total network using paginated logic (handles 1000+ members).
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white/5 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-white/40">Direct (T1)</p>
                        <p className="font-display text-lg font-bold text-white tabular-nums">
                          {recountResult ? recountResult.direct : (tierCountsFromRpc[1] || 0)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-white/40">Total Network</p>
                        <p className="font-display text-lg font-bold text-white tabular-nums">
                          {recountResult ? recountResult.total : totalNetworkCount}
                        </p>
                      </div>
                    </div>
                    {recountResult && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-secondary/80">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Recounted at {recountResult.at.toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRecount}
                    disabled={recountLoading}
                    className="shrink-0 gap-1.5 bg-secondary text-primary hover:bg-secondary/90"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${recountLoading ? "animate-spin" : ""}`} />
                    {recountLoading ? "Counting..." : "Recount Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

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

            {/* Tier Breakdown Table - cross-check direct vs multi-tier network */}
            <Card className="border-white/10 bg-white/5 mb-4">
              <CardContent className="p-0">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Tier Breakdown</p>
                  <p className="text-[10px] text-white/40">Direct vs Multi-tier</p>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-white/10 bg-white/5">
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">Tier</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">Label</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-white/50">Members</th>
                        <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-white/50">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tierCounts.map(({ tier, count }) => {
                        const colors = tierColors[tier];
                        const pct = totalNetworkCount > 0 ? (count / totalNetworkCount) * 100 : 0;
                        const isDirect = tier === 1;
                        return (
                          <tr key={tier} className="border-b border-white/5 last:border-b-0">
                            <td className="px-4 py-2.5">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                                T{tier}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-white/70">
                              {isDirect ? "Direct" : `Tier ${tier}`}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-white">
                              {count.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs tabular-nums text-white/50">
                              {pct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                      {beyondTier5Count > 0 && (
                        <tr className="border-b border-white/5">
                          <td className="px-4 py-2.5">
                            <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white/50">
                              T6+
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-white/70">Beyond Tier 5</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-white">
                            {beyondTier5Count.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs tabular-nums text-white/50">
                            {totalNetworkCount > 0 ? ((beyondTier5Count / totalNetworkCount) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 bg-secondary/10">
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-secondary">
                          Total Network
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-secondary">
                          {totalNetworkCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs tabular-nums text-secondary/70">
                          100%
                        </td>
                      </tr>
                      <tr className="border-t border-white/5 bg-white/5">
                        <td colSpan={2} className="px-4 py-2 text-[11px] text-white/50">
                          Direct (Tier 1)
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-white/70">
                          {(tierCounts[0]?.count || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-[11px] tabular-nums text-white/40">
                          {totalNetworkCount > 0 ? (((tierCounts[0]?.count || 0) / totalNetworkCount) * 100).toFixed(1) : "0.0"}%
                        </td>
                      </tr>
                      <tr className="bg-white/5">
                        <td colSpan={2} className="px-4 py-2 text-[11px] text-white/50">
                          Multi-tier (T2–T5{beyondTier5Count > 0 ? "+" : ""})
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-white/70">
                          {(totalNetworkCount - (tierCounts[0]?.count || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-[11px] tabular-nums text-white/40">
                          {totalNetworkCount > 0 ? (((totalNetworkCount - (tierCounts[0]?.count || 0)) / totalNetworkCount) * 100).toFixed(1) : "0.0"}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {totalNetworkCount === 0 ? (
              <Card className="border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center justify-center py-10 text-white/40">
                  <UserPlus className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No referrals yet</p>
                  <p className="mt-1 text-xs">Share your code to start building your network</p>
                </CardContent>
              </Card>
            ) : (
              /* Visual Tree with connecting lines */
              <div className="relative">
                {/* You (root node) */}
                <div className="flex items-center gap-3 mb-2 px-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary text-sm font-bold">
                    {(profile?.full_name || "Y").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{profile?.full_name || "You"}</p>
                    <p className="text-[10px] text-white/40">Root • {totalNetworkCount} in network</p>
                  </div>
                </div>

                {/* Tier sections with visual tree lines */}
                {[1, 2, 3, 4, 5].map((tier) => {
                  const members = referralsByTier[tier];
                  if (!members || members.length === 0) return null;
                  const isExpanded = expandedTiers[tier] ?? false;
                  const colors = tierColors[tier];

                  return (
                    <div key={tier} className="relative ml-5">
                      {/* Vertical connector line from parent */}
                      <div className={`absolute left-0 top-0 h-full w-px border-l-2 border-dashed ${colors.line}`} />

                      {/* Tier header with horizontal branch */}
                      <div className="relative pl-6">
                        {/* Horizontal branch line */}
                        <div className={`absolute left-0 top-1/2 w-5 border-t-2 border-dashed ${colors.line}`} />
                        {/* Branch dot */}
                        <div className={`absolute left-[-5px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ${colors.dot} ring-2 ring-primary`} />

                        <button
                          onClick={() => toggleTier(tier)}
                          className="flex w-full items-center justify-between rounded-lg p-2.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                              T{tier}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white">{tierLabels[tier]}</span>
                              <span className="ml-2 text-[10px] text-white/30">{tierCommissionLabels[tier]} per txn</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${colors.text}`}>{members.length}</span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-white/40" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-white/40" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Expanded member list */}
                      {isExpanded && (
                        <div className="relative pl-6 pb-1">
                          {members.map((member, idx) => (
                            <div key={member.user_id} className="relative">
                              {/* Connecting line for each member */}
                              <div className={`absolute left-0 top-0 w-4 border-t border-dashed ${colors.line}`} style={{ top: '50%' }} />
                              {idx < members.length - 1 && (
                                <div className={`absolute left-0 top-0 h-full w-px border-l border-dashed ${colors.line}`} />
                              )}
                              {idx === members.length - 1 && (
                                <div className={`absolute left-0 top-0 h-1/2 w-px border-l border-dashed ${colors.line}`} />
                              )}
                              {/* Small dot */}
                              <div className={`absolute left-[-3px] top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${colors.dot}`} />

                              <div className="flex items-center gap-3 pl-5 py-2">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg} text-[10px] font-semibold ${colors.text}`}>
                                  {(member.full_name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm text-white/80 truncate block">{member.full_name || "Member"}</span>
                                  {member.tier === 1 && (member.phone || member.email) && (
                                    <span className="text-[10px] text-white/40 truncate block">
                                      {[member.phone, member.email].filter(Boolean).join(" · ")}
                                    </span>
                                  )}
                                </div>
                                {member.tier === 1 && member.phone && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <a
                                      href={`tel:${member.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-secondary/20 transition-colors"
                                      title="Call"
                                    >
                                      <Phone className="h-3.5 w-3.5 text-secondary" />
                                    </a>
                                    <a
                                      href={`https://wa.me/${member.phone.replace(/[^0-9]/g, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-green-500/20 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5 text-green-400" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {beyondTier5Count > 0 && (
                  <div className="ml-5 relative pl-6 mt-1 mb-2">
                    <div className="absolute left-0 top-0 h-1/2 w-px border-l-2 border-dashed border-white/10" />
                    <div className="absolute left-0 top-1/2 w-5 border-t-2 border-dashed border-white/10" />
                    <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white/20 ring-2 ring-primary" />
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-white/30 shrink-0" />
                      <p className="text-xs text-white/50">
                        Plus <span className="font-semibold text-white/70">{beyondTier5Count}</span> more members beyond Tier 5
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
