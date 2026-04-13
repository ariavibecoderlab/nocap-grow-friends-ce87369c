import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Menu, Link as LinkIcon } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  position: string;
  sort_order: number;
}

export default function MerchantStoreMenus({ storeId }: { storeId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPosition, setNewPosition] = useState("header");
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchMenus(); }, [storeId]);

  const fetchMenus = async () => {
    const { data } = await supabase
      .from("marketplace_store_menus")
      .select("*")
      .eq("store_id", storeId)
      .order("position")
      .order("sort_order");
    setItems((data as unknown as MenuItem[]) || []);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("marketplace_store_menus").insert({
      store_id: storeId,
      label: newLabel.trim(),
      url: newUrl.trim(),
      position: newPosition,
      sort_order: items.filter(i => i.position === newPosition).length,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Menu item added" });
      setNewLabel(""); setNewUrl("");
      await fetchMenus();
    }
    setAdding(false);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("marketplace_store_menus").delete().eq("id", id);
    await fetchMenus();
    toast({ title: "Menu item removed" });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>;

  const headerItems = items.filter(i => i.position === "header");
  const footerItems = items.filter(i => i.position === "footer");

  return (
    <div className="space-y-4">
      <h3 className="font-display text-sm font-semibold text-white">Custom Menus</h3>
      <p className="text-[11px] text-white/40">Add navigation links to your storefront header or footer.</p>

      {/* Add new */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-white/60 text-[10px]">Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="About Us" className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-white/60 text-[10px]">URL</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="/store/my-store/page/about" className="bg-white/5 border-white/10 text-white mt-0.5 h-8 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={newPosition} onValueChange={setNewPosition}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-primary border-white/10 text-white">
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="footer">Footer</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-secondary text-primary text-xs h-8" onClick={addItem} disabled={adding}>
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header items */}
      {headerItems.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Header</p>
          {headerItems.map(item => (
            <Card key={item.id} className="border-white/10 bg-white/5 mb-1.5">
              <CardContent className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Menu className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <span className="text-xs text-white truncate">{item.label}</span>
                  <span className="text-[10px] text-white/30 truncate">{item.url}</span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="p-1 text-red-400/60 hover:text-red-400 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer items */}
      {footerItems.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Footer</p>
          {footerItems.map(item => (
            <Card key={item.id} className="border-white/10 bg-white/5 mb-1.5">
              <CardContent className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon className="h-3.5 w-3.5 text-secondary shrink-0" />
                  <span className="text-xs text-white truncate">{item.label}</span>
                  <span className="text-[10px] text-white/30 truncate">{item.url}</span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="p-1 text-red-400/60 hover:text-red-400 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex flex-col items-center py-6 text-white/40">
            <Menu className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">No custom menu items yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
