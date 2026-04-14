import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, Loader2, CheckCircle2, Clock, AlertTriangle, Copy, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DomainRow {
  id: string;
  store_id: string;
  domain: string;
  verification_status: string;
  verification_token: string;
  verified_at: string | null;
  is_primary: boolean;
  ssl_status: string;
  created_at: string;
}

export default function MerchantDomainManager({ storeId }: { storeId: string }) {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDomains = async () => {
    const { data } = await supabase
      .from("marketplace_store_domains")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at");
    setDomains((data as unknown as DomainRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDomains(); }, [storeId]);

  const addDomain = async () => {
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleaned || !cleaned.includes(".")) {
      toast({ title: "Invalid domain", description: "Enter a valid domain like shop.example.com", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("marketplace_store_domains").insert({
      store_id: storeId,
      domain: cleaned,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "This domain is already registered" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Domain added", description: "Add the DNS records below to verify ownership" });
      setNewDomain("");
      setShowAdd(false);
      fetchDomains();
    }
    setAdding(false);
  };

  const deleteDomain = async (id: string) => {
    setDeleting(id);
    await supabase.from("marketplace_store_domains").delete().eq("id", id);
    setDomains(prev => prev.filter(d => d.id !== id));
    toast({ title: "Domain removed" });
    setDeleting(null);
  };

  const setPrimary = async (id: string) => {
    // Unset all, then set one
    await supabase.from("marketplace_store_domains").update({ is_primary: false } as any).eq("store_id", storeId);
    await supabase.from("marketplace_store_domains").update({ is_primary: true } as any).eq("id", id);
    fetchDomains();
    toast({ title: "Primary domain updated" });
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: "Copied to clipboard" });
  };

  const statusIcon = (status: string) => {
    if (status === "verified") return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (status === "failed") return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <Clock className="h-4 w-4 text-amber-400" />;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-secondary" />
          <h3 className="text-sm font-semibold text-white">Custom Domains</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add Domain
        </Button>
      </div>

      {domains.length === 0 ? (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-8 text-white/40">
            <Globe className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No custom domains</p>
            <p className="text-xs mt-1">Add a domain to create a standalone storefront</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map(d => (
            <Card key={d.id} className="border-white/10 bg-white/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(d.verification_status)}
                    <span className="text-sm font-medium text-white truncate">{d.domain}</span>
                    {d.is_primary && (
                      <span className="shrink-0 text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full font-semibold">Primary</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {d.verification_status === "verified" && !d.is_primary && (
                      <Button size="sm" variant="ghost" className="text-white/50 hover:text-white text-[10px] h-7" onClick={() => setPrimary(d.id)}>
                        Set Primary
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0" onClick={() => deleteDomain(d.id)} disabled={deleting === d.id}>
                      {deleting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {d.verification_status === "pending" && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
                    <p className="text-[11px] text-amber-300 font-medium">DNS Verification Required</p>
                    <p className="text-[10px] text-white/50">Add a TXT record to your domain's DNS settings:</p>
                    <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                      <div className="text-[10px] text-white/70 font-mono flex-1 break-all">
                        <span className="text-white/40">Name:</span> _nocap-verify<br />
                        <span className="text-white/40">Value:</span> {d.verification_token}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/50 hover:text-white shrink-0" onClick={() => copyToken(d.verification_token)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/30">Also add a CNAME record pointing to nocap.life</p>
                  </div>
                )}

                {d.verification_status === "verified" && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Shield className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-green-400">SSL: {d.ssl_status === "active" ? "Active" : "Provisioning..."}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-primary border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white font-display">Add Custom Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70 text-xs">Domain</Label>
              <Input
                placeholder="shop.example.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-[10px] text-white/40 mt-1">Enter your domain without http:// or trailing slash</p>
            </div>
            <Button onClick={addDomain} disabled={adding || !newDomain.trim()} className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Domain
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
