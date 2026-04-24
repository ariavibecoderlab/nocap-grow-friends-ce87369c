// Re-exports the referral tree page content for use within AdminPortal
// This is a thin wrapper that renders the full referral tree without the page-level guards
// (AdminPortal already handles auth/admin checks)
import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Search, ChevronRight, ChevronDown, Users, GitBranch, Loader2, Unlink, Trash2, CheckSquare, X, RefreshCw,
} from "lucide-react";
import { broadcastInvalidate } from "@/lib/referralCache";

interface ProfileNode {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  referral_code: string;
  referred_by: string | null;
  childCount: number;
  walletBalance?: number;
  email?: string;
}

const tierColors = [
  "border-yellow-400", "border-blue-400", "border-green-400", "border-purple-400", "border-pink-400",
];
const tierBg = [
  "bg-yellow-400/10", "bg-blue-400/10", "bg-green-400/10", "bg-purple-400/10", "bg-pink-400/10",
];

const TreeNode = ({
  node, depth, childrenMap, onChangeReferrer, onRemoveReferrer, onDeleteMember, onClearCache,
  selectMode, selectedIds, onToggleSelect,
}: {
  node: ProfileNode;
  depth: number;
  childrenMap: Map<string, ProfileNode[]>;
  onChangeReferrer: (node: ProfileNode) => void;
  onRemoveReferrer: (node: ProfileNode) => void;
  onDeleteMember: (node: ProfileNode) => void;
  onClearCache: (node: ProfileNode) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (node: ProfileNode) => void;
}) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const children = childrenMap.get(node.id) || [];
  const colorIdx = Math.min(depth, tierColors.length - 1);

  return (
    <div className="ml-2 sm:ml-4">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border ${tierColors[colorIdx]} ${tierBg[colorIdx]} mb-1 cursor-pointer hover:bg-muted/30 transition-colors`}
        onClick={() => selectMode ? onToggleSelect(node) : setExpanded(!expanded)}
      >
        {selectMode && (
          <Checkbox
            checked={selectedIds.has(node.user_id)}
            onCheckedChange={() => onToggleSelect(node)}
            onClick={(e) => e.stopPropagation()}
            className="border-muted-foreground data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
          />
        )}
        {!selectMode && children.length > 0 ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-4" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {node.full_name || "Unnamed"}
            </span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-secondary font-mono">
              {node.referral_code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            {node.email && <span>{node.email}</span>}
            {node.phone && <span>{node.phone}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {node.childCount}
            </span>
            {node.walletBalance !== undefined && (
              <span>RM {node.walletBalance.toFixed(2)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/10 text-xs px-2" onClick={(e) => { e.stopPropagation(); onClearCache(node); }} title="Clear referral network cache">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs px-2" onClick={(e) => { e.stopPropagation(); onDeleteMember(node); }} title="Delete member">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {node.referred_by && (
            <Button variant="ghost" size="sm" className="text-orange-400/70 hover:text-orange-400 hover:bg-orange-400/10 text-xs px-2" onClick={(e) => { e.stopPropagation(); onRemoveReferrer(node); }} title="Remove referrer">
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs" onClick={(e) => { e.stopPropagation(); onChangeReferrer(node); }}>
            Change
          </Button>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className="border-l border-border ml-3">
          {children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} childrenMap={childrenMap} onChangeReferrer={onChangeReferrer} onRemoveReferrer={onRemoveReferrer} onDeleteMember={onDeleteMember} onClearCache={onClearCache} selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminReferralTreeContent = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ProfileNode | null>(null);
  const [newReferrerCode, setNewReferrerCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [nodeToRemove, setNodeToRemove] = useState<ProfileNode | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<ProfileNode | null>(null);
  const [deleteReassignCode, setDeleteReassignCode] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkReassignCode, setBulkReassignCode] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const fetchAllProfiles = async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase.from("profiles").select("id, user_id, full_name, phone, referral_code, referred_by").range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };
    const fetchAllWallets = async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase.from("wallets").select("user_id, balance").eq("wallet_type", "member").range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    };

    const [profs, walletsData, emailsRes] = await Promise.all([
      fetchAllProfiles(),
      fetchAllWallets(),
      supabase.rpc("get_all_user_emails"),
    ]);

    const walletMap = new Map<string, number>();
    walletsData.forEach((w: any) => walletMap.set(w.user_id, Number(w.balance)));

    const emailMap = new Map<string, string>();
    ((emailsRes.data || []) as any[]).forEach((e) => emailMap.set(e.user_id, e.email));

    const childCountMap = new Map<string, number>();
    profs.forEach((p: any) => { if (p.referred_by) childCountMap.set(p.referred_by, (childCountMap.get(p.referred_by) || 0) + 1); });

    setProfiles(profs.map((p: any) => ({
      id: p.id, user_id: p.user_id, full_name: p.full_name, phone: p.phone,
      referral_code: p.referral_code, referred_by: p.referred_by,
      childCount: childCountMap.get(p.id) || 0, walletBalance: walletMap.get(p.user_id),
      email: emailMap.get(p.user_id),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const { childrenMap, rootNodes, filteredNodes } = useMemo(() => {
    const cMap = new Map<string, ProfileNode[]>();
    const roots: ProfileNode[] = [];
    profiles.forEach((p) => {
      if (!p.referred_by) roots.push(p);
      else { const existing = cMap.get(p.referred_by) || []; existing.push(p); cMap.set(p.referred_by, existing); }
    });
    let filtered: ProfileNode[] | null = null;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = profiles.filter((p) => (p.full_name || "").toLowerCase().includes(q) || (p.phone || "").includes(q) || p.referral_code.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q));
    }
    return { childrenMap: cMap, rootNodes: roots, filteredNodes: filtered };
  }, [profiles, search]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const totalPages = Math.ceil(rootNodes.length / pageSize);
  const paginatedRoots = rootNodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleChangeReferrer = (node: ProfileNode) => { setSelectedNode(node); setNewReferrerCode(""); setDialogOpen(true); };
  const handleRemoveReferrer = (node: ProfileNode) => {
    if (!node.referred_by) { toast({ title: "No changes needed", description: "Already a root user." }); return; }
    setNodeToRemove(node); setRemoveConfirmOpen(true);
  };
  const handleDeleteMember = (node: ProfileNode) => { setNodeToDelete(node); setDeleteReassignCode(""); setDeleteDialogOpen(true); };
  const handleClearCache = async (node: ProfileNode) => {
    const ok = await broadcastInvalidate(node.user_id, supabase as any);
    toast({
      title: ok ? "Cache clear signal sent" : "Failed to send signal",
      description: ok
        ? `${node.full_name || "User"}'s next visit to My Network will fetch fresh data. Open sessions will refresh now.`
        : "Try again in a moment.",
      variant: ok ? "default" : "destructive",
    });
  };
  const handleToggleSelect = (node: ProfileNode) => {
    setSelectedUserIds((prev) => { const next = new Set(prev); if (next.has(node.user_id)) next.delete(node.user_id); else next.add(node.user_id); return next; });
  };
  const handleToggleSelectMode = () => { setSelectMode((prev) => { if (prev) setSelectedUserIds(new Set()); return !prev; }); };

  const confirmBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setSaving(true);
    let s = 0, f = 0;
    for (const userId of selectedUserIds) {
      try {
        const res = await supabase.functions.invoke("admin-delete-member", { body: { targetUserId: userId, reassignReferrerCode: bulkReassignCode.trim() || null } });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
        s++;
      } catch { f++; }
    }
    toast({ title: "Bulk delete complete", description: `${s} deleted, ${f} failed.`, variant: f > 0 ? "destructive" : "default" });
    setSelectedUserIds(new Set()); setSelectMode(false); setBulkDeleteDialogOpen(false); setBulkReassignCode(""); setSaving(false); loadData();
  };

  const confirmDeleteMember = async () => {
    if (!nodeToDelete) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("admin-delete-member", { body: { targetUserId: nodeToDelete.user_id, reassignReferrerCode: deleteReassignCode.trim() || null } });
      if (res.error) throw new Error(res.error.message || "Failed");
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Member deleted", description: `${nodeToDelete.full_name || "User"} deleted. ${res.data.childrenReassigned} child(ren) reassigned.` });
      setDeleteDialogOpen(false); setNodeToDelete(null); loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const confirmRemoveReferrer = async () => {
    if (!nodeToRemove) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("admin-update-referrer", { body: { targetUserId: nodeToRemove.user_id, newReferrerCode: null } });
      if (res.error) throw new Error(res.error.message || "Failed");
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Referrer removed", description: `${nodeToRemove.full_name || "User"} is now a root user.` });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); setRemoveConfirmOpen(false); setNodeToRemove(null); }
  };

  const handleSave = async () => {
    if (!selectedNode) return;
    const currentReferrerNode = selectedNode.referred_by ? profiles.find((p) => p.id === selectedNode.referred_by) : null;
    const currentCode = currentReferrerNode?.referral_code || "";
    const newCode = newReferrerCode.trim().toUpperCase();
    if (newCode === currentCode.toUpperCase()) { toast({ title: "No changes needed" }); return; }
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("admin-update-referrer", { body: { targetUserId: selectedNode.user_id, newReferrerCode: newReferrerCode.trim() || null } });
      if (res.error) throw new Error(res.error.message || "Failed");
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Referrer updated", description: `${selectedNode.full_name || "User"} reassigned.` });
      setDialogOpen(false); loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const currentReferrer = selectedNode?.referred_by ? profiles.find((p) => p.id === selectedNode.referred_by) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><GitBranch className="h-5 w-5 text-secondary" /> Referral Tree</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the referral hierarchy</p>
        </div>
        <Button variant={selectMode ? "destructive" : "outline"} size="sm" onClick={handleToggleSelectMode}>
          {selectMode ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><CheckSquare className="h-4 w-4 mr-1" /> Select</>}
        </Button>
      </div>

      {selectMode && selectedUserIds.size > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{selectedUserIds.size} selected</span>
          <Button size="sm" variant="destructive" onClick={() => { setBulkReassignCode(""); setBulkDeleteDialogOpen(true); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone or referral code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tree...</div>
      ) : filteredNodes ? (
        <div>
          <p className="text-muted-foreground text-sm mb-3">{filteredNodes.length} result(s)</p>
          {filteredNodes.map((node) => <TreeNode key={node.id} node={node} depth={0} childrenMap={childrenMap} onChangeReferrer={handleChangeReferrer} onRemoveReferrer={handleRemoveReferrer} onDeleteMember={handleDeleteMember} onClearCache={handleClearCache} selectMode={selectMode} selectedIds={selectedUserIds} onToggleSelect={handleToggleSelect} />)}
        </div>
      ) : (
        <div>
          <p className="text-muted-foreground text-sm mb-3">{rootNodes.length} root user(s) · {profiles.length} total · Page {currentPage}/{totalPages}</p>
          {paginatedRoots.map((node) => <TreeNode key={node.id} node={node} depth={0} childrenMap={childrenMap} onChangeReferrer={handleChangeReferrer} onRemoveReferrer={handleRemoveReferrer} onDeleteMember={handleDeleteMember} onClearCache={handleClearCache} selectMode={selectMode} selectedIds={selectedUserIds} onToggleSelect={handleToggleSelect} />)}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</Button>
              <span className="text-muted-foreground text-sm">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="bg-muted border border-border text-foreground text-sm rounded px-2 py-1">
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Change Referrer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-secondary">Change Referrer</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Reassign <strong className="text-foreground">{selectedNode?.full_name || "User"}</strong> ({selectedNode?.referral_code}) to a new referrer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Current Referrer</label>
              <p className="text-sm text-foreground">{currentReferrer ? `${currentReferrer.full_name || "Unnamed"} (${currentReferrer.referral_code})` : "None (root user)"}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">New Referrer Code</label>
              <Input placeholder="Enter referral code (leave empty to remove)" value={newReferrerCode} onChange={(e) => setNewReferrerCode(e.target.value.toUpperCase())} className="bg-muted/50 border-border mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{saving ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Referrer */}
      <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Remove Referrer</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Detach <strong className="text-foreground">{nodeToRemove?.full_name || "this user"}</strong> from their referrer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveReferrer} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Member */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Member</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Permanently delete <strong className="text-foreground">{nodeToDelete?.full_name || "this user"}</strong> ({nodeToDelete?.referral_code}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Reassign children to referral code</label>
              <Input placeholder="Enter referral code (leave empty = root users)" value={deleteReassignCode} onChange={(e) => setDeleteReassignCode(e.target.value.toUpperCase())} className="bg-muted/50 border-border mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmDeleteMember} disabled={saving} variant="destructive">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}{saving ? "Deleting..." : "Delete Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete {selectedUserIds.size} Member(s)</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Reassign children to referral code (optional)</label>
              <Input placeholder="Enter referral code (leave empty = root users)" value={bulkReassignCode} onChange={(e) => setBulkReassignCode(e.target.value.toUpperCase())} className="bg-muted/50 border-border mt-1" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? "Deleting..." : `Delete ${selectedUserIds.size} Member(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReferralTreeContent;
