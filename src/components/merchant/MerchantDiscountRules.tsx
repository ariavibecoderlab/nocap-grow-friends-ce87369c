import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Percent, Plus, Trash2, Pencil, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscountRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: any;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
}

const RULE_TYPES = [
  { value: "quantity_discount", label: "Quantity Discount", desc: "e.g. Buy 3+ get 10% off" },
  { value: "spend_threshold", label: "Spend Threshold", desc: "e.g. Spend RM100 get RM10 off" },
  { value: "free_shipping", label: "Free Shipping", desc: "e.g. Spend RM50+ for free shipping" },
  { value: "buy_x_get_y", label: "Buy X Get Y", desc: "e.g. Buy 2 get 1 free" },
];

const MerchantDiscountRules = ({ storeId }: Props) => {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    rule_type: "quantity_discount",
    discount_type: "percentage",
    discount_value: "",
    min_quantity: "",
    min_spend: "",
    free_qty: "",
    priority: "0",
    starts_at: "",
    ends_at: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, [storeId]);

  const loadRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_discount_rules")
      .select("*")
      .eq("store_id", storeId)
      .order("priority", { ascending: false });
    setRules((data as DiscountRule[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", rule_type: "quantity_discount", discount_type: "percentage", discount_value: "", min_quantity: "", min_spend: "", free_qty: "", priority: "0", starts_at: "", ends_at: "" });
    setShowForm(true);
  };

  const openEdit = (rule: DiscountRule) => {
    setEditing(rule);
    const cond = rule.conditions || {};
    setForm({
      name: rule.name,
      rule_type: rule.rule_type,
      discount_type: rule.discount_type,
      discount_value: String(rule.discount_value),
      min_quantity: String(cond.min_quantity || ""),
      min_spend: String(cond.min_spend || ""),
      free_qty: String(cond.free_qty || ""),
      priority: String(rule.priority),
      starts_at: rule.starts_at?.slice(0, 16) || "",
      ends_at: rule.ends_at?.slice(0, 16) || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const conditions: any = {};
    if (form.min_quantity) conditions.min_quantity = parseInt(form.min_quantity);
    if (form.min_spend) conditions.min_spend = parseFloat(form.min_spend);
    if (form.free_qty) conditions.free_qty = parseInt(form.free_qty);

    const payload = {
      store_id: storeId,
      name: form.name.trim(),
      rule_type: form.rule_type,
      conditions,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      priority: parseInt(form.priority) || 0,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    if (editing) {
      await supabase.from("marketplace_discount_rules").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("marketplace_discount_rules").insert(payload);
    }

    toast({ title: editing ? "Rule updated" : "Rule created" });
    setShowForm(false);
    setSaving(false);
    loadRules();
  };

  const toggleActive = async (rule: DiscountRule) => {
    await supabase.from("marketplace_discount_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    loadRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("marketplace_discount_rules").delete().eq("id", id);
    toast({ title: "Rule deleted" });
    loadRules();
  };

  const ruleLabel = (rule: DiscountRule) => {
    const cond = rule.conditions || {};
    const val = rule.discount_type === "percentage" ? `${rule.discount_value}%` : `RM ${rule.discount_value}`;

    switch (rule.rule_type) {
      case "quantity_discount":
        return `Buy ${cond.min_quantity || "?"}+ → ${val} off`;
      case "spend_threshold":
        return `Spend RM ${cond.min_spend || "?"} → ${val} off`;
      case "free_shipping":
        return `Spend RM ${cond.min_spend || "?"} → Free Shipping`;
      case "buy_x_get_y":
        return `Buy ${cond.min_quantity || "?"} → Get ${cond.free_qty || 1} free`;
      default:
        return rule.name;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Discount Rules</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5 bg-secondary text-primary hover:bg-secondary/90 h-8 text-xs">
          <Plus className="h-3 w-3" /> New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <Zap className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No discount rules yet</p>
          <p className="text-xs mt-1">Create auto-apply discount rules</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <Card key={rule.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Percent className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <p className="text-sm font-medium text-white truncate">{rule.name}</p>
                    </div>
                    <p className="text-[11px] text-secondary/80 mt-0.5">{ruleLabel(rule)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">
                        Priority: {rule.priority}
                      </span>
                      {rule.starts_at && (
                        <span className="text-[9px] text-white/30">
                          {new Date(rule.starts_at).toLocaleDateString()} - {rule.ends_at ? new Date(rule.ends_at).toLocaleDateString() : "∞"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(rule)} className="h-7 w-7 text-white/40 hover:text-white">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteRule(rule.id)} className="h-7 w-7 text-destructive/60 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Rule" : "Create Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/60 text-xs">Rule Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="e.g. Buy 3 Get 10% Off" />
            </div>

            <div>
              <Label className="text-white/60 text-xs">Rule Type</Label>
              <Select value={form.rule_type} onValueChange={v => setForm(f => ({ ...f, rule_type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>
                      <span className="text-xs">{rt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-white/30 mt-1">
                {RULE_TYPES.find(rt => rt.value === form.rule_type)?.desc}
              </p>
            </div>

            {(form.rule_type === "quantity_discount" || form.rule_type === "buy_x_get_y") && (
              <div>
                <Label className="text-white/60 text-xs">Minimum Quantity</Label>
                <Input type="number" min={1} value={form.min_quantity}
                  onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" placeholder="e.g. 3" />
              </div>
            )}

            {(form.rule_type === "spend_threshold" || form.rule_type === "free_shipping") && (
              <div>
                <Label className="text-white/60 text-xs">Minimum Spend (RM)</Label>
                <Input type="number" step="0.01" value={form.min_spend}
                  onChange={e => setForm(f => ({ ...f, min_spend: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" placeholder="e.g. 100" />
              </div>
            )}

            {form.rule_type === "buy_x_get_y" && (
              <div>
                <Label className="text-white/60 text-xs">Free Quantity</Label>
                <Input type="number" min={1} value={form.free_qty}
                  onChange={e => setForm(f => ({ ...f, free_qty: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white" placeholder="e.g. 1" />
              </div>
            )}

            {form.rule_type !== "free_shipping" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-white/60 text-xs">Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (RM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Value</Label>
                  <Input type="number" step="0.01" value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" placeholder="e.g. 10" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-white/60 text-xs">Starts At (optional)</Label>
                <Input type="datetime-local" value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-[10px]" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Ends At (optional)</Label>
                <Input type="datetime-local" value={form.ends_at}
                  onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-[10px]" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Priority (higher = checked first)</Label>
              <Input type="number" value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="bg-white/5 border-white/10 text-white" placeholder="0" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-secondary text-primary hover:bg-secondary/90">
              {saving ? "Saving..." : editing ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDiscountRules;
