import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Plus, Trash2, Save, Loader2, GripVertical, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { storeId: string; }

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  items: { id: string; product_id: string; product_name: string }[];
}

const MerchantCollections = ({ storeId }: Props) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", image_url: "", is_active: true, selectedProducts: new Set<string>() });
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: cols }, { data: items }, { data: prods }] = await Promise.all([
      supabase.from("marketplace_collections").select("*").eq("store_id", storeId).order("sort_order"),
      supabase.from("marketplace_collection_items").select("id, collection_id, product_id").order("sort_order"),
      supabase.from("marketplace_products").select("id, name").eq("store_id", storeId).eq("status", "active").order("name"),
    ]);
    setProducts(prods || []);

    const prodMap = new Map((prods || []).map((p: any) => [p.id, p.name]));
    const itemsByCol = new Map<string, any[]>();
    (items || []).forEach((i: any) => {
      if (!itemsByCol.has(i.collection_id)) itemsByCol.set(i.collection_id, []);
      itemsByCol.get(i.collection_id)!.push({ ...i, product_name: prodMap.get(i.product_id) || "Unknown" });
    });

    setCollections((cols || []).map((c: any) => ({ ...c, items: itemsByCol.get(c.id) || [] })));
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ name: "", description: "", image_url: "", is_active: true, selectedProducts: new Set() });
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (col: Collection) => {
    setForm({
      name: col.name,
      description: col.description || "",
      image_url: col.image_url || "",
      is_active: col.is_active,
      selectedProducts: new Set(col.items.map(i => i.product_id)),
    });
    setEditing(col);
    setShowCreate(true);
  };

  const saveCollection = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    let colId: string;

    if (editing) {
      await supabase.from("marketplace_collections").update({
        name: form.name, description: form.description || null,
        image_url: form.image_url || null, is_active: form.is_active,
      }).eq("id", editing.id);
      colId = editing.id;

      // Remove old items
      await supabase.from("marketplace_collection_items").delete().eq("collection_id", colId);
    } else {
      const { data } = await supabase.from("marketplace_collections").insert({
        store_id: storeId, name: form.name, description: form.description || null,
        image_url: form.image_url || null, is_active: form.is_active,
      }).select("id").single();
      colId = data!.id;
    }

    // Insert items
    if (form.selectedProducts.size > 0) {
      const rows = Array.from(form.selectedProducts).map((pid, i) => ({
        collection_id: colId, product_id: pid, sort_order: i,
      }));
      await supabase.from("marketplace_collection_items").insert(rows);
    }

    setSaving(false);
    setShowCreate(false);
    toast({ title: editing ? "Collection updated" : "Collection created" });
    loadData();
  };

  const deleteCollection = async (id: string) => {
    await supabase.from("marketplace_collections").delete().eq("id", id);
    toast({ title: "Collection deleted" });
    loadData();
  };

  const toggleProduct = (pid: string) => {
    const newSet = new Set(form.selectedProducts);
    if (newSet.has(pid)) newSet.delete(pid); else newSet.add(pid);
    setForm(f => ({ ...f, selectedProducts: newSet }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} className="h-7 text-[10px] bg-secondary text-primary hover:bg-secondary/90">
          <Plus className="h-3 w-3 mr-1" /> New Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-white/30">
          <Layers className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No collections yet</p>
          <p className="text-[10px] mt-1">Create themed product groups like "Summer Essentials"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map(col => (
            <Card key={col.id} className="border-white/10 bg-white/5">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{col.name}</p>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${col.is_active ? "border-green-500/30 text-green-400" : "border-white/10 text-white/30"}`}>
                        {col.is_active ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    {col.description && <p className="text-[10px] text-white/40 mt-0.5 truncate">{col.description}</p>}
                    <p className="text-[10px] text-white/30 mt-1">{col.items.length} product{col.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(col)} className="h-7 text-[10px] text-white/40 hover:text-white">Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCollection(col.id)} className="h-7 text-[10px] text-red-400 hover:text-red-300">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm bg-primary border-white/10 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Collection" : "New Collection"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 mb-1">Name *</p>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Summer Essentials" className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Description</p>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What's this collection about?" rows={2}
                className="text-xs border-white/10 bg-white/5 text-white resize-none" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Cover Image URL</p>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..." className="h-8 text-xs border-white/10 bg-white/5 text-white" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white">Active</p>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-2">Products ({form.selectedProducts.size} selected)</p>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-white/5 rounded-lg p-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <Checkbox checked={form.selectedProducts.has(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                    <span className="text-xs text-white truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={saveCollection} disabled={saving || !form.name.trim()}
              className="w-full h-8 text-xs bg-secondary text-primary hover:bg-secondary/90">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              {editing ? "Update" : "Create"} Collection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantCollections;
