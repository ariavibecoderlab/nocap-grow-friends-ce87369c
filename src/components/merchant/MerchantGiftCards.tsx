import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Plus, Copy, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

interface GiftCard {
  id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  buyer_user_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  message: string | null;
  status: string;
  purchased_at: string;
  expires_at: string | null;
}

const MerchantGiftCards = ({ storeId }: Props) => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ balance: "", recipient_name: "", recipient_email: "", message: "", expires_days: "" });
  const { toast } = useToast();

  useEffect(() => { loadCards(); }, [storeId, filter]);

  const loadCards = async () => {
    setLoading(true);
    let query = supabase.from("marketplace_gift_cards").select("*")
      .eq("store_id", storeId).order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query;
    setCards((data as GiftCard[]) || []);
    setLoading(false);
  };

  const createCard = async () => {
    const balance = parseFloat(form.balance);
    if (!balance || balance <= 0) return;
    setSaving(true);

    const expiresAt = form.expires_days
      ? new Date(Date.now() + parseInt(form.expires_days) * 86400000).toISOString()
      : null;

    const { error } = await supabase.from("marketplace_gift_cards").insert({
      store_id: storeId,
      initial_balance: balance,
      current_balance: balance,
      recipient_name: form.recipient_name || null,
      recipient_email: form.recipient_email || null,
      message: form.message || null,
      expires_at: expiresAt,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Gift card created!" });
      setShowCreate(false);
      setForm({ balance: "", recipient_name: "", recipient_email: "", message: "", expires_days: "" });
      loadCards();
    }
    setSaving(false);
  };

  const deactivateCard = async (id: string) => {
    await supabase.from("marketplace_gift_cards").update({ status: "deactivated" }).eq("id", id);
    toast({ title: "Card deactivated" });
    loadCards();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!" });
  };

  const stats = {
    total: cards.length,
    active: cards.filter(c => c.status === "active").length,
    totalValue: cards.filter(c => c.status === "active").reduce((s, c) => s + c.current_balance, 0),
    redeemed: cards.filter(c => c.status === "redeemed").length,
  };

  const statusColor = (s: string) => {
    if (s === "active") return "border-green-500/30 text-green-400";
    if (s === "redeemed") return "border-blue-500/30 text-blue-400";
    return "border-white/10 text-white/30";
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Active", value: stats.active, color: "text-green-400" },
          { label: "Outstanding", value: `RM ${stats.totalValue.toFixed(2)}`, color: "text-secondary" },
          { label: "Redeemed", value: stats.redeemed, color: "text-blue-400" },
        ].map(s => (
          <Card key={s.label} className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-white/40">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {["all", "active", "redeemed", "deactivated"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} onClick={() => setFilter(f)}
            className="text-[10px] h-7 capitalize">{f}</Button>
        ))}
        <Button size="sm" onClick={() => setShowCreate(true)} className="ml-auto h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
          <Plus className="h-3 w-3 mr-1" /> Create
        </Button>
      </div>

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <Gift className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No gift cards</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => (
            <Card key={card.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-secondary">{card.code}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyCode(card.code)} className="h-5 w-5 p-0 text-white/30 hover:text-white">
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${statusColor(card.status)}`}>{card.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-secondary font-semibold">RM {card.current_balance.toFixed(2)}</span>
                      {card.current_balance < card.initial_balance && (
                        <span className="text-[10px] text-white/30">of RM {card.initial_balance.toFixed(2)}</span>
                      )}
                    </div>
                    {card.recipient_name && <p className="text-[10px] text-white/30 mt-0.5">To: {card.recipient_name}</p>}
                  </div>
                  {card.status === "active" && (
                    <Button size="sm" variant="ghost" onClick={() => deactivateCard(card.id)}
                      className="h-7 text-[10px] text-red-400 hover:text-red-300">Deactivate</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader><DialogTitle className="text-white">Create Gift Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 mb-1">Value (RM) *</p>
              <Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="50.00" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Recipient Name</p>
              <Input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                placeholder="Optional" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Recipient Email</p>
              <Input value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
                placeholder="Optional" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Personal Message</p>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Happy Birthday!" rows={2} className="text-xs border-white/10 bg-white/5 text-white resize-none" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Expires in (days, blank = no expiry)</p>
              <Input type="number" value={form.expires_days} onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                placeholder="365" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <Button onClick={createCard} disabled={saving || !form.balance}
              className="w-full h-8 text-xs bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Gift className="h-3 w-3 mr-1" />}
              Create Gift Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantGiftCards;
