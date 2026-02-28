import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import NocapLogo from "@/components/NocapLogo";
import {
  Shield, Search, ChevronRight, ChevronDown, Users, ArrowLeft, GitBranch, Loader2,
} from "lucide-react";

interface ProfileNode {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  referral_code: string;
  referred_by: string | null; // profile id of referrer
  childCount: number;
  walletBalance?: number;
}

const tierColors = [
  "border-yellow-400", "border-blue-400", "border-green-400", "border-purple-400", "border-pink-400",
];
const tierBg = [
  "bg-yellow-400/10", "bg-blue-400/10", "bg-green-400/10", "bg-purple-400/10", "bg-pink-400/10",
];

const TreeNode = ({
  node, depth, childrenMap, onChangeReferrer,
}: {
  node: ProfileNode;
  depth: number;
  childrenMap: Map<string, ProfileNode[]>;
  onChangeReferrer: (node: ProfileNode) => void;
}) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const children = childrenMap.get(node.id) || [];
  const colorIdx = Math.min(depth, tierColors.length - 1);

  return (
    <div className="ml-2 sm:ml-4">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border ${tierColors[colorIdx]} ${tierBg[colorIdx]} mb-1 cursor-pointer hover:bg-white/10 transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        {children.length > 0 ? (
          expanded ? <ChevronDown className="h-4 w-4 text-white/60 shrink-0" /> : <ChevronRight className="h-4 w-4 text-white/60 shrink-0" />
        ) : (
          <div className="w-4" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">
              {node.full_name || "Unnamed"}
            </span>
            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-secondary font-mono">
              {node.referral_code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
            {node.phone && <span>{node.phone}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {node.childCount}
            </span>
            {node.walletBalance !== undefined && (
              <span>RM {node.walletBalance.toFixed(2)}</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs shrink-0"
          onClick={(e) => { e.stopPropagation(); onChangeReferrer(node); }}
        >
          Change
        </Button>
      </div>
      {expanded && children.length > 0 && (
        <div className="border-l border-white/10 ml-3">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              onChangeReferrer={onChangeReferrer}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminReferralTree = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [isAiOnlyAdmin, setIsAiOnlyAdmin] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [profiles, setProfiles] = useState<ProfileNode[]>([]);
  const [wallets, setWallets] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ProfileNode | null>(null);
  const [newReferrerCode, setNewReferrerCode] = useState("");
  const [saving, setSaving] = useState(false);

  // Admin guard
  useEffect(() => {
    if (!user) { setSettingsLoading(false); return; }
    supabase
      .from("system_settings")
      .select("value")
      .eq("key", "ai_only_admin_ids")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const ids = data.value.split(",").map((id: string) => id.trim());
          setIsAiOnlyAdmin(ids.includes(user.id));
        }
        setSettingsLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && !adminLoading && !settingsLoading) {
      if (!isAdmin || isAiOnlyAdmin) navigate("/dashboard");
    }
  }, [authLoading, adminLoading, settingsLoading, isAdmin, isAiOnlyAdmin, user, navigate]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, walletsRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, phone, referral_code, referred_by"),
      supabase.from("wallets").select("user_id, balance").eq("wallet_type", "member"),
    ]);

    const profs = profilesRes.data || [];
    const walletMap = new Map<string, number>();
    (walletsRes.data || []).forEach((w) => walletMap.set(w.user_id, Number(w.balance)));
    setWallets(walletMap);

    // Count children per profile id
    const childCountMap = new Map<string, number>();
    profs.forEach((p) => {
      if (p.referred_by) {
        childCountMap.set(p.referred_by, (childCountMap.get(p.referred_by) || 0) + 1);
      }
    });

    const nodes: ProfileNode[] = profs.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      phone: p.phone,
      referral_code: p.referral_code,
      referred_by: p.referred_by,
      childCount: childCountMap.get(p.id) || 0,
      walletBalance: walletMap.get(p.user_id),
    }));

    setProfiles(nodes);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin && !isAiOnlyAdmin && user) loadData();
  }, [isAdmin, isAiOnlyAdmin, user, loadData]);

  // Build tree maps
  const { childrenMap, rootNodes, filteredNodes } = useMemo(() => {
    const cMap = new Map<string, ProfileNode[]>();
    const roots: ProfileNode[] = [];
    const profileById = new Map<string, ProfileNode>();

    profiles.forEach((p) => profileById.set(p.id, p));
    profiles.forEach((p) => {
      if (!p.referred_by) {
        roots.push(p);
      } else {
        const existing = cMap.get(p.referred_by) || [];
        existing.push(p);
        cMap.set(p.referred_by, existing);
      }
    });

    // Filter
    let filtered: ProfileNode[] | null = null;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = profiles.filter(
        (p) =>
          (p.full_name || "").toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          p.referral_code.toLowerCase().includes(q)
      );
    }

    return { childrenMap: cMap, rootNodes: roots, filteredNodes: filtered };
  }, [profiles, search]);

  const handleChangeReferrer = (node: ProfileNode) => {
    setSelectedNode(node);
    setNewReferrerCode("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedNode) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("admin-update-referrer", {
        body: {
          targetUserId: selectedNode.user_id,
          newReferrerCode: newReferrerCode.trim() || null,
        },
      });

      if (res.error) throw new Error(res.error.message || "Failed");
      const body = res.data;
      if (body?.error) throw new Error(body.error);

      toast({
        title: "Referrer updated",
        description: `${selectedNode.full_name || "User"} reassigned. ${body.descendantsRebuilt} descendant(s) rebuilt.`,
      });
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || adminLoading || settingsLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-primary text-white/40">Loading...</div>;
  }
  if (!isAdmin || isAiOnlyAdmin) return null;

  const currentReferrer = selectedNode?.referred_by
    ? profiles.find((p) => p.id === selectedNode.referred_by)
    : null;

  return (
    <div className="min-h-screen bg-primary pb-10">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <NocapLogo size="sm" />
          <Shield className="h-5 w-5 text-secondary" />
          <h1 className="text-xl font-bold text-secondary flex items-center gap-2">
            <GitBranch className="h-5 w-5" /> Referral Tree
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search by name, phone or referral code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="max-w-5xl mx-auto px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/40">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tree...
          </div>
        ) : filteredNodes ? (
          <div>
            <p className="text-white/50 text-sm mb-3">{filteredNodes.length} result(s)</p>
            {filteredNodes.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} childrenMap={childrenMap} onChangeReferrer={handleChangeReferrer} />
            ))}
          </div>
        ) : (
          <div>
            <p className="text-white/50 text-sm mb-3">
              {rootNodes.length} root user(s) · {profiles.length} total
            </p>
            {rootNodes.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} childrenMap={childrenMap} onChangeReferrer={handleChangeReferrer} />
            ))}
          </div>
        )}
      </div>

      {/* Change Referrer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-primary border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-secondary">Change Referrer</DialogTitle>
            <DialogDescription className="text-white/50">
              Reassign <strong className="text-white">{selectedNode?.full_name || "User"}</strong> ({selectedNode?.referral_code}) to a new referrer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50">Current Referrer</label>
              <p className="text-sm text-white">
                {currentReferrer ? `${currentReferrer.full_name || "Unnamed"} (${currentReferrer.referral_code})` : "None (root user)"}
              </p>
            </div>
            <div>
              <label className="text-xs text-white/50">New Referrer Code</label>
              <Input
                placeholder="Enter referral code (leave empty to remove)"
                value={newReferrerCode}
                onChange={(e) => setNewReferrerCode(e.target.value.toUpperCase())}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/20 text-white/70">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReferralTree;
