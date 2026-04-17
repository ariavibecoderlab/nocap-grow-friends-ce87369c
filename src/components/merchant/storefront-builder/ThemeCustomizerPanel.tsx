import { useState } from "react";
import { BuilderTheme } from "@/hooks/useBuilderState";
import { THEME_TEMPLATES } from "@/lib/storeThemes";
import { FONT_PAIRS, getFontPair } from "@/lib/fontPairs";
import { extractDominantColor } from "@/lib/colorExtractor";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Wand2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  storeId: string;
  theme: BuilderTheme;
  onChange: (next: BuilderTheme | ((t: BuilderTheme) => BuilderTheme)) => void;
}

const PRESET_SWATCHES = ["#FFC800", "#F5A623", "#FF3B30", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FF9800", "#795548", "#607D8B", "#000000"];

const BUTTON_STYLES: { v: "rounded" | "pill" | "square" | "soft"; l: string }[] = [
  { v: "square", l: "Square" },
  { v: "soft", l: "Soft" },
  { v: "rounded", l: "Rounded" },
  { v: "pill", l: "Pill" },
];

export default function ThemeCustomizerPanel({ storeId, theme, onChange }: Props) {
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const radiusRem = parseFloat(theme.overrides.border_radius || "0.75");
  const currentPair = getFontPair(theme.overrides.heading_font);
  const currentColor = theme.overrides.primary_color || "";

  const setOverride = (patch: Partial<typeof theme.overrides>) => {
    onChange((t) => ({ ...t, overrides: { ...t.overrides, ...patch } }));
  };

  const matchMyLogo = async () => {
    setExtracting(true);
    try {
      const { data } = await supabase
        .from("marketplace_stores")
        .select("logo_url, banner_url")
        .eq("id", storeId)
        .maybeSingle();
      const url = data?.logo_url || data?.banner_url;
      if (!url) {
        toast({ title: "No logo found", description: "Upload a store logo first.", variant: "destructive" });
        return;
      }
      const color = await extractDominantColor(url);
      if (!color) {
        toast({ title: "Couldn't extract a color", description: "Try a logo with more contrast.", variant: "destructive" });
        return;
      }
      setOverride({ primary_color: color });
      toast({ title: "Color matched!", description: `Set to ${color}` });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      {/* Preset themes */}
      <section>
        <Label className="text-[10px] text-white/60 uppercase tracking-wide">Theme Preset</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {THEME_TEMPLATES.map((t) => {
            const active = theme.themeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange((cur) => ({ ...cur, themeId: t.id }))}
                className={`relative p-2 rounded-lg border text-left transition-all ${active ? "border-secondary ring-1 ring-secondary/50" : "border-white/10 hover:border-white/20"}`}
                style={{ background: t.preview.bg }}
              >
                {active && <Check className="absolute top-1 right-1 h-3 w-3 text-secondary" />}
                <div className="flex items-center gap-1 mb-1">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.preview.accent }} />
                  <span className="h-3 w-3 rounded-full" style={{ background: t.preview.card }} />
                </div>
                <p className="text-[10px] font-semibold" style={{ color: t.preview.text }}>{t.name}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Primary color */}
      <section>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-white/60 uppercase tracking-wide">Primary Color</Label>
          <Button size="sm" variant="ghost" onClick={matchMyLogo} disabled={extracting} className="h-6 text-[10px] px-2 text-secondary hover:text-secondary hover:bg-white/5">
            {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Wand2 className="h-3 w-3 mr-1" /> Match logo</>}
          </Button>
        </div>
        <div className="flex gap-2 mt-2 items-center">
          <input
            type="color"
            value={currentColor || "#FFC800"}
            onChange={(e) => setOverride({ primary_color: e.target.value.toUpperCase() })}
            className="h-8 w-10 rounded cursor-pointer bg-transparent border border-white/10"
          />
          <Input
            value={currentColor}
            onChange={(e) => setOverride({ primary_color: e.target.value })}
            placeholder="Theme default"
            className="bg-white/5 border-white/10 text-white h-8 text-xs flex-1"
          />
          {currentColor && (
            <button
              onClick={() => setOverride({ primary_color: undefined })}
              className="text-[10px] text-white/40 hover:text-white px-1"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-9 gap-1 mt-2">
          {PRESET_SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setOverride({ primary_color: c })}
              className={`h-5 w-full rounded ring-offset-1 ring-offset-primary transition-all ${currentColor === c ? "ring-2 ring-white" : "hover:ring-1 hover:ring-white/40"}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </section>

      {/* Font pair */}
      <section>
        <Label className="text-[10px] text-white/60 uppercase tracking-wide">Typography</Label>
        <div className="space-y-1.5 mt-2">
          {FONT_PAIRS.map((p) => {
            const active = currentPair.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setOverride({ heading_font: p.heading, body_font: p.body })}
                className={`w-full p-2 rounded-lg border text-left transition-all ${active ? "border-secondary bg-secondary/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-white" style={{ fontFamily: p.heading }}>{p.name}</span>
                  <span className="text-[9px] text-white/40">{p.vibe}</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5" style={{ fontFamily: p.body }}>The quick brown fox jumps over the lazy dog</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Border radius */}
      <section>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-white/60 uppercase tracking-wide">Corner Radius</Label>
          <span className="text-[10px] text-white/50">{radiusRem.toFixed(2)}rem</span>
        </div>
        <Slider
          value={[radiusRem]}
          min={0}
          max={2}
          step={0.05}
          onValueChange={([v]) => setOverride({ border_radius: `${v}rem` })}
          className="mt-2"
        />
        <div className="flex justify-between text-[9px] text-white/30 mt-1">
          <span>Sharp</span><span>Soft</span><span>Round</span>
        </div>
      </section>

      {/* Button style */}
      <section>
        <Label className="text-[10px] text-white/60 uppercase tracking-wide">Button Style</Label>
        <div className="grid grid-cols-4 gap-1 mt-2">
          {BUTTON_STYLES.map((b) => {
            const active = (theme.overrides.button_style || "rounded") === b.v;
            const radius = b.v === "pill" ? "9999px" : b.v === "square" ? "0" : b.v === "soft" ? "0.375rem" : "0.5rem";
            return (
              <button
                key={b.v}
                onClick={() => setOverride({ button_style: b.v })}
                className={`p-2 border text-[10px] transition-all ${active ? "border-secondary bg-secondary/10 text-white" : "border-white/10 text-white/60 hover:border-white/20"}`}
                style={{ borderRadius: radius }}
              >
                {b.l}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reset all overrides */}
      {(theme.overrides.primary_color || theme.overrides.heading_font || theme.overrides.border_radius || theme.overrides.button_style) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange((t) => ({ ...t, overrides: {} }))}
          className="w-full text-[10px] text-white/50 hover:text-white hover:bg-white/5"
        >
          Reset all customizations
        </Button>
      )}
    </div>
  );
}
