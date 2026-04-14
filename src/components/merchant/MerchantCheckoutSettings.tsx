import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, Palette } from "lucide-react";

interface CheckoutSettings {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  thank_you_title?: string;
  thank_you_message?: string;
  footer_text?: string;
}

export default function MerchantCheckoutSettings({ storeId }: { storeId: string }) {
  const [settings, setSettings] = useState<CheckoutSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("marketplace_stores")
      .select("checkout_settings")
      .eq("id", storeId)
      .single()
      .then(({ data }) => {
        if (data?.checkout_settings && typeof data.checkout_settings === "object") {
          setSettings(data.checkout_settings as unknown as CheckoutSettings);
        }
        setLoading(false);
      });
  }, [storeId]);

  const update = (key: keyof CheckoutSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("marketplace_stores")
      .update({ checkout_settings: settings as any })
      .eq("id", storeId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Checkout settings saved" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-secondary" />
        <h3 className="text-sm font-semibold text-white">Checkout Customization</h3>
      </div>
      <p className="text-xs text-white/40">Customize the checkout experience for your store. Checkout still uses NoCap wallet but can be branded to your store.</p>

      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-white/70 text-xs">Checkout Logo URL</Label>
            <Input
              placeholder="https://example.com/logo.png"
              value={settings.logo_url || ""}
              onChange={e => update("logo_url", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <p className="text-[10px] text-white/30 mt-1">Displayed at the top of checkout page</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Primary Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={settings.primary_color || "#FFC800"}
                  onChange={e => update("primary_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <Input
                  value={settings.primary_color || "#FFC800"}
                  onChange={e => update("primary_color", e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={settings.accent_color || "#1A1A2E"}
                  onChange={e => update("accent_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 cursor-pointer bg-transparent"
                />
                <Input
                  value={settings.accent_color || "#1A1A2E"}
                  onChange={e => update("accent_color", e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-white/70 text-xs">Thank You Title</Label>
            <Input
              placeholder="Thank you for your order!"
              value={settings.thank_you_title || ""}
              onChange={e => update("thank_you_title", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <Label className="text-white/70 text-xs">Thank You Message</Label>
            <Textarea
              placeholder="We'll process your order shortly..."
              value={settings.thank_you_message || ""}
              onChange={e => update("thank_you_message", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
            />
          </div>

          <div>
            <Label className="text-white/70 text-xs">Checkout Footer Text</Label>
            <Input
              placeholder="© 2026 Your Store Name"
              value={settings.footer_text || ""}
              onChange={e => update("footer_text", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4">
          <p className="text-xs text-white/50 mb-3 font-medium">Preview</p>
          <div className="rounded-lg overflow-hidden border border-white/10">
            <div className="p-3 text-center" style={{ backgroundColor: settings.primary_color || "#FFC800" }}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-8 mx-auto object-contain" />
              ) : (
                <span className="text-sm font-bold" style={{ color: settings.accent_color || "#1A1A2E" }}>Your Store</span>
              )}
            </div>
            <div className="p-4 bg-white/5 text-center">
              <p className="text-sm font-semibold text-white">{settings.thank_you_title || "Thank you for your order!"}</p>
              <p className="text-xs text-white/50 mt-1">{settings.thank_you_message || "We'll process your order shortly."}</p>
            </div>
            {settings.footer_text && (
              <div className="p-2 text-center border-t border-white/10">
                <p className="text-[10px] text-white/30">{settings.footer_text}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full bg-secondary text-primary hover:bg-secondary/90 font-semibold">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Checkout Settings
      </Button>
    </div>
  );
}
