import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Megaphone, Palette } from "lucide-react";

interface AnnouncementData {
  text?: string;
  bg_color?: string;
  text_color?: string;
  is_active?: boolean;
  link_url?: string;
  starts_at?: string;
  ends_at?: string;
}

export default function MerchantAnnouncement({ storeId }: { storeId: string }) {
  const [data, setData] = useState<AnnouncementData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("marketplace_stores")
      .select("announcement")
      .eq("id", storeId)
      .single()
      .then(({ data: row }) => {
        if (row?.announcement && typeof row.announcement === "object") {
          setData(row.announcement as unknown as AnnouncementData);
        }
        setLoading(false);
      });
  }, [storeId]);

  const update = (key: keyof AnnouncementData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("marketplace_stores")
      .update({ announcement: data as any })
      .eq("id", storeId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement saved" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-secondary" />
        <h3 className="text-sm font-semibold text-white">Store Announcement Bar</h3>
      </div>
      <p className="text-xs text-white/40">Show a top banner on your storefront (e.g. "Free shipping over RM50!")</p>

      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-white/70 text-xs">Enable Announcement</Label>
            <Switch
              checked={data.is_active || false}
              onCheckedChange={v => update("is_active", v)}
            />
          </div>

          <div>
            <Label className="text-white/70 text-xs">Announcement Text</Label>
            <Input
              placeholder="🎉 Free shipping on orders over RM50!"
              value={data.text || ""}
              onChange={e => update("text", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <Label className="text-white/70 text-xs">Link URL (optional)</Label>
            <Input
              placeholder="/store/your-store/page/sale"
              value={data.link_url || ""}
              onChange={e => update("link_url", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Background</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={data.bg_color || "#FFC800"}
                  onChange={e => update("bg_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <Input
                  value={data.bg_color || "#FFC800"}
                  onChange={e => update("bg_color", e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Text Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={data.text_color || "#1A1A2E"}
                  onChange={e => update("text_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <Input
                  value={data.text_color || "#1A1A2E"}
                  onChange={e => update("text_color", e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs">Start Date (optional)</Label>
              <Input
                type="datetime-local"
                value={data.starts_at || ""}
                onChange={e => update("starts_at", e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-white text-xs"
              />
            </div>
            <div>
              <Label className="text-white/70 text-xs">End Date (optional)</Label>
              <Input
                type="datetime-local"
                value={data.ends_at || ""}
                onChange={e => update("ends_at", e.target.value)}
                className="mt-1 bg-white/5 border-white/10 text-white text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {data.text && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <p className="text-xs text-white/50 mb-2 font-medium">Preview</p>
            <div
              className="rounded-lg px-4 py-2.5 text-center text-sm font-medium"
              style={{
                backgroundColor: data.bg_color || "#FFC800",
                color: data.text_color || "#1A1A2E",
              }}
            >
              {data.text}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} disabled={saving} className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Announcement
      </Button>
    </div>
  );
}
