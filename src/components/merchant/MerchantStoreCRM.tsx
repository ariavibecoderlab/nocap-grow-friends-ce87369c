import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, RefreshCw, Download, Tag, Mail, Phone, ShoppingBag, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  buyer_user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
}

const MerchantStoreCRM = ({ storeId }: Props) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, [storeId]);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_store_customers")
      .select("*")
      .eq("store_id", storeId)
      .order("total_spent", { ascending: false })
      .limit(200);
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  };

  // Sync customers from order history
  const syncCustomers = async () => {
    setSyncing(true);
    const { data: orders } = await supabase
      .from("marketplace_orders")
      .select("buyer_user_id, buyer_name, buyer_email, buyer_phone, total_amount, created_at")
      .eq("store_id", storeId)
      .in("status", ["confirmed", "shipped", "delivered"]);

    if (!orders || orders.length === 0) {
      toast({ title: "No orders to sync" });
      setSyncing(false);
      return;
    }

    // Aggregate by email
    const customerMap = new Map<string, {
      buyer_user_id: string | null;
      buyer_name: string;
      buyer_email: string;
      buyer_phone: string | null;
      total_orders: number;
      total_spent: number;
      last_order_at: string;
    }>();

    for (const order of orders) {
      const key = order.buyer_email.toLowerCase();
      const existing = customerMap.get(key);
      if (existing) {
        existing.total_orders += 1;
        existing.total_spent += order.total_amount;
        if (order.created_at > existing.last_order_at) {
          existing.last_order_at = order.created_at;
          existing.buyer_name = order.buyer_name;
        }
      } else {
        customerMap.set(key, {
          buyer_user_id: order.buyer_user_id,
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          buyer_phone: order.buyer_phone,
          total_orders: 1,
          total_spent: order.total_amount,
          last_order_at: order.created_at,
        });
      }
    }

    // Upsert each customer
    let synced = 0;
    for (const [, cust] of customerMap) {
      const { error } = await supabase
        .from("marketplace_store_customers")
        .upsert(
          {
            store_id: storeId,
            buyer_user_id: cust.buyer_user_id,
            buyer_name: cust.buyer_name,
            buyer_email: cust.buyer_email,
            buyer_phone: cust.buyer_phone,
            total_orders: cust.total_orders,
            total_spent: cust.total_spent,
            last_order_at: cust.last_order_at,
          },
          { onConflict: "store_id,buyer_email" }
        );
      if (!error) synced++;
    }

    toast({ title: `Synced ${synced} customers from orders` });
    setSyncing(false);
    loadCustomers();
  };

  const saveCustomerEdit = async () => {
    if (!editCustomer) return;
    const tags = editTags.split(",").map(t => t.trim()).filter(Boolean);
    await supabase
      .from("marketplace_store_customers")
      .update({ tags, notes: editNotes.trim() || null })
      .eq("id", editCustomer.id);
    toast({ title: "Customer updated" });
    setEditCustomer(null);
    loadCustomers();
  };

  const allTags = Array.from(new Set(customers.flatMap(c => c.tags || [])));

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.buyer_email.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || (c.tags || []).includes(tagFilter);
    return matchSearch && matchTag;
  });

  const stats = {
    total: customers.length,
    totalRevenue: customers.reduce((s, c) => s + c.total_spent, 0),
    avgOrderValue: customers.length > 0
      ? customers.reduce((s, c) => s + c.total_spent, 0) / customers.reduce((s, c) => s + c.total_orders, 0)
      : 0,
    repeatRate: customers.length > 0
      ? Math.round((customers.filter(c => c.total_orders > 1).length / customers.length) * 100)
      : 0,
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
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Customers", value: stats.total, fmt: String(stats.total) },
          { label: "Total Revenue", value: stats.totalRevenue, fmt: `RM ${stats.totalRevenue.toFixed(2)}` },
          { label: "Avg Order", value: stats.avgOrderValue, fmt: `RM ${stats.avgOrderValue.toFixed(2)}` },
          { label: "Repeat Rate", value: stats.repeatRate, fmt: `${stats.repeatRate}%` },
        ].map(s => (
          <Card key={s.label} className="border-white/10 bg-white/5">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-white/40">{s.label}</p>
              <p className="text-lg font-bold text-secondary">{s.fmt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="h-8 text-xs bg-white/5 border border-white/10 rounded-md text-white px-2">
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <Button size="sm" variant="outline" onClick={syncCustomers} disabled={syncing}
          className="h-8 text-xs border-white/10 text-white/60 hover:bg-white/10 gap-1">
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} /> Sync Orders
        </Button>
      </div>

      {/* Customer List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No customers yet</p>
          <p className="text-xs mt-1">Click "Sync Orders" to import from order history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <Card key={customer.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{customer.buyer_name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/40">
                      <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> {customer.buyer_email}</span>
                      {customer.buyer_phone && (
                        <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> {customer.buyer_phone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-secondary font-semibold flex items-center gap-0.5">
                        <ShoppingBag className="h-3 w-3" /> {customer.total_orders} orders
                      </span>
                      <span className="text-xs text-white/50">RM {customer.total_spent.toFixed(2)}</span>
                      {customer.last_order_at && (
                        <span className="text-[9px] text-white/30">
                          Last: {new Date(customer.last_order_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {(customer.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {customer.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[8px] px-1.5 py-0 border-secondary/30 text-secondary/80">
                            <Tag className="h-2 w-2 mr-0.5" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white shrink-0"
                    onClick={() => {
                      setEditCustomer(customer);
                      setEditTags((customer.tags || []).join(", "));
                      setEditNotes(customer.notes || "");
                    }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-sm bg-primary border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{editCustomer?.buyer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/60 text-xs">Tags (comma-separated)</Label>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)}
                className="bg-white/5 border-white/10 text-white" placeholder="e.g. VIP, Wholesale, Repeat" />
            </div>
            <div>
              <Label className="text-white/60 text-xs">Notes</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white min-h-[80px]" placeholder="Internal notes about this customer..." />
            </div>
            <Button onClick={saveCustomerEdit} className="w-full bg-secondary text-primary hover:bg-secondary/90">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantStoreCRM;
